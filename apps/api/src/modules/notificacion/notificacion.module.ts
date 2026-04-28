import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import * as path from 'path';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('mail.host'),
          port: config.get<number>('mail.port'),
          secure: config.get<boolean>('mail.secure'),
          auth: {
            user: config.get<string>('mail.user'),
            pass: config.get<string>('mail.password'),
          },
        },
        defaults: {
          from: config.get<string>('mail.from'),
        },
        template: {
          // En runtime __dirname apunta a dist/modules/notificacion/
          // donde nest-cli copia los .hbs (configurado en nest-cli.json assets)
          dir: path.join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class NotificacionModule {}
