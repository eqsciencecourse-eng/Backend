import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type GradeDocument = Grade & Document;

@Schema()
export class EvaluationSheet {
  @Prop({ required: true })
  name: string; // The custom name, e.g. "Level 1", "Basic Skills"

  @Prop({ required: true })
  config: string; // e.g. "1,10" implying records 1 to 10

  // Flexible storage for scores: { "1": { score: 5 }, "2": { score: 8 } }
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  data: any;
}

@Schema({ timestamps: true })
export class Grade {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  studentId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  teacherId: string;

  @Prop({ required: true })
  subjectId: string;

  @Prop({ required: true })
  subjectName: string;

  // Replaces the old rigid "evaluations" and "levelHistory"
  // NOW: An array of flexible sheets
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  sheets: EvaluationSheet[];

  @Prop({ default: false })
  isComplete: boolean;

  @Prop()
  finalGrade: string;

  @Prop()
  totalScore: number;
}

export const GradeSchema = SchemaFactory.createForClass(Grade);
