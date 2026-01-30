import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ClassDocument = Class & Document;

@Schema({ timestamps: true })
export class Class {
  @Prop({ required: true, unique: true })
  name: string; // e.g., "M.1/1"

  @Prop()
  description: string;

  @Prop()
  level: string; // e.g., "Secondary"

  @Prop({ default: new Date().getFullYear().toString() })
  academicYear: string; // e.g., "2567"

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  advisor: string; // Teacher Advisor

  @Prop({ type: [String], default: [] })
  subjects: string[]; // KEEP for backward compat (migration), but prefer Course entity later
}

export const ClassSchema = SchemaFactory.createForClass(Class);
