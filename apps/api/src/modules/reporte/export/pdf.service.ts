import {
  Injectable,
  OnModuleDestroy,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'node:fs';
import puppeteer, { type Browser } from 'puppeteer-core';

// Generacion de PDF con Chrome sin interfaz grafica.
//
// Decisiones, todas comprobadas y no adivinadas:
//
//  * Se usa puppeteer-core y NO puppeteer: el segundo descarga un Chromium de
//    unos 180 MB en cada instalacion de dependencias. puppeteer-core usa el
//    Chrome que ya existe en la maquina, apuntado por PUPPETEER_EXECUTABLE_PATH.
//    En el VPS ya esta instalado google-chrome-stable en /usr/bin.
//
//  * El navegador NO se mantiene encendido entre descargas. Es la diferencia
//    deliberada con el otro sistema que corre en el mismo servidor: alli se
//    generan reportes todo el dia y conviene tenerlo caliente, aqui se generan
//    unos pocos por dia. El VPS tiene 3,8 GB de memoria compartidos entre cuatro
//    servicios y ya hay otro Chrome de larga vida; sostener un segundo navegador
//    encendido las 24 horas para ahorrar dos segundos de arranque es un mal
//    negocio. Se apaga tras un periodo corto de inactividad.
//
//  * Una pagina por PDF, cerrada SIEMPRE en finally. No cerrarla es la fuga de
//    memoria clasica de Puppeteer.
//
//  * Un solo PDF a la vez. Cada pagina consume memoria no trivial y aqui no hay
//    concurrencia real que justificar; las peticiones que lleguen juntas esperan
//    en fila, con un tiempo maximo para no acumular peticiones colgadas.
//
//  * printBackground en true y print-color-adjust exacto en el CSS: sin ambas
//    cosas Chrome apaga los fondos de color al imprimir y el PDF sale en gris.
//
//  * Se espera a document.fonts.ready antes de imprimir. Si no, Chrome puede
//    imprimir antes de que la tipografia incrustada termine de cargar y el PDF
//    sale con la fuente de reemplazo.
@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);

  private navegador: Browser | null = null;
  // Promesa unica de arranque: si llegan dos peticiones con el navegador
  // apagado, ambas esperan el MISMO arranque en vez de abrir dos Chrome.
  private arrancando: Promise<Browser> | null = null;

  // Se apaga tras este tiempo sin usarse, para no ocupar memoria del VPS.
  // Un minuto y no mas: el arranque en frio cuesta medio segundo, y a cambio se
  // reduce la ventana en la que este Chrome y el del otro sistema del servidor
  // podrian estar encendidos a la vez.
  private readonly msInactividad = 60_000;
  private temporizadorApagado: NodeJS.Timeout | null = null;

  // Memoria libre minima para encender Chrome, en megabytes.
  //
  // Medido en el VPS: un Chrome sin interfaz llega a unos 1.200 MB generando un
  // PDF de cuatrocientas filas, y las banderas de ahorro apenas bajan un diez
  // por ciento. En esa maquina hay 3,8 GB compartidos con otro sistema que
  // tambien genera PDF, asi que dos navegadores a la vez dejarian al servidor
  // sin aire y el nucleo empezaria a matar procesos, posiblemente la base de
  // datos.
  //
  // Con esta guarda, si no hay margen la descarga falla con un mensaje que la
  // persona entiende y el resto del servidor sigue en pie. Es preferible un
  // reporte que no sale a un servidor que se cae.
  private readonly mbMinimosLibres = 1500;

  // Un PDF a la vez; el resto espera en fila.
  private enCurso = false;
  private readonly fila: Array<() => void> = [];
  private readonly msEsperaEnFila = 45_000;

  constructor(private readonly config: ConfigService) {}

  // Permite al servicio saber si puede ofrecer PDF antes de intentarlo, para
  // avisar en el catalogo en vez de fallar en la descarga.
  get disponible(): boolean {
    return !!this.config.get<string>('app.chromePath');
  }

  async render(html: string, opciones: { horizontal?: boolean } = {}): Promise<Buffer> {
    await this.tomarTurno();
    try {
      const navegador = await this.obtenerNavegador();
      const pagina = await navegador.newPage();
      try {
        // El HTML es autocontenido: CSS, tipografia y logo van incrustados, sin
        // ninguna peticion de red. Por eso 'load' basta y no hace falta esperar
        // a que la red quede en silencio.
        await pagina.setContent(html, { waitUntil: 'load', timeout: 30_000 });
        // Sin esto el PDF puede salir con la tipografia de reemplazo.
        await pagina.evaluateHandle('document.fonts.ready');

        const pdf = await pagina.pdf({
          format: 'A4',
          landscape: opciones.horizontal ?? false,
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate: PIE_DE_PAGINA,
          // margenes amplios arriba y abajo para que quepa el pie
          margin: { top: '12mm', right: '11mm', bottom: '16mm', left: '11mm' },
          timeout: 30_000,
        });
        return Buffer.from(pdf);
      } finally {
        await pagina.close().catch(() => undefined);
      }
    } finally {
      this.liberarTurno();
      this.programarApagado();
    }
  }

  private async obtenerNavegador(): Promise<Browser> {
    this.cancelarApagado();
    if (this.navegador) return this.navegador;
    if (this.arrancando) return this.arrancando;

    const ruta = this.config.get<string>('app.chromePath');
    if (!ruta) {
      throw new ServiceUnavailableException(
        'La generación de PDF no está configurada en este servidor. ' +
          'Descarga el reporte en Excel o pide que se configure la ruta de Chrome.',
      );
    }

    this.verificarMemoria();

    this.arrancando = puppeteer
      .launch({
        executablePath: ruta,
        headless: true,
        args: [
          // imprescindible al correr como servicio en Linux sin entorno grafico
          '--no-sandbox',
          // evita que Chrome muera cuando /dev/shm es pequeño, cosa habitual en
          // un VPS
          '--disable-dev-shm-usage',
          // el PDF no necesita GPU y pedirla en un servidor sin ella genera
          // errores de arranque
          '--disable-gpu',
          // Un solo proceso de renderizado: aqui siempre se imprime una pagina
          // a la vez. Medido en el VPS, ahorra poco (alrededor de un diez por
          // ciento), pero no cuesta nada y no cambia el resultado.
          '--renderer-process-limit=1',
          // apagar cosas de navegador de escritorio que aqui no se usan
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-background-networking',
          '--disable-sync',
          '--mute-audio',
          '--no-first-run',
        ],
      })
      .then((navegador) => {
        this.navegador = navegador;
        this.arrancando = null;
        // Si ESTE navegador muere, se suelta la referencia para relanzarlo. Se
        // compara la instancia para no pisar uno ya relanzado ni avisar cuando
        // el cierre fue intencional.
        navegador.on('disconnected', () => {
          if (this.navegador === navegador) {
            this.navegador = null;
            this.logger.warn('El navegador de PDF se desconectó; se relanzará al siguiente reporte.');
          }
        });
        this.logger.log('Navegador de PDF iniciado.');
        return navegador;
      })
      .catch((error: unknown) => {
        this.arrancando = null;
        this.logger.error('No se pudo iniciar el navegador de PDF.', error as Error);
        throw new ServiceUnavailableException(
          'No se pudo iniciar el generador de PDF en el servidor. ' +
            'Descarga el reporte en Excel mientras se revisa.',
        );
      });

    return this.arrancando;
  }

  // Comprueba que quede memoria para encender Chrome.
  //
  // Se lee MemAvailable de /proc/meminfo, que es la cifra que de verdad importa:
  // el "free" a secas no cuenta la memoria de cache que el nucleo puede liberar,
  // y usarla llevaria a rechazar descargas que si cabian.
  //
  // Fuera de Linux no existe /proc, asi que la comprobacion se salta: en un
  // equipo de desarrollo no hay otro sistema al que proteger.
  private verificarMemoria(): void {
    let disponibleMb: number;
    try {
      const meminfo = readFileSync('/proc/meminfo', 'utf8');
      const linea = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(meminfo);
      if (!linea) return;
      disponibleMb = Math.round(Number(linea[1]) / 1024);
    } catch {
      // no es Linux, o no se pudo leer: no se bloquea la generacion
      return;
    }

    if (disponibleMb < this.mbMinimosLibres) {
      this.logger.warn(
        `PDF rechazado por falta de memoria: quedan ${disponibleMb} MB y se exigen ${this.mbMinimosLibres} MB.`,
      );
      throw new ServiceUnavailableException(
        'El servidor no tiene memoria suficiente para generar el PDF en este momento. ' +
          'Descarga el reporte en Excel o vuelve a intentarlo en unos minutos.',
      );
    }
  }

  // Reserva el turno. Si ya hay un PDF en curso, espera en fila; si pasa el
  // tiempo maximo, falla con un mensaje entendible en vez de quedar colgado.
  private tomarTurno(): Promise<void> {
    if (!this.enCurso) {
      this.enCurso = true;
      return Promise.resolve();
    }
    return new Promise<void>((resolver, rechazar) => {
      let temporizador: NodeJS.Timeout;
      const conceder = () => {
        clearTimeout(temporizador);
        this.enCurso = true;
        resolver();
      };
      temporizador = setTimeout(() => {
        const i = this.fila.indexOf(conceder);
        if (i >= 0) this.fila.splice(i, 1);
        rechazar(
          new ServiceUnavailableException(
            'El servidor está generando otro reporte en este momento. Vuelve a intentarlo en unos segundos.',
          ),
        );
      }, this.msEsperaEnFila);
      this.fila.push(conceder);
    });
  }

  private liberarTurno(): void {
    this.enCurso = false;
    const siguiente = this.fila.shift();
    if (siguiente) siguiente();
  }

  // Apaga el navegador tras un rato sin usarse. Solo si no hay nada en curso ni
  // esperando, para no matar un PDF a medio generar.
  private programarApagado(): void {
    this.cancelarApagado();
    this.temporizadorApagado = setTimeout(() => {
      if (this.enCurso || this.fila.length > 0 || !this.navegador) return;
      const anterior = this.navegador;
      this.navegador = null;
      this.logger.log('Navegador de PDF apagado por inactividad.');
      void anterior.close().catch(() => undefined);
    }, this.msInactividad);
    // no mantiene vivo el proceso si el servidor se esta apagando
    this.temporizadorApagado.unref?.();
  }

  private cancelarApagado(): void {
    if (this.temporizadorApagado) {
      clearTimeout(this.temporizadorApagado);
      this.temporizadorApagado = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.cancelarApagado();
    if (this.navegador) {
      // Se suelta la referencia ANTES de cerrar para que el manejador de
      // desconexion no avise de una caida: este cierre es intencional.
      const anterior = this.navegador;
      this.navegador = null;
      await anterior.close().catch(() => undefined);
    }
  }
}

// Pie de pagina nativo de Chrome, repetido en cada hoja.
//
// Tres reglas de Chrome que hay que respetar o el pie no aparece:
//   * el tamaño de letra por omision es 0, hay que fijarlo;
//   * no se cargan hojas de estilo externas, todo va en linea;
//   * las clases pageNumber y totalPages las rellena Chrome solo.
const PIE_DE_PAGINA = `
<div style="width:100%; font-size:8px; color:#64748B; font-family:Arial,sans-serif; padding:0 11mm; display:flex; justify-content:space-between; align-items:center;">
  <span>Empresas SUPERSTAR · Documento generado por el sistema</span>
  <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
</div>`;
