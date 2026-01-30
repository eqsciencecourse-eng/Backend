
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
    @Prop({ required: true, unique: true })
    receiveId: string;

    @Prop({ required: true })
    customerName: string;

    @Prop({ required: true })
    paymentDate: Date;

    @Prop({ required: true })
    amount: number;

    @Prop()
    bank: string;

    @Prop()
    classLevel: string; // "class" in PHP

    @Prop()
    periodStart: Date; // "date_start"

    @Prop()
    periodEnd: Date; // "date_end"

    @Prop()
    paymentTime: string;

    @Prop()
    slipUrl: string; // "slip_path"

    // Optional: Link to a User if needed later
    // @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    // userId: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
