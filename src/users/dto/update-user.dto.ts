import { UserRole } from '../schemas/user.schema';

export class UpdateUserDto {
  role?: UserRole;
  parentName?: string;
  studentName?: string;
  studentClass?: string;
  photoURL?: string;
  authorizedSubjects?: string[];
  status?: string;
  educationLevel?: string;
  school?: string;
  enrolledSubjects?: string[];
  studyTimes?: string[];
  registeredClasses?: { className: string; classTime: string; }[];
  username?: string;
  passwordHash?: string;
  statusNote?: string;
  startDate?: Date;
  endDate?: Date;
  assignedTeacherId?: string;
  registeredCourses?: {
    subject: string;
    teacherId: string;
    teacherName: string;
    day: string;
    time: string;
    startDate: Date;
    endDate: Date;
  }[];
}
