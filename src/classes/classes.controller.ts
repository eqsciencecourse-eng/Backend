import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ClassesService } from './classes.service';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // --- Class Requests API ---

  @Post('requests')
  @UseGuards(RequireAuthGuard)
  async createRequest(
    @Request() req: ExpressRequest & { user: any },
    @Body()
    body: { subjectName: string; studyTime: string; parentPhone: string },
  ) {
    // req.user is the Mongoose User Document populated by RequireAuthGuard
    const user = req.user;
    return this.classesService.createRequest({
      studentId: user._id.toString(),
      studentName: user.studentName || user.displayName || 'Student',
      subjectName: body.subjectName,
      studyTime: body.studyTime,
      parentPhone: body.parentPhone,
    });
  }

  @Get('requests/pending')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getPendingRequests() {
    return this.classesService.getPendingRequests();
  }

  @Patch('requests/:id/approve')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveRequest(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: any },
  ) {
    const user = req.user;
    return this.classesService.approveRequest(id, user._id.toString());
  }

  @Patch('requests/:id/reject')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectRequest(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: any },
  ) {
    const user = req.user;
    return this.classesService.rejectRequest(id, user._id.toString());
  }

  // --- Existing CRUD ---

  @Post()
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createClassDto: any) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  findAll() {
    return this.classesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateClassDto: any) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
