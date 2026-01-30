import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ScheduleDocument = Schedule & Document;

@Schema({ timestamps: true })
export class Schedule {
  @Prop({ required: true })
  teacherId: string;

  @Prop({ required: true })
  teacherName: string;

  @Prop({ required: true })
  day: string; // Monday, Tuesday, etc.

  @Prop({ required: true })
  timeSlot: string; // 10:00-12:00, etc.

  @Prop({ required: true })
  subject: string;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
