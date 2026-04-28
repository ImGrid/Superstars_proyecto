import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  // Envia el codigo de verificacion para confirmar el correo durante el registro
  async sendVerificacionCodigo(
    to: string,
    codigo: string,
    expiraEnMinutos: number,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Tu código de verificación - SuperStar',
        template: 'verificacion-codigo',
        context: { codigo, expiraEnMinutos },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Fallo envio de codigo a ${to}: ${msg}`);
      throw error;
    }
  }

  // Aviso a un usuario ya verificado de que alguien intento registrarse con su email
  // No lleva ningun input del usuario para evitar abuso de plantilla (Cisco Talos finding)
  async sendCuentaExistente(to: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Intento de registro en SuperStar',
        template: 'cuenta-existente',
        context: {},
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Fallo envio de aviso de cuenta existente a ${to}: ${msg}`);
      throw error;
    }
  }

  // Envia el codigo de 6 digitos para restablecer la contrasena
  async sendResetPasswordCodigo(
    to: string,
    codigo: string,
    expiraEnMinutos: number,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Restablece tu contraseña - SuperStar',
        template: 'reset-password-codigo',
        context: { codigo, expiraEnMinutos },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Fallo envio de codigo de reset a ${to}: ${msg}`);
      throw error;
    }
  }

  // Confirmacion post-cambio de password (audit + alerta a victima si no fue ella)
  // Sin input del usuario en el template — coherente con el patron Cisco Talos
  async sendPasswordCambiado(to: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Tu contraseña fue cambiada - SuperStar',
        template: 'password-cambiado',
        context: {},
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Fallo envio de aviso de password cambiado a ${to}: ${msg}`);
      throw error;
    }
  }
}
