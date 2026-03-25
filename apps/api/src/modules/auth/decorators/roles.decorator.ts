import { SetMetadata } from '@nestjs/common';
import type { RolUsuario } from '@superstars/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
