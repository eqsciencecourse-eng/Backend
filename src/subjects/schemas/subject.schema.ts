import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubjectDocument = Subject & Document;

@Schema({ timestamps: true })
export class Subject {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop({
    type: [{
      name: { type: String, required: true },
      subLevels: { type: [String], default: [] }
    }],
    default: []
  })
  levels: { name: string; subLevels: string[] }[];
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
