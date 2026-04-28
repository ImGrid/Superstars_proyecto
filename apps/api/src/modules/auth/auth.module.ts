import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { NotificacionModule } from '../notificacion/notificacion.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.expiration', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    // Para inyectar MailService en AuthService (envio de codigos de verificacion)
    NotificacionModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Guard global: todos los endpoints requieren JWT excepto @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Guard de roles: verifica @Roles() cuando esta presente
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
