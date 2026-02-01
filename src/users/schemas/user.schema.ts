import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  PENDING = 'pending',
}

@Schema({ timestamps: true })
export class User {
  _id: string;

  @Prop({ required: false, unique: true, sparse: true })
  email?: string;

  @Prop({ required: true, unique: true })
  firebaseUid: string;

  @Prop({ unique: true, sparse: true })
  username?: string;

  @Prop({ unique: true, sparse: true })
  lineUserId?: string; // [NEW] Line Messaging API User ID

  @Prop({ select: false })
  passwordHash: string;

  @Prop({ select: false })
  plainPassword?: string; // [NEW] Unencrypted password for Admin viewing

  @Prop()
  displayName: string;

  @Prop()
  photoURL: string;

  @Prop({ default: false })
  isProfileImageChanged: boolean;

  @Prop()
  studentIdMap: string; // [NEW POINTER] Original ID from Excel

  @Prop({ unique: true, sparse: true })
  studentId: string; // [NEW] Auto-generated ID (e.g. 1/69)

  @Prop({ index: true })
  runningNumber: number; // [NEW] Sequence number (e.g. 1)

  @Prop({ index: true })
  registrationYear: number; // [NEW] BE Year 2-digits (e.g. 69)

  @Prop()
  prefix: string; // [NEW] คำนำหน้า

  @Prop()
  firstName: string; // [NEW] ชื่อ (separate from displayName)

  @Prop()
  lastName: string; // [NEW] นามสกุล

  @Prop()
  studentName: string; // [Legacy/Compat]

  @Prop()
  nickname: string; // [NEW]

  @Prop()
  birthDate: string; // [NEW] วันเกิด (Keep as string for Excel compatibility "DD/MM/YYYY")

  @Prop()
  age: number; // [NEW] อายุ

  @Prop()
  gender: string; // [NEW] เพศ

  @Prop()
  ethnicity: string; // [NEW] เชื้อชาติ

  @Prop()
  nationality: string; // [NEW] สัญชาติ

  @Prop()
  religion: string; // [NEW] ศาสนา

  @Prop()
  studentPhone: string; // [NEW] เบอร์นักเรียน

  @Prop()
  address: string; // [NEW] ที่อยู่นักเรียน

  @Prop()
  parentName: string;

  @Prop()
  parentRelation: string; // [NEW] ความสัมพันธ์

  @Prop()
  studentEvaluations: {
    recordedAt: Date;
    teacherId: string;
    teacherName: string;
    scores: {
      creativity: number;
      planning: number;
      problemSolving: number;
      design: number;
      programming: number;
      focus: number;
    }
  }[];

  @Prop()
  parentPhone: string; // [NEW] เบอร์ผู้ปกครอง

  @Prop()
  parentAddress: string; // [NEW] ที่อยู่ผู้ปกครอง

  @Prop()
  enrollmentType: string; // [NEW] สมัครเรียนหลักสูตร

  @Prop()
  studentClass: string;

  @Prop()
  educationLevel: string;

  @Prop()
  school: string;

  @Prop({ type: [String], default: [] })
  enrolledSubjects: string[];

  @Prop({ type: [String], default: [] })
  studyTimes: string[];

  @Prop({ type: [String], default: [] })
  authorizedSubjects: string[];

  @Prop({ default: false })
  isApproved: boolean;

  @Prop({ default: false })
  isTeacherProfileComplete: boolean;

  @Prop()
  approvalToken: string;

  @Prop()
  approvedBy: string;

  @Prop()
  approvedAt: Date;

  @Prop({ required: true, enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Prop({ enum: ['studying', 'drop', 'resigned', 'graduated'], default: 'studying' })
  status: string;

  @Prop()
  statusNote: string; // [NEW] Reason for status change (e.g. why dropped)

  @Prop()
  startDate: Date; // [NEW]

  @Prop()
  endDate: Date; // [NEW]

  @Prop()
  assignedTeacherId: string; // [NEW] ID of the teacher responsible for this student

  @Prop({ default: false })
  isRegistry: boolean; // [NEW] Flag for Registry Imported Users

  @Prop({ type: Object, default: null })
  googleProfile?: {
    name?: string;
    picture?: string;
    email?: string;
  } | null;

  @Prop({ type: Object, default: null })
  teacherRequest?: {
    fullName?: string;
    googleProfile?: {
      name?: string;
      email?: string;
      picture?: string;
    };
    note?: string;
    status?: 'pending' | 'approved' | 'rejected';
    submittedAt?: Date;
    verifiedBy?: string;
  } | null;

  @Prop({
    type: [
      {
        className: { type: String, required: true },
        classTime: { type: String, default: '' },
      },
    ],
    default: [],
  })
  registeredClasses: {
    className: string;
    classTime: string;
  }[];

  // [NEW PHASE 16] Detailed Course Registration
  @Prop({
    type: [
      {
        subject: { type: String, required: true },
        teacherId: { type: String, default: '' }, // Store Teacher ID
        teacherName: { type: String, default: '' }, // Store Teacher Name for easier display
        day: { type: String, default: '' },
        time: { type: String, default: '' },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        level: { type: String, enum: ['Basic', 'Intermediate', 'Advanced'], default: 'Basic' }, // [NEW] Student Level
        totalSessions: { type: Number, default: 0 },
        usedSessions: { type: Number, default: 0 },
        status: { type: String, enum: ['active', 'drop', 'graduated', 'resigned'], default: 'active' }, // [NEW] Per-course status
        extensionHistory: {
          type: [{
            extendedAt: { type: Date, default: Date.now },
            previousEndDate: { type: Date },
            newEndDate: { type: Date },
            sessionsAdded: { type: Number, default: 0 },
            note: { type: String, default: '' },
          }],
          default: []
        },
        attendanceHistory: {
          type: [{
            date: { type: Date, default: Date.now },
            status: { type: String, enum: ['present', 'absent', 'sick', 'leave'], default: 'present' },
            note: { type: String, default: '' },
            checkInTime: { type: String, default: '' } // HH:MM
          }],
          default: []
        }
      },
    ],
    default: [],
  })
  registeredCourses: {
    subject: string;
    teacherId?: string; // [NEW]
    teacherName: string;
    day: string;
    time: string;
    startDate: Date;
    endDate: Date;
    level?: string;
    totalSessions: number;
    usedSessions: number;
    extensionHistory?: {
      extendedAt: Date;
      previousEndDate: Date;
      newEndDate: Date;
      sessionsAdded: number;
      note: string;
    }[];
    attendanceHistory?: { // [NEW]
      date: Date;
      status: string;
      note: string;
      checkInTime: string;
    }[];
  }[];

  // [NEW ARCHITECTURE] Direct link to Class Entity
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Class' })
  classId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
