import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import {
  registerSchema,
  verifyEmailSchema,
  resendCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendResetCodeSchema,
} from '@superstars/shared';
import type {
  LoginDto,
  RegisterDto,
  VerifyEmailDto,
  ResendCodeDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendResetCodeDto,
  AuthUser,
} from '@superstars/shared';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthRateLimit } from './decorators/rate-limit.decorator';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import {
  REFRESH_COOKIE_NAME,
  ACCESS_COOKIE_NAME,
  RATE_LIMIT_REGISTER_IP_LIMIT,
  RATE_LIMIT_REGISTER_IP_TTL_MS,
  RATE_LIMIT_REGISTER_EMAIL_HOUR_LIMIT,
  RATE_LIMIT_REGISTER_EMAIL_HOUR_TTL_MS,
  RATE_LIMIT_REGISTER_EMAIL_DAY_LIMIT,
  RATE_LIMIT_REGISTER_EMAIL_DAY_TTL_MS,
  RATE_LIMIT_VERIFY_IP_LIMIT,
  RATE_LIMIT_VERIFY_IP_TTL_MS,
} from './auth.constants';

@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('app.nodeEnv') === 'production';
  }

  // Registro con verificacion por codigo de email.
  // Rate limit triple capa via AuthRateLimitGuard:
  //   - IP: 3 / hora (typo-tolerante)
  //   - Email hora: 5 / hora (anti subscription bombing)
  //   - Email dia: 10 / dia (cap absoluto que tambien aplica al reenvio)
  // Las tres capas comparten storage; reenvio (/auth/resend-code) cuenta en
  // las dos capas de email asi el atacante no puede sumar register + resend
  @Public()
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit([
    {
      prefix: 'register-ip',
      by: 'ip',
      limit: RATE_LIMIT_REGISTER_IP_LIMIT,
      ttl: RATE_LIMIT_REGISTER_IP_TTL_MS,
    },
    {
      prefix: 'register-email-hour',
      by: 'email',
      limit: RATE_LIMIT_REGISTER_EMAIL_HOUR_LIMIT,
      ttl: RATE_LIMIT_REGISTER_EMAIL_HOUR_TTL_MS,
    },
    {
      prefix: 'register-email-day',
      by: 'email',
      limit: RATE_LIMIT_REGISTER_EMAIL_DAY_LIMIT,
      ttl: RATE_LIMIT_REGISTER_EMAIL_DAY_TTL_MS,
    },
  ])
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() body: RegisterDto) {
    const dto = registerSchema.parse(body);
    return this.authService.register(dto);
  }

  // Reenvio del codigo de verificacion. Comparte las dos capas de email con
  // /register asi el cap de envios totales por email/dia se enforce de forma
  // global. El cooldown progresivo (30/40/60/90/120/240s) se aplica
  // server-side dentro del service.
  @Public()
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit([
    {
      prefix: 'register-email-hour',
      by: 'email',
      limit: RATE_LIMIT_REGISTER_EMAIL_HOUR_LIMIT,
      ttl: RATE_LIMIT_REGISTER_EMAIL_HOUR_TTL_MS,
    },
    {
      prefix: 'register-email-day',
      by: 'email',
      limit: RATE_LIMIT_REGISTER_EMAIL_DAY_LIMIT,
      ttl: RATE_LIMIT_REGISTER_EMAIL_DAY_TTL_MS,
    },
  ])
  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  async resendCode(@Body() body: ResendCodeDto) {
    const dto = resendCodeSchema.parse(body);
    return this.authService.resendCode(dto);
  }

  // Verifica el codigo de 6 digitos enviado al email durante register.
  // Rate limit por IP solo (la proteccion principal contra brute-force es
  // el contador de intentos en BD, max 3 por codigo).
  @Public()
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit([
    {
      prefix: 'verify-ip',
      by: 'ip',
      limit: RATE_LIMIT_VERIFY_IP_LIMIT,
      ttl: RATE_LIMIT_VERIFY_IP_TTL_MS,
    },
  ])
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    const dto = verifyEmailSchema.parse(body);
    return this.authService.verifyEmail(dto);
  }

  // Solicitud de reset de password. Reusa los mismos throttlers de register
  // (IP + email/h + email/d) — el envio de correos comparte cap diario para
  // que no se pueda usar register + forgot-password como dos vectores de
  // bombing contra la misma victima
  @Public()
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit([
    {
      prefix: 'register-ip',
      by: 'ip',
      limit: RATE_LIMIT_REGISTER_IP_LIMIT,
      ttl: RATE_LIMIT_REGISTER_IP_TTL_MS,
    },
    {
      prefix: 'register-email-hour',
      by: 'email',
      limit: RATE_LIMIT_REGISTER_EMAIL_HOUR_LIMIT,
      ttl: RATE_LIMIT_REGISTER_EMAIL_HOUR_TTL_MS,
    },
    {
      prefix: 'register-email-day',
      by: 'email',
      limit: RATE_LIMIT_REGISTER_EMAIL_DAY_LIMIT,
      ttl: RATE_LIMIT_REGISTER_EMAIL_DAY_TTL_MS,
    },
  ])
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const dto = forgotPasswordSchema.parse(body);
    return this.authService.forgotPassword(dto);
  }

  // Confirma el reset: valida codigo + setea nueva password. Rate limit IP
  // analogo a verify-email (la defensa principal contra brute force es el
  // contador de intentos en BD, max 3 por codigo)
  @Public()
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit([
    {
      prefix: 'verify-ip',
      by: 'ip',
      limit: RATE_LIMIT_VERIFY_IP_LIMIT,
      ttl: RATE_LIMIT_VERIFY_IP_TTL_MS,
    },
  ])
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    const dto = resetPasswordSchema.parse(body);
    return this.authService.resetPassword(dto);
  }

  // Reenvio del codigo de reset. Comparte las dos capas de email con
  // /forgot-password y /register asi el cap diario es global por email
  @Public()
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit([
    {
      prefix: 'register-email-hour',
      by: 'email',
      limit: RATE_LIMIT_REGISTER_EMAIL_HOUR_LIMIT,
      ttl: RATE_LIMIT_REGISTER_EMAIL_HOUR_TTL_MS,
    },
    {
      prefix: 'register-email-day',
      by: 'email',
      limit: RATE_LIMIT_REGISTER_EMAIL_DAY_LIMIT,
      ttl: RATE_LIMIT_REGISTER_EMAIL_DAY_TTL_MS,
    },
  ])
  @Post('resend-reset-code')
  @HttpCode(HttpStatus.OK)
  async resendResetCode(@Body() body: ResendResetCodeDto) {
    const dto = resendResetCodeSchema.parse(body);
    return this.authService.resendResetCode(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    this.setAccessCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no proporcionado');
    }

    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    this.setAccessCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    res.clearCookie(ACCESS_COOKIE_NAME, { path: '/' });
    return { message: 'Sesión cerrada' };
  }

  // Requiere autenticacion (access token valido)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(user.id);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    res.clearCookie(ACCESS_COOKIE_NAME, { path: '/' });
    return { message: 'Todas las sesiones cerradas' };
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: this.authService.refreshExpiration,
    });
  }

  // Cookie con el JWT access token (path=/ para que proxy.ts la vea)
  private setAccessCookie(res: Response, token: string): void {
    res.cookie(ACCESS_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: this.authService.accessExpiration,
    });
  }
}
