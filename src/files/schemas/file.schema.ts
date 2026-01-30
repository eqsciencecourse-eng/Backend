import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FileDocument = File & Document;

@Schema({ timestamps: true })
export class File {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimetype: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: String, default: null })
  path: string | null;

  @Prop({ type: String, default: null })
  driveId: string | null;

  @Prop({ type: String, default: null })
  webViewLink: string | null;

  @Prop({ type: String, default: null })
  webContentLink: string | null;

  @Prop({ type: String, default: null })
  thumbnailLink: string | null;

  @Prop({ required: true })
  uploaderId: string;

  @Prop({ required: true })
  recipientId: string;

  @Prop({ type: String, default: null })
  folderId: string | null;

  @Prop({ type: String, default: 'general', enum: ['general', 'grade_image'] })
  category: string;
}

export const FileSchema = SchemaFactory.createForClass(File);
