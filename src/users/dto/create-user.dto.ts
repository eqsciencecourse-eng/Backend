import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsArray,
  IsDate,
} from 'class-validator';
import { UserRole } from '../schemas/user.schema';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  firebaseUid?: string;

  @IsString()
  @IsOptional()
  passwordHash?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  photoURL?: string;

  @IsString()
  @IsOptional()
  parentName?: string;

  @IsString()
  @IsOptional()
  studentName?: string;

  // [NEW] Student Registry Fields
  @IsString() @IsOptional() studentIdMap?: string;
  @IsString() @IsOptional() prefix?: string;
  @IsString() @IsOptional() firstName?: string;
  @IsString() @IsOptional() lastName?: string;
  @IsString() @IsOptional() birthDate?: string;
  @IsOptional() age?: number;
  @IsString() @IsOptional() gender?: string;
  @IsString() @IsOptional() ethnicity?: string;
  @IsString() @IsOptional() nationality?: string;
  @IsString() @IsOptional() religion?: string;
  @IsString() @IsOptional() studentPhone?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() parentRelation?: string;
  @IsString() @IsOptional() parentPhone?: string;
  @IsString() @IsOptional() parentAddress?: string;
  @IsString() @IsOptional() enrollmentType?: string;
  @IsBoolean() @IsOptional() isRegistry?: boolean;
  @IsString() @IsOptional() status?: 'studying' | 'drop' | 'resigned' | 'graduated';

  // [NEW] Auto-Generated Fields (Optional in DTO because usually system-generated)
  @IsString() @IsOptional() studentId?: string;
  @IsOptional() runningNumber?: number;
  @IsOptional() registrationYear?: number;



  @IsString()
  @IsOptional()
  nickname?: string;

  @IsString()
  @IsOptional()
  studentClass?: string;

  @IsString()
  @IsOptional()
  school?: string;

  @IsString()
  @IsOptional()
  educationLevel?: string;

  @IsArray()
  @IsOptional()
  enrolledSubjects?: string[];

  @IsArray()
  @IsOptional()
  studyTimes?: string[];

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  isApproved?: boolean;

  @IsString()
  @IsOptional()
  statusNote?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsString()
  @IsOptional()
  assignedTeacherId?: string;

  @IsArray()
  @IsOptional()
  registeredCourses?: {
    subject: string;
    teacherId: string;
    teacherName: string;
    day: string;
    time: string;
    startDate: Date;
    endDate?: Date;
    totalSessions?: number;
  }[];
}
