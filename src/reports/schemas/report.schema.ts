import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: 'pending' })
  status: 'pending' | 'replied';

  @Prop()
  adminReply: string;

  @Prop()
  repliedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
