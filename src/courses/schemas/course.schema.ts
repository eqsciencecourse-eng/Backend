import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subject', required: true })
    subjectId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Class', required: true })
    classId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    teacherId: string;

    @Prop({ required: true }) // e.g., "1/2567"
    semester: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({
        type: [{
            day: String, // "Monday"
            startTime: String, // "08:30"
            endTime: String // "10:30"
        }],
        default: []
    })
    schedule: { day: string; startTime: string; endTime: string }[];
}

export const CourseSchema = SchemaFactory.createForClass(Course);

// Compound Index: A class can only have one course for a subject per semester (usually)
CourseSchema.index({ classId: 1, subjectId: 1, semester: 1 }, { unique: true });
