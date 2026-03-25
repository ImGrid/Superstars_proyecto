import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as argon2 from 'argon2';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { eq, and, isNull, sql, min, countDistinct } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { usuario, sesionRefreshToken } from '@superstars/db';
import { RolUsuario } from '@superstars/shared';
import type { JwtPayload } from '@superstars/shared';
import type { LoginDto, RegisterDto } from '@superstars/shared';
import { ARGON2_OPTIONS, parseDuration } from './auth.constants';

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

  // Registro de proponente (auto-registro publico)
  async register(dto: RegisterDto) {
    const existing = await this.db.query.usuario.findFirst({
      where: eq(usuario.email, dto.email),
    });
    if (existing) {
      throw new ConflictException('El email ya esta registrado');
    }

    const passwordHash = await this.hashPassword(dto.password);

    const [newUser] = await this.db
      .insert(usuario)
      .values({
        email: dto.email,
        passwordHash,
        nombre: dto.nombre,
        rol: RolUsuario.PROPONENTE,
      })
      .returning({
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      });

    return newUser;
  }

  // Login con email y password
  async login(dto: LoginDto) {
    const user = await this.db.query.usuario.findFirst({
      where: eq(usuario.email, dto.email),
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const isValid = await this.verifyPassword(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales invalidas');
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
      throw new UnauthorizedException('Refresh token invalido');
    }

    // Reuso detectado: token ya fue consumido
    if (session.revocadoEn) {
      this.logger.warn(
        `Reuso de refresh token detectado, family=${session.familyId}, usuario=${session.usuarioId}`,
      );
      await this.revokeFamily(session.familyId);
      throw new UnauthorizedException('Refresh token invalido');
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
      throw new UnauthorizedException('Sesion expirada, inicie sesion nuevamente');
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
      throw new UnauthorizedException('Refresh token invalido');
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
