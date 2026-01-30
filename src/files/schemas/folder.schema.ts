import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type FolderDocument = Folder & Document;

@Schema({ timestamps: true })
export class Folder {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  creatorId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Folder', default: null })
  parentId: string | null;

  @Prop()
  driveId: string; // Google Drive Folder ID

  @Prop({ default: [] })
  path: { id: string; name: string }[];
}

export const FolderSchema = SchemaFactory.createForClass(Folder);
