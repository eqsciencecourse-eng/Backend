import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SchoolDocument = School & Document;

@Schema({ timestamps: true })
export class School {
  @Prop({ required: true, index: true })
  name: string;

  @Prop()
  province: string;

  @Prop()
  district: string;

  @Prop()
  subdistrict: string;

  @Prop()
  school_type: string; // e.g., 'government', 'private'
}

export const SchoolSchema = SchemaFactory.createForClass(School);
