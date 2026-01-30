import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ClassRequestDocument = ClassRequest & Document;

@Schema({ timestamps: true })
export class ClassRequest {
  @Prop({ required: true })
  studentId: string;

  @Prop({ required: true })
  studentName: string;

  @Prop({ required: true })
  subjectName: string;

  @Prop({ required: true })
  studyTime: string;

  @Prop({ required: true })
  parentPhone: string;

  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected'] })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  actionBy: string | null;
}

export const ClassRequestSchema = SchemaFactory.createForClass(ClassRequest);
