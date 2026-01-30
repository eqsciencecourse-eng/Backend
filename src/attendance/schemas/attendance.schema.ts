
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    teacherId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Class', required: true })
    subjectId: string;

    @Prop({ required: true })
    subjectName: string;

    @Prop({ required: true })
    date: Date;

    @Prop({
        type: [{
            studentId: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            nickname: String,
            status: { type: String, enum: ['Present', 'Late', 'Leave', 'Absent'], required: true },
            leaveType: String, // Sick, Business, etc.
            time: String, // HH:MM
            classPeriod: String,
            comment: String
        }],
        default: []
    })
    students: {
        studentId: string;
        firstName: string;
        lastName: string;
        nickname?: string;
        status: string;
        leaveType?: string;
        time?: string;
        comment?: string;
    }[];
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Compound index to prevent duplicate attendance for same subject/date
AttendanceSchema.index({ subjectId: 1, date: 1 }, { unique: true });
