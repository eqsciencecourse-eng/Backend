import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(private readonly usersService: UsersService) {}

  async findAllUsers() {
    return this.usersService.findAll();
  }

  async findPendingTeachers() {
    return this.usersService.findPendingTeachers();
  }

  async getStats() {
    return this.usersService.getStats();
  }

  async approveTeacher(token: string, adminId: string) {
    return this.usersService.approveTeacherRequest(token, adminId);
  }
}
