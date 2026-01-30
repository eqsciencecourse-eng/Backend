import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Schedule, ScheduleDocument } from './schemas/schedule.schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(Schedule.name) private scheduleModel: Model<ScheduleDocument>,
    private realtimeService: RealtimeService,
  ) {}

  async createOrUpdate(
    createScheduleDto: CreateScheduleDto,
  ): Promise<Schedule> {
    const { teacherId, day, timeSlot } = createScheduleDto;

    // Find existing schedule for this slot
    const existingSchedule = await this.scheduleModel.findOne({
      teacherId,
      day,
      timeSlot,
    });

    if (existingSchedule) {
      // Update existing
      existingSchedule.subject = createScheduleDto.subject;
      existingSchedule.teacherName = createScheduleDto.teacherName;
      return existingSchedule.save();
    } else {
      // Create new
      const newSchedule = new this.scheduleModel(createScheduleDto);
      return newSchedule.save();
    }
  }

  async findAllByTeacher(teacherId: string): Promise<Schedule[]> {
    return this.scheduleModel.find({ teacherId }).exec();
  }

  async remove(teacherId: string, day: string, timeSlot: string): Promise<any> {
    return this.scheduleModel
      .findOneAndDelete({ teacherId, day, timeSlot })
      .exec();
  }

  async notifyStudents(teacherId: string, day: string, schedules: Schedule[]) {
    // Notify via Firebase
    this.realtimeService.updateSchedule(teacherId, {
      day,
      schedules,
      timestamp: Date.now(),
    });
  }

  async replaceSchedule(
    teacherId: string,
    schedules: CreateScheduleDto[],
  ): Promise<any> {
    // Delete all existing schedules for this teacher
    await this.scheduleModel.deleteMany({ teacherId }).exec();

    // Insert new ones
    if (schedules.length > 0) {
      return this.scheduleModel.insertMany(schedules);
    }
    return [];
  }
}
