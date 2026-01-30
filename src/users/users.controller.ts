import {
  Controller,
  Get,
  UseGuards,
  Patch,
  Body,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from './users.service';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './schemas/user.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import * as bcrypt from 'bcryptjs';

@Controller('users') // Assuming a controller class named UsersController
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('test-connection')
  testConnection() {
    return { message: 'UsersController is active' };
  }

  // [Moved to Top] Student Registry Endpoints
  @Get('registry')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getRegistry() {
    return this.usersService.getRegistry();
  }

  @Post('registry/import')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async importRegistry(@Body() students: CreateUserDto[]) {
    // Process serialized imports
    const results = await Promise.all(students.map(s => this.usersService.upsertRegistryStudent(s)));
    return { success: true, count: results.length };
  }

  @Post('registry/backfill-ids')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async backfillIds() {
    return this.usersService.backfillStudentIds();
  }

  @Post('registry/fix-ids')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async fixIds() {
    return this.usersService.recalculateStudentIds();
  }

  @Get('registry/excel-files')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getExcelFiles() {
    return this.usersService.listExcelFiles();
  }

  @Post('registry/import-from-server')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async importFromServer(@Body() body: { filename: string }) {
    if (!body.filename) {
      throw new BadRequestException('Filename is required');
    }
    return this.usersService.importFromExcelFile(body.filename);
  }

  @Post()
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    console.log('Received Create Request:', createUserDto);
    if (createUserDto.passwordHash) {
      createUserDto.passwordHash = await bcrypt.hash(createUserDto.passwordHash, 12);
    }
    return this.usersService.create(createUserDto);
  }

  @Get('students')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getStudents() {
    return this.usersService.findByRole(UserRole.STUDENT);
  }

  @Get()
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('pending-teachers')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPendingTeachers() {
    return this.usersService.findPendingTeachers();
  }

  @Get('profile')
  @UseGuards(RequireAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Patch('update-profile')
  @UseGuards(RequireAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateData: Partial<User>,
  ) {
    const userId = (user as any)._id.toString();
    const updatedUser = await this.usersService.update(userId, updateData);

    // Check if studyTimes were updated
    if (updateData.studyTimes) {
      // Simple equality check or assuming any patch with studyTimes is a change
      await this.usersService['realtimeService'].notifyAdmin('student-updated-schedule', {
        studentName: user.displayName || (user as any).studentName || 'Student',
        newSchedule: updateData.studyTimes,
        userId: userId
      });

      // Also trigger webhook if needed
      // this.usersService['webhookService'].triggerScheduleUpdate(updatedUser);
    }

    return updatedUser;
  }

  @Post('profile-picture')
  @UseGuards(RequireAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const randomName = uuidv4();
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadProfilePicture(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const photoURL = `${process.env.BACKEND_URL || 'http://localhost:4000'}/uploads/profiles/${file.filename}`;
    return this.usersService.update((user as any)._id.toString(), { photoURL });
  }
  @Patch(':id')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async updateUser(@Param('id') id: string, @Body() updateData: Partial<User>) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new BadRequestException('User not found');

    // [FIX] Hash password if it is being updated
    if (updateData.passwordHash) {
      updateData.passwordHash = await bcrypt.hash(updateData.passwordHash, 12);
    }

    return this.usersService.update(id, updateData);
  }

  @Patch(':id/extend-course/:index')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async extendCourse(
    @Param('id') id: string,
    @Param('index') index: number,
    @Body() extensionData: { newEndDate: string; sessionsAdded: number; note?: string }
  ) {
    return this.usersService.extendCourse(id, index, extensionData);
  }

  @Patch(':id/course-level')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async updateCourseLevel(
    @Param('id') id: string,
    @Body() body: { subjectName: string; level: string }
  ) {
    return this.usersService.updateCourseLevel(id, body.subjectName, body.level);
  }

  @Post('batch-attendance')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async updateBatchAttendance(@Body() dto: BatchAttendanceDto) {
    return this.usersService.updateBatchAttendance(dto);
  }

}
