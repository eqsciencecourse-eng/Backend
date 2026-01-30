import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  ConflictException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { UserRole, User } from '../users/schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(RequireAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  @Get('users')
  async getUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('pending-teachers')
  async getPendingTeachers() {
    return this.adminService.findPendingTeachers();
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Patch('approve-teacher/:token')
  async approveTeacher(
    @Param('token') token: string,
    @CurrentUser() admin: User,
  ) {
    return this.adminService.approveTeacher(
      token,
      (admin as any)._id.toString(),
    );
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Post('create-teacher')
  async createTeacher(
    @Body() body: { email: string; displayName: string; password?: string },
  ) {
    const existingUser = await this.usersService.findByEmail(body.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Generate random password if not provided
    const password = body.password || Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await this.usersService.create({
      email: body.email,
      passwordHash,
      displayName: body.displayName,
      role: UserRole.TEACHER,
      firebaseUid: `teacher_${Date.now()}`, // Temporary UID for non-firebase users
      isApproved: true,
    } as any);

    return {
      user: await this.usersService.toSafeObject(newUser),
      tempPassword: password,
    };
  }
}
