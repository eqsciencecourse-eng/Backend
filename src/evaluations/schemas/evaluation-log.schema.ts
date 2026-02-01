import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EvaluationLogDocument = EvaluationLog & Document;

@Schema({ timestamps: true })
export class EvaluationLog {
    @Prop({ required: true })
    studentId: string;

    @Prop({ required: true })
    teacherId: string;

    @Prop({ required: true })
    subjectId: string;

    @Prop({ required: true })
    date: Date;

    @Prop({ type: Object, required: true })
    scores: {
        creativity: number;
        planning: number;
        problemSolving: number;
        design: number;
        programming: number;
        focus: number;
    };
}

export const EvaluationLogSchema = SchemaFactory.createForClass(EvaluationLog);
