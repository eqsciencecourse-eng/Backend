import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('schedules')
@UseGuards(RequireAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async create(@Body() createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.createOrUpdate(createScheduleDto);
  }

  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async bulkUpdate(
    @Body() body: { teacherId: string; schedules: CreateScheduleDto[] },
  ) {
    return this.schedulesService.replaceSchedule(
      body.teacherId,
      body.schedules,
    );
  }

  @Get(':teacherId')
  async findAll(@Param('teacherId') teacherId: string) {
    return this.schedulesService.findAllByTeacher(teacherId);
  }

  @Delete(':teacherId/:day/:timeSlot')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(
    @Param('teacherId') teacherId: string,
    @Param('day') day: string,
    @Param('timeSlot') timeSlot: string,
  ) {
    return this.schedulesService.remove(teacherId, day, timeSlot);
  }

  @Post('notify/:teacherId/:day')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async notify(
    @Param('teacherId') teacherId: string,
    @Param('day') day: string,
    @Body() body: { schedules: any[] },
  ) {
    return this.schedulesService.notifyStudents(teacherId, day, body.schedules);
  }
}
