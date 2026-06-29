import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type GradeStructureDocument = GradeStructure & Document;

@Schema()
export class GradeColumn {
  @Prop({ required: true })
  id: string; // Unique ID for the column (e.g., 'col_1')

  @Prop({ required: true })
  title: string; // Title (e.g., 'Midterm', 'Assignment 1')

  @Prop({ required: true })
  maxScore: number; // Maximum raw score (e.g., 50)

  @Prop({ required: true })
  weight: number; // Weight percentage (e.g., 20 for 20%)
}

@Schema({ timestamps: true })
export class GradeStructure {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  teacherId: string;

  @Prop({ required: true })
  subjectId: string;

  @Prop({ required: false })
  classId: string; // Optional: If grades are separated by class

  @Prop({ type: [GradeColumn], default: [] })
  columns: GradeColumn[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: { A: 80, 'B+': 75, B: 70, 'C+': 65, C: 60, 'D+': 55, D: 50, F: 0 } })
  gradeMapping: Record<string, number>; // Cutoff scores for grades
}

export const GradeStructureSchema = SchemaFactory.createForClass(GradeStructure);
