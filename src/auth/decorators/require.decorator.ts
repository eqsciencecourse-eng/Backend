import { applyDecorators, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../../users/schemas/user.schema';

export const requireAuth = () => UseGuards(RequireAuthGuard);

export const requireAdmin = () =>
  applyDecorators(
    UseGuards(RequireAuthGuard, RolesGuard),
    Roles(UserRole.ADMIN),
  );

export const requireTeacher = () =>
  applyDecorators(
    UseGuards(RequireAuthGuard, RolesGuard),
    Roles(UserRole.TEACHER, UserRole.ADMIN),
  );
