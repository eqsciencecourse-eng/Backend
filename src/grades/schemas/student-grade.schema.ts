import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StudentGradeDocument = StudentGrade & Document;

@Schema({ timestamps: true })
export class StudentGrade {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  studentId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  teacherId: string;

  @Prop({ required: true })
  subjectId: string;

  @Prop({ required: false })
  classId: string;

  // Key-value pairs: columnId -> raw score (e.g. { "col_1": 45, "col_2": 8 })
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  scores: Record<string, number>;

  // Optional: Calculated properties (usually computed on-the-fly, but can be cached here)
  @Prop({ required: false })
  totalPercentage: number;

  @Prop({ required: false })
  calculatedGrade: string;

  @Prop({ default: false })
  isComplete: boolean;

  @Prop()
  teacherRemark: string;

  @Prop()
  certificateURL: string;

  @Prop()
  certificateIssuedAt: Date;

  @Prop()
  level: string;

  @Prop()
  subLevel: string;
}

export const StudentGradeSchema = SchemaFactory.createForClass(StudentGrade);
