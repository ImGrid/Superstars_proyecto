import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as argon2 from 'argon2';
import { randomBytes, randomInt, createHash, randomUUID } from 'crypto';
import { eq, and, isNull, lt, sql, min } from 'drizzle-orm';
// El paquete no trae .d.ts (main: index.json) — type assertion al cargar
// eslint-disable-next-line @typescript-eslint/no-require-imports
const disposableDomainsList = require('disposable-email-domains') as string[];
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import {
  usuario,
  sesionRefreshToken,
  verificacionPendiente,
  resetPasswordPendiente,
} from '@superstars/db';
import {
  RolUsuario,
  RESEND_MAX,
  computeResendCooldownSec,
} from '@superstars/shared';
import type { JwtPayload } from '@superstars/shared';
import type {
  LoginDto,
  RegisterDto,
  RegisterResponse,
  VerifyEmailDto,
  VerifyEmailResponse,
  ResendCodeDto,
  ResendCodeResponse,
  ForgotPasswordDto,
  ForgotPasswordResponse,
  ResetPasswordDto,
  ResetPasswordResponse,
  ResendResetCodeDto,
  ResendResetCodeResponse,
} from '@superstars/shared';
import { MailService } from '../notificacion/mail.service';
import {
  ARGON2_OPTIONS,
  parseDuration,
  VERIFICACION_EXPIRACION_MS,
  VERIFICACION_EXPIRACION_MINUTOS,
  VERIFICACION_MAX_INTENTOS,
  MENSAJE_GENERICO_REGISTRO,
  MENSAJE_GENERICO_RESEND,
  MENSAJE_GENERICO_FORGOT_PASSWORD,
  MENSAJE_GENERICO_RESEND_RESET,
  MENSAJE_PASSWORD_RESTABLECIDA,
} from './auth.constants';

// Password placeholder para argon2.hash dummy (timing-attack mitigation).
// El valor real es irrelevante — solo importa que el costo computacional
// sea identico al hash real. NO se persiste, NO se compara, solo se ejecuta.
const TIMING_DUMMY_PASSWORD = 'timing-attack-mitigation-dummy-password';

// Set en memoria para lookup O(1) contra dominios desechables.
// La lista del paquete se carga al arrancar el modulo.
const DISPOSABLE_DOMAINS_SET: Set<string> = new Set(
  disposableDomainsList.map((d) => d.toLowerCase()),
);

@Injectable()
export class AuthService {
  private readonly pepper: Buffer;
  private readonly accessExpirationMs: number;
  private readonly refreshExpirationMs: number;
  private readonly absoluteLifetimeMs: number;
  private readonly maxSessionsPerUser: number;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.pepper = Buffer.from(
      this.configService.get<string>('PASSWORD_PEPPER', ''),
    );
    this.accessExpirationMs = parseDuration(
      this.configService.get<string>('jwt.expiration', '15m'),
    );
    this.refreshExpirationMs = parseDuration(
      this.configService.get<string>('jwt.refreshExpiration', '7d'),
    );
    this.absoluteLifetimeMs = parseDuration(
      this.configService.get<string>('jwt.sessionAbsoluteLifetime', '30d'),
    );
    this.maxSessionsPerUser = this.configService.get<number>(
      'jwt.maxSessionsPerUser',
      5,
    );
  }

  // Registro de proponente con verificacion por codigo de email (defensa en capas).
  // El usuario NO se crea en la tabla `usuario` hasta que confirme el codigo via verifyEmail().
  // Defensas aplicadas (en orden):
  //  1. Honeypot field (campo "website" oculto en frontend) + dummy hash uniforma timing
  //  2. Bloqueo de dominios desechables + dummy hash uniforma timing
  //  3. Anti-enumeration: misma respuesta si email existe / no existe / desechable / bot
  //     + dummy hash en camino "email existe" para igualar tiempo con "email nuevo"
  //  4. Hash SHA-256 del codigo (no plaintext)
  //  5. UPSERT en verificacion_pendiente: re-registro resetea reenvios e intentos
  //     (los rate limits por email/IP son los que cap el abuso real)
  // El rate limiting (IP + email hora + email dia) lo aplican guards en el controller.
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const respuestaGenerica: RegisterResponse = { message: MENSAJE_GENERICO_REGISTRO };

    // Capa 1: Honeypot — si llego con valor, es bot. Pretender exito.
    if (dto.website && dto.website.length > 0) {
      this.logger.warn(`Honeypot triggered en registro (email: ${dto.email})`);
      await this.dummyHashWork();
      return respuestaGenerica;
    }

    // Normalizar email
    const email = dto.email.toLowerCase().trim();

    // Capa 2: Bloqueo de dominios desechables (mailinator, tempmail, etc.)
    const dominio = email.split('@')[1];
    if (dominio && DISPOSABLE_DOMAINS_SET.has(dominio)) {
      this.logger.warn(`Email desechable bloqueado en registro: ${email}`);
      await this.dummyHashWork();
      return respuestaGenerica;
    }

    // Capa 3: Anti-enumeration. Si el email ya existe en `usuario`, mandar
    // un email distinto al duenio real, NO bloquear el response.
    const usuarioExistente = await this.db.query.usuario.findFirst({
      where: eq(usuario.email, email),
    });

    if (usuarioExistente) {
      // El email ya pertenece a una cuenta verificada. Avisarle al duenio real.
      // Dummy hash para que este camino tarde lo mismo que el de email nuevo
      await this.dummyHashWork();
      try {
        await this.mailService.sendCuentaExistente(email);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'unknown';
        this.logger.error(`Fallo envio sendCuentaExistente a ${email}: ${msg}`);
        // No fallar el endpoint — la respuesta debe ser identica
      }
      return respuestaGenerica;
    }

    // Generar codigo de 6 digitos con CSPRNG (no Math.random)
    const codigo = randomInt(100000, 1000000).toString();
    const codigoHash = createHash('sha256').update(codigo).digest('hex');

    // Hash del password con argon2id (mismo patron que el original)
    const passwordHash = await this.hashPassword(dto.password);

    const ahora = new Date().toISOString();
    const expiraEn = new Date(Date.now() + VERIFICACION_EXPIRACION_MS).toISOString();

    // UPSERT: si ya hay pendiente para este email, sobrescribir con nuevos datos.
    // Re-registro completo resetea reenvios y intentos — el cap real de abuso
    // viene de los throttlers email-hour (5/h) y email-day (10/d).
    await this.db
      .insert(verificacionPendiente)
      .values({
        email,
        nombre: dto.nombre,
        passwordHash,
        codigoHash,
        intentos: 0,
        reenviosSolicitados: 0,
        expiraEn,
        ultimoEnvioAt: ahora,
      })
      .onConflictDoUpdate({
        target: verificacionPendiente.email,
        set: {
          nombre: dto.nombre,
          passwordHash,
          codigoHash,
          intentos: 0,
          reenviosSolicitados: 0,
          expiraEn,
          ultimoEnvioAt: ahora,
          updatedAt: ahora,
        },
      });

    // Enviar correo con el codigo
    try {
      await this.mailService.sendVerificacionCodigo(
        email,
        codigo,
        VERIFICACION_EXPIRACION_MINUTOS,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`Fallo envio sendVerificacionCodigo a ${email}: ${msg}`);
      // No revelar el fallo. La respuesta sigue siendo generica.
      // El usuario reintentara o pedira reenvio.
    }

    return respuestaGenerica;
  }

  // Reenvio del codigo de verificacion para una cuenta pendiente.
  // Defensa critica: NO resetea el contador `reenviosSolicitados` (ataque
  // documentado en HackTricks: "resend resets rate limit, facilitating
  // continued brute force"). El tope absoluto RESEND_MAX y el cooldown
  // progresivo (Twilio: 30/40/60/90/120/240s) acotan el abuso.
  //
  // Anti-enumeration: respuesta uniforme si no hay pendiente, si hay pendiente,
  // si SMTP falla. La unica excepcion es MAX_RESENDS, que retorna error
  // tipado para que el frontend ofrezca "Volver a registrarte" como UX.
  async resendCode(dto: ResendCodeDto): Promise<ResendCodeResponse> {
    const email = dto.email.toLowerCase().trim();
    const respuestaGenerica: ResendCodeResponse = { message: MENSAJE_GENERICO_RESEND };

    const pendiente = await this.db.query.verificacionPendiente.findFirst({
      where: eq(verificacionPendiente.email, email),
    });

    // No hay pendiente: anti-enumeration. Simular el costo del camino real
    // (hash + DB write) para que el atacante no pueda distinguir via timing
    if (!pendiente) {
      await this.dummyHashWork();
      return respuestaGenerica;
    }

    // Tope absoluto alcanzado: requerir re-registro. Es OK leak este estado
    // porque el atacante necesita conocer el email Y haber agotado los reenvios
    // dentro de la ventana de 15 min — informacion muy especifica
    if (pendiente.reenviosSolicitados >= RESEND_MAX) {
      throw new BadRequestException({
        code: 'MAX_RESENDS',
        message: 'Has alcanzado el límite de reenvíos. Vuelve a registrarte.',
      });
    }

    // Cooldown progresivo enforcement server-side. El frontend tiene su propio
    // contador local para deshabilitar el boton — esto es la red de seguridad.
    const cooldownSeg = computeResendCooldownSec(pendiente.reenviosSolicitados);
    const segDesdeUltimo =
      (Date.now() - new Date(pendiente.ultimoEnvioAt).getTime()) / 1000;

    if (segDesdeUltimo < cooldownSeg) {
      throw new HttpException(
        {
          code: 'COOLDOWN_ACTIVE',
          message: 'Espera unos segundos antes de reenviar.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // OK: generar nuevo codigo, sobrescribir el viejo (lo invalida implicitamente)
    const codigo = randomInt(100000, 1000000).toString();
    const codigoHash = createHash('sha256').update(codigo).digest('hex');
    const ahora = new Date().toISOString();
    const expiraEn = new Date(Date.now() + VERIFICACION_EXPIRACION_MS).toISOString();

    await this.db
      .update(verificacionPendiente)
      .set({
        codigoHash,
        intentos: 0,
        reenviosSolicitados: pendiente.reenviosSolicitados + 1,
        expiraEn,
        ultimoEnvioAt: ahora,
        updatedAt: ahora,
      })
      .where(eq(verificacionPendiente.id, pendiente.id));

    try {
      await this.mailService.sendVerificacionCodigo(
        email,
        codigo,
        VERIFICACION_EXPIRACION_MINUTOS,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`Fallo envio resendCode a ${email}: ${msg}`);
      // No revelar el fallo. El usuario podra reintentar tras el cooldown
    }

    return respuestaGenerica;
  }

  // Helper para uniformar tiempos de respuesta y mitigar enumeration via timing
  // (GHSA-wcr9-mvr9-4qh5). Ejecuta el costo computacional de un argon2.hash
  // real, sin guardar nada. Lo usan los caminos cortos de register y resendCode
  private async dummyHashWork(): Promise<void> {
    await argon2.hash(TIMING_DUMMY_PASSWORD, {
      ...ARGON2_OPTIONS,
      secret: this.pepper,
    });
  }

  // Solicitud de reset de password. Anti-enumeration: misma respuesta y tiempo
  // si el email existe, no existe, o esta desactivado (con dummy hash).
  // Defensas alineadas con OWASP Forgot Password Cheat Sheet:
  //   - Mensaje generico uniforme (no revelar existencia)
  //   - NO modifica la cuenta hasta validar codigo (resetPassword)
  //   - Token CSPRNG + SHA-256, expira en 15 min, max intentos en BD
  //   - Rate limit IP/email/dia los aplica AuthRateLimitGuard en el controller
  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordResponse> {
    const email = dto.email.toLowerCase().trim();
    const respuestaGenerica: ForgotPasswordResponse = { message: MENSAJE_GENERICO_FORGOT_PASSWORD };

    const user = await this.db.query.usuario.findFirst({
      where: eq(usuario.email, email),
    });

    // Usuario inexistente o desactivado: respuesta neutra con dummy hash
    // para uniformar timing con el camino real
    if (!user || !user.activo) {
      await this.dummyHashWork();
      return respuestaGenerica;
    }

    // Generar codigo nuevo (CSPRNG)
    const codigo = randomInt(100000, 1000000).toString();
    const codigoHash = createHash('sha256').update(codigo).digest('hex');
    const ahora = new Date().toISOString();
    const expiraEn = new Date(Date.now() + VERIFICACION_EXPIRACION_MS).toISOString();

    // UPSERT por usuario_id: si ya hay reset pendiente para este usuario,
    // lo sobrescribe con codigo nuevo, intentos=0 y reenvios=0 (re-solicitud
    // completa). El cap real de abuso lo aplican los throttlers email/dia
    await this.db
      .insert(resetPasswordPendiente)
      .values({
        usuarioId: user.id,
        codigoHash,
        intentos: 0,
        reenviosSolicitados: 0,
        expiraEn,
        ultimoEnvioAt: ahora,
      })
      .onConflictDoUpdate({
        target: resetPasswordPendiente.usuarioId,
        set: {
          codigoHash,
          intentos: 0,
          reenviosSolicitados: 0,
          expiraEn,
          ultimoEnvioAt: ahora,
          updatedAt: ahora,
        },
      });

    try {
      await this.mailService.sendResetPasswordCodigo(
        email,
        codigo,
        VERIFICACION_EXPIRACION_MINUTOS,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`Fallo envio sendResetPasswordCodigo a ${email}: ${msg}`);
      // No revelar el fallo
    }

    return respuestaGenerica;
  }

  // Confirma el reset: valida codigo y, si ok, cambia password + invalida
  // todas las sesiones (OWASP: "all other sessions should be invalidated")
  // + envia mail de confirmacion (audit trail + alerta a victima)
  async resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResponse> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.db.query.usuario.findFirst({
      where: eq(usuario.email, email),
    });

    // Usuario inexistente o desactivado: error generico (no revelar)
    if (!user || !user.activo) {
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED',
        message: 'Código inválido o expirado. Vuelve a solicitar el restablecimiento.',
      });
    }

    const pendiente = await this.db.query.resetPasswordPendiente.findFirst({
      where: eq(resetPasswordPendiente.usuarioId, user.id),
    });

    if (!pendiente) {
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED',
        message: 'Código inválido o expirado. Vuelve a solicitar el restablecimiento.',
      });
    }

    // Codigo expirado: borrar y rechazar
    if (new Date(pendiente.expiraEn) < new Date()) {
      await this.db
        .delete(resetPasswordPendiente)
        .where(eq(resetPasswordPendiente.id, pendiente.id));
      throw new BadRequestException({
        code: 'EXPIRED',
        message: 'El código expiró. Vuelve a solicitar el restablecimiento.',
      });
    }

    // Maximo de intentos alcanzado: invalidar y rechazar
    if (pendiente.intentos >= VERIFICACION_MAX_INTENTOS) {
      await this.db
        .delete(resetPasswordPendiente)
        .where(eq(resetPasswordPendiente.id, pendiente.id));
      throw new BadRequestException({
        code: 'MAX_ATTEMPTS',
        message: 'Demasiados intentos. Vuelve a solicitar el restablecimiento.',
      });
    }

    const codigoHashRecibido = createHash('sha256').update(dto.codigo).digest('hex');

    if (codigoHashRecibido !== pendiente.codigoHash) {
      const nuevosIntentos = pendiente.intentos + 1;
      await this.db
        .update(resetPasswordPendiente)
        .set({ intentos: nuevosIntentos })
        .where(eq(resetPasswordPendiente.id, pendiente.id));

      const intentosRestantes = VERIFICACION_MAX_INTENTOS - nuevosIntentos;
      throw new BadRequestException({
        code: 'INVALID',
        message:
          intentosRestantes > 0
            ? `Código incorrecto. Te ${intentosRestantes === 1 ? 'queda' : 'quedan'} ${intentosRestantes} intento${intentosRestantes === 1 ? '' : 's'}.`
            : 'Código incorrecto. Vuelve a solicitar el restablecimiento.',
        intentosRestantes,
      });
    }

    // Codigo correcto: en transaccion atomicamente
    //   1. Actualizar password_hash en usuario
    //   2. Borrar el pendiente (invalida codigo, evita reuso)
    //   3. Borrar todas las sesiones del usuario (logout en todos los dispositivos)
    const nuevoHash = await this.hashPassword(dto.nuevaPassword);

    await this.db.transaction(async (tx) => {
      await tx
        .update(usuario)
        .set({ passwordHash: nuevoHash, updatedAt: new Date().toISOString() })
        .where(eq(usuario.id, user.id));

      await tx
        .delete(resetPasswordPendiente)
        .where(eq(resetPasswordPendiente.id, pendiente.id));

      await tx
        .delete(sesionRefreshToken)
        .where(eq(sesionRefreshToken.usuarioId, user.id));
    });

    // Audit trail + alerta a victima si no fue ella
    try {
      await this.mailService.sendPasswordCambiado(email);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`Fallo envio sendPasswordCambiado a ${email}: ${msg}`);
      // No fallar el endpoint — el reset ya se aplico
    }

    return { message: MENSAJE_PASSWORD_RESTABLECIDA };
  }

  // Reenvio del codigo de reset. Mismo patron que resendCode pero sobre la
  // tabla reset_password_pendiente y vinculado por usuario_id.
  // El contador `reenviosSolicitados` NO se resetea con resend (defensa
  // contra brute-force-via-resend documentada en HackTricks)
  async resendResetCode(dto: ResendResetCodeDto): Promise<ResendResetCodeResponse> {
    const email = dto.email.toLowerCase().trim();
    const respuestaGenerica: ResendResetCodeResponse = { message: MENSAJE_GENERICO_RESEND_RESET };

    const user = await this.db.query.usuario.findFirst({
      where: eq(usuario.email, email),
    });

    if (!user || !user.activo) {
      await this.dummyHashWork();
      return respuestaGenerica;
    }

    const pendiente = await this.db.query.resetPasswordPendiente.findFirst({
      where: eq(resetPasswordPendiente.usuarioId, user.id),
    });

    // No hay pendiente: anti-enumeration con dummy hash
    if (!pendiente) {
      await this.dummyHashWork();
      return respuestaGenerica;
    }

    if (pendiente.reenviosSolicitados >= RESEND_MAX) {
      throw new BadRequestException({
        code: 'MAX_RESENDS',
        message: 'Has alcanzado el límite de reenvíos. Vuelve a solicitar el restablecimiento.',
      });
    }

    const cooldownSeg = computeResendCooldownSec(pendiente.reenviosSolicitados);
    const segDesdeUltimo =
      (Date.now() - new Date(pendiente.ultimoEnvioAt).getTime()) / 1000;

    if (segDesdeUltimo < cooldownSeg) {
      throw new HttpException(
        {
          code: 'COOLDOWN_ACTIVE',
          message: 'Espera unos segundos antes de reenviar.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const codigo = randomInt(100000, 1000000).toString();
    const codigoHash = createHash('sha256').update(codigo).digest('hex');
    const ahora = new Date().toISOString();
    const expiraEn = new Date(Date.now() + VERIFICACION_EXPIRACION_MS).toISOString();

    await this.db
      .update(resetPasswordPendiente)
      .set({
        codigoHash,
        intentos: 0,
        reenviosSolicitados: pendiente.reenviosSolicitados + 1,
        expiraEn,
        ultimoEnvioAt: ahora,
        updatedAt: ahora,
      })
      .where(eq(resetPasswordPendiente.id, pendiente.id));

    try {
      await this.mailService.sendResetPasswordCodigo(
        email,
        codigo,
        VERIFICACION_EXPIRACION_MINUTOS,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`Fallo envio resendResetCode a ${email}: ${msg}`);
    }

    return respuestaGenerica;
  }

  // Cron: cada 30 min limpia resets pendientes vencidos.
  // No es critico (cada flow valida `expira_en > now()` igual)
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCleanupResetPasswords(): Promise<void> {
    const now = new Date().toISOString();
    const result = await this.db
      .delete(resetPasswordPendiente)
      .where(lt(resetPasswordPendiente.expiraEn, now))
      .returning({ id: resetPasswordPendiente.id });

    if (result.length > 0) {
      this.logger.log(`Cleanup reset password: ${result.length} pendientes vencidos eliminados`);
    }
  }

  // Verifica el codigo enviado al email. Si es correcto, mueve los datos
  // de verificacion_pendiente a la tabla `usuario` y borra el pendiente.
  // Devuelve user data en caso de exito.
  async verifyEmail(dto: VerifyEmailDto): Promise<VerifyEmailResponse> {
    const email = dto.email.toLowerCase().trim();

    const pendiente = await this.db.query.verificacionPendiente.findFirst({
      where: eq(verificacionPendiente.email, email),
    });

    // No existe registro pendiente para este email
    if (!pendiente) {
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED',
        message: 'Código inválido o expirado. Vuelve a registrarte.',
      });
    }

    // Codigo expirado: borrar y rechazar
    if (new Date(pendiente.expiraEn) < new Date()) {
      await this.db
        .delete(verificacionPendiente)
        .where(eq(verificacionPendiente.id, pendiente.id));
      throw new BadRequestException({
        code: 'EXPIRED',
        message: 'El código expiró. Vuelve a registrarte para recibir uno nuevo.',
      });
    }

    // Maximo de intentos alcanzado: invalidar y rechazar
    if (pendiente.intentos >= VERIFICACION_MAX_INTENTOS) {
      await this.db
        .delete(verificacionPendiente)
        .where(eq(verificacionPendiente.id, pendiente.id));
      throw new BadRequestException({
        code: 'MAX_ATTEMPTS',
        message: 'Demasiados intentos. Vuelve a registrarte.',
      });
    }

    // Comparar hash del codigo recibido contra el guardado
    const codigoHashRecibido = createHash('sha256').update(dto.codigo).digest('hex');

    if (codigoHashRecibido !== pendiente.codigoHash) {
      // Codigo incorrecto: incrementar intentos
      const nuevosIntentos = pendiente.intentos + 1;
      await this.db
        .update(verificacionPendiente)
        .set({ intentos: nuevosIntentos })
        .where(eq(verificacionPendiente.id, pendiente.id));

      const intentosRestantes = VERIFICACION_MAX_INTENTOS - nuevosIntentos;
      throw new BadRequestException({
        code: 'INVALID',
        message:
          intentosRestantes > 0
            ? `Código incorrecto. Te ${intentosRestantes === 1 ? 'queda' : 'quedan'} ${intentosRestantes} intento${intentosRestantes === 1 ? '' : 's'}.`
            : 'Código incorrecto. Vuelve a registrarte.',
        intentosRestantes,
      });
    }

    // Codigo correcto: en transaccion, INSERT en usuario + DELETE de pendiente
    let newUser: { id: number; email: string; nombre: string; rol: RolUsuario };
    try {
      newUser = await this.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(usuario)
          .values({
            email,
            passwordHash: pendiente.passwordHash,
            nombre: pendiente.nombre,
            rol: RolUsuario.PROPONENTE,
          })
          .returning({
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            rol: usuario.rol,
          });

        await tx
          .delete(verificacionPendiente)
          .where(eq(verificacionPendiente.id, pendiente.id));

        return {
          id: created.id,
          email: created.email,
          nombre: created.nombre,
          rol: created.rol as RolUsuario,
        };
      });
    } catch (error: unknown) {
      // Race: otro request creo el usuario en el medio. UNIQUE violation = 23505.
      const pgCode = (error as { cause?: { code?: string }; code?: string })?.cause?.code
        ?? (error as { code?: string })?.code;
      if (pgCode === '23505') {
        throw new ConflictException('Esta cuenta ya fue verificada. Inicia sesión.');
      }
      throw error;
    }

    return {
      message: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.',
      user: newUser,
    };
  }

  // Cron: cada 30 min limpia registros pendientes ya vencidos.
  // No es critico (la validacion del codigo verifica `expira_en > now()` siempre).
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCleanupVerificaciones(): Promise<void> {
    const now = new Date().toISOString();
    const result = await this.db
      .delete(verificacionPendiente)
      .where(lt(verificacionPendiente.expiraEn, now))
      .returning({ id: verificacionPendiente.id });

    if (result.length > 0) {
      this.logger.log(`Cleanup verificacion: ${result.length} pendientes vencidos eliminados`);
    }
  }

  // Login con email y password
  async login(dto: LoginDto) {
    const user = await this.db.query.usuario.findFirst({
      where: eq(usuario.email, dto.email),
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValid = await this.verifyPassword(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const familyId = randomUUID();
    await this.enforceSessionLimit(user.id);

    const accessToken = await this.generateAccessToken(user);
    const result = await this.createRefreshToken(user.id, familyId);

    return {
      accessToken,
      refreshToken: result.rawToken,
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    };
  }

  // Refrescar tokens usando refresh token opaco
  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const session = await this.db.query.sesionRefreshToken.findFirst({
      where: eq(sesionRefreshToken.tokenHash, tokenHash),
    });

    // Token no encontrado
    if (!session) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Reuso detectado: token ya fue consumido
    if (session.revocadoEn) {
      this.logger.warn(
        `Reuso de refresh token detectado, family=${session.familyId}, usuario=${session.usuarioId}`,
      );
      await this.revokeFamily(session.familyId);
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Token expirado
    if (new Date(session.expiraEn) < new Date()) {
      await this.db
        .update(sesionRefreshToken)
        .set({ revocadoEn: new Date().toISOString() })
        .where(eq(sesionRefreshToken.id, session.id));
      throw new UnauthorizedException('Refresh token expirado');
    }

    // Familia expirada (lifetime absoluto)
    const familyExpired = await this.isFamilyExpired(session.familyId);
    if (familyExpired) {
      this.logger.log(
        `Familia expirada (lifetime absoluto), family=${session.familyId}`,
      );
      await this.revokeFamily(session.familyId);
      throw new UnauthorizedException('Sesión expirada, inicie sesión nuevamente');
    }

    // Verificar que el usuario sigue activo
    const user = await this.db.query.usuario.findFirst({
      where: eq(usuario.id, session.usuarioId),
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Crear nuevo token con el mismo familyId
    const newToken = await this.createRefreshToken(user.id, session.familyId);

    // Marcar token viejo como consumido (optimistic locking con WHERE revocado_en IS NULL)
    const updateResult = await this.db
      .update(sesionRefreshToken)
      .set({
        revocadoEn: new Date().toISOString(),
        replacedBy: newToken.id,
      })
      .where(
        and(
          eq(sesionRefreshToken.id, session.id),
          isNull(sesionRefreshToken.revocadoEn),
        ),
      )
      .returning({ id: sesionRefreshToken.id });

    // Si el UPDATE no afecto filas, otra peticion ya consumio este token
    if (updateResult.length === 0) {
      this.logger.warn(
        `Rotacion concurrente detectada, family=${session.familyId}`,
      );
      await this.revokeFamily(session.familyId);
      throw new UnauthorizedException('Refresh token inválido');
    }

    const accessToken = await this.generateAccessToken(user);

    return {
      accessToken,
      refreshToken: newToken.rawToken,
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    };
  }

  // Cerrar una sesion (revoca toda la familia)
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const session = await this.db.query.sesionRefreshToken.findFirst({
      where: eq(sesionRefreshToken.tokenHash, tokenHash),
    });

    if (session) {
      await this.revokeFamily(session.familyId);
    }
  }

  // Cerrar todas las sesiones de un usuario
  async logoutAll(userId: number): Promise<void> {
    await this.db
      .delete(sesionRefreshToken)
      .where(eq(sesionRefreshToken.usuarioId, userId));
  }

  // Expiracion del refresh token en ms (para la cookie)
  get refreshExpiration(): number {
    return this.refreshExpirationMs;
  }

  // Expiracion del access token en ms (para la cookie)
  get accessExpiration(): number {
    return this.accessExpirationMs;
  }

  // --- Metodos privados ---

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      ...ARGON2_OPTIONS,
      secret: this.pepper,
    });
  }

  private async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password, { secret: this.pepper });
    } catch {
      return false;
    }
  }

  private async generateAccessToken(user: {
    id: number;
    email: string;
    rol: string;
  }): Promise<string> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      rol: user.rol as RolUsuario,
    };
    return this.jwtService.signAsync(payload);
  }

  private async createRefreshToken(
    userId: number,
    familyId: string,
  ): Promise<{ rawToken: string; id: number }> {
    const rawToken = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(Date.now() + this.refreshExpirationMs);

    const [row] = await this.db.insert(sesionRefreshToken).values({
      usuarioId: userId,
      tokenHash,
      expiraEn: expiresAt.toISOString(),
      familyId,
    }).returning({ id: sesionRefreshToken.id });

    return { rawToken, id: row.id };
  }

  // SHA-256 para tokens de alta entropia (no bcrypt/argon2)
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Elimina todos los tokens de una familia
  private async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .delete(sesionRefreshToken)
      .where(eq(sesionRefreshToken.familyId, familyId));
  }

  // Verifica si la familia supero el lifetime absoluto
  private async isFamilyExpired(familyId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ oldest: min(sesionRefreshToken.createdAt) })
      .from(sesionRefreshToken)
      .where(eq(sesionRefreshToken.familyId, familyId));

    if (!result?.oldest) return true;

    const familyAge = Date.now() - new Date(result.oldest).getTime();
    return familyAge > this.absoluteLifetimeMs;
  }

  // Si el usuario tiene >= maxSessions familias activas, borra la mas vieja
  private async enforceSessionLimit(userId: number): Promise<void> {
    // Contar familias activas (al menos 1 token no revocado y no expirado)
    const activeFamilies = await this.db
      .selectDistinct({ familyId: sesionRefreshToken.familyId })
      .from(sesionRefreshToken)
      .where(
        and(
          eq(sesionRefreshToken.usuarioId, userId),
          isNull(sesionRefreshToken.revocadoEn),
        ),
      );

    if (activeFamilies.length < this.maxSessionsPerUser) return;

    // Buscar la familia mas vieja (por min created_at)
    const oldestFamily = await this.db
      .select({
        familyId: sesionRefreshToken.familyId,
        oldest: min(sesionRefreshToken.createdAt),
      })
      .from(sesionRefreshToken)
      .where(
        and(
          eq(sesionRefreshToken.usuarioId, userId),
          isNull(sesionRefreshToken.revocadoEn),
        ),
      )
      .groupBy(sesionRefreshToken.familyId)
      .orderBy(min(sesionRefreshToken.createdAt))
      .limit(1);

    if (oldestFamily.length > 0) {
      await this.revokeFamily(oldestFamily[0].familyId);
    }
  }

  // Limpieza periodica de tokens expirados/revocados
  private async cleanupExpiredTokens(): Promise<number> {
    // Borrar familias donde TODOS los tokens estan revocados o expirados
    const now = new Date().toISOString();

    // Subquery: familias que aun tienen algun token activo
    const activeFamilies = this.db
      .selectDistinct({ familyId: sesionRefreshToken.familyId })
      .from(sesionRefreshToken)
      .where(
        and(
          isNull(sesionRefreshToken.revocadoEn),
          sql`${sesionRefreshToken.expiraEn} > ${now}`,
        ),
      );

    const deleted = await this.db
      .delete(sesionRefreshToken)
      .where(
        sql`${sesionRefreshToken.familyId} NOT IN (${activeFamilies})`,
      )
      .returning({ id: sesionRefreshToken.id });

    return deleted.length;
  }

  // Cron: cada 30 minutos limpia tokens expirados
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCleanup(): Promise<void> {
    const count = await this.cleanupExpiredTokens();
    if (count > 0) {
      this.logger.log(`Cleanup: ${count} tokens expirados eliminados`);
    }
  }
}
