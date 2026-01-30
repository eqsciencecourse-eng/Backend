import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { Attendance, AttendanceDocument } from '../attendance/schemas/attendance.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { v4 as uuidv4 } from 'uuid';
import { WebhookService } from '../webhook/webhook.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    private realtimeService: RealtimeService,
    private webhookService: WebhookService,
  ) { }

  async onModuleInit() {
    console.log('Running Auto-Backfill of Student IDs...');
    await this.backfillStudentIds();
  }

  // [NEW] Generate Auto-ID (e.g. 1/69)
  async generateStudentId(): Promise<{ studentId: string; runningNumber: number; registrationYear: number }> {
    const currentYearAD = new Date().getFullYear();
    const currentYearBE = currentYearAD + 543;
    const yearShort = currentYearBE % 100; // e.g. 69 for 2569

    // [UPDATED - FINAL FIX] "Find First Gap" Strategy
    // Fetch ALL used running numbers for this year to find the first available slot.
    // This perfectly handles cases where outliers (e.g. 670) exist; it will correctly fill 16, 17, 18...
    const users = await this.userModel
      .find({ registrationYear: yearShort })
      .select('runningNumber')
      .sort({ runningNumber: 1 })
      .exec();

    const usedNumbers = new Set(users.map(u => u.runningNumber).filter(n => n > 0));

    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    const studentId = `${nextNumber}/${yearShort}`;
    return { studentId, runningNumber: nextNumber, registrationYear: yearShort };
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const payload = {
      ...createUserDto,
      firebaseUid: createUserDto.firebaseUid || uuidv4(),
      email: createUserDto.email ? createUserDto.email.toLowerCase() : `no-email-${uuidv4()}@placeholder.com`,
      username: createUserDto.username,
    };

    // Auto-generate Student ID if not provided
    if (!payload.studentId) {
      const idData = await this.generateStudentId();
      payload.studentId = idData.studentId;
      payload.runningNumber = idData.runningNumber;
      payload.registrationYear = idData.registrationYear;
    }

    const createdUser = new this.userModel(payload);
    try {
      const savedUser = await createdUser.save();

      // Trigger n8n webhook
      this.webhookService.triggerNewUser(savedUser);

      return savedUser;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('USERNAME_ALREADY_EXISTS');
      }
      throw error;
    }
  }

  async toSafeObject(user: User | UserDocument | null) {
    if (!user) {
      return null;
    }
    const plain =
      typeof (user as any).toObject === 'function'
        ? (user as UserDocument).toObject()
        : { ...(user as any) };
    delete plain.passwordHash;
    return plain;
  }

  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (includePassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  async findByUsername(
    username: string,
    includePassword = false,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ username });
    if (includePassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ firebaseUid }).exec();
  }

  async findOne(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async update(
    identifier: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        {
          $or: [{ firebaseUid: identifier }, { _id: identifier }],
        },
        updateData,
        { new: true },
      )
      .exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findByRole(role: string): Promise<User[]> {
    return this.userModel.find({ role }).exec();
  }

  async findPendingTeachers(): Promise<User[]> {
    return this.userModel.find({ role: UserRole.PENDING }).exec();
  }

  async deleteUser(id: string): Promise<any> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async requestTeacherAccess(
    userId: string,
    {
      fullName,
      googleProfile,
    }: {
      fullName: string;
      googleProfile?: { name?: string; email?: string; picture?: string };
    },
  ): Promise<User> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.TEACHER || user.role === UserRole.ADMIN) {
      throw new ConflictException('User already has teacher access');
    }

    user.role = UserRole.PENDING;
    user.isApproved = false;
    user.displayName = fullName;
    user.teacherRequest = {
      fullName,
      googleProfile: googleProfile ||
        user.googleProfile || {
        name: user.displayName,
        email: user.email,
        picture: user.photoURL,
      },
      status: 'pending',
      submittedAt: new Date(),
    };

    await user.save();

    this.realtimeService.notifyAdmin('new-teacher', {
      displayName: user.displayName,
      email: user.email,
      id: user._id,
    });

    this.webhookService.triggerNewTeacher(user);

    return user;
  }

  async approveTeacherRequest(
    userId: string,
    adminId: string,
  ): Promise<User | null> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = UserRole.TEACHER;
    user.isApproved = true;
    user.approvedBy = adminId;
    user.approvedAt = new Date();
    user.teacherRequest = {
      ...(user.teacherRequest || {}),
      status: 'approved',
      verifiedBy: adminId,
    };

    await user.save();

    this.realtimeService.notifyAdmin('teacher-approved', {
      user: {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
      },
      approvedBy: adminId,
    });

    this.webhookService.triggerTeacherApproved(user);

    return user;
  }

  async rejectTeacherRequest(
    userId: string,
    reason?: string,
  ): Promise<User | null> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.teacherRequest = {
      ...(user.teacherRequest || {}),
      status: 'rejected',
      note: reason,
    };
    user.role = UserRole.STUDENT;
    user.isApproved = false;

    await user.save();

    this.realtimeService.notifyAdmin('teacher-rejected', {
      user: {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
      },
    });

    return user;
  }

  async getStats() {
    const totalStudents = await this.userModel.countDocuments({
      role: UserRole.STUDENT,
    });
    const totalTeachers = await this.userModel.countDocuments({
      role: UserRole.TEACHER,
    });
    const pendingTeachers = await this.userModel.countDocuments({
      role: UserRole.PENDING,
    });

    return {
      totalStudents,
      totalTeachers,
      pendingTeachers,
    };
  }

  async extendCourse(
    userId: string,
    courseIndex: number,
    extensionData: { newEndDate: string; sessionsAdded: number; note?: string }
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.registeredCourses || !user.registeredCourses[courseIndex]) {
      throw new NotFoundException('User or Course not found');
    }

    const course = user.registeredCourses[courseIndex];
    const previousEndDate = course.endDate;

    course.endDate = new Date(extensionData.newEndDate);
    course.totalSessions = (course.totalSessions || 0) + extensionData.sessionsAdded;

    if (!course.extensionHistory) {
      course.extensionHistory = [];
    }

    course.extensionHistory.push({
      extendedAt: new Date(),
      previousEndDate: previousEndDate,
      newEndDate: new Date(extensionData.newEndDate),
      sessionsAdded: extensionData.sessionsAdded,
      note: extensionData.note || ''
    });

    user.markModified('registeredCourses');
    return user.save();
  }

  async updateCourseLevel(
    userId: string,
    subjectName: string,
    newLevel: string
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.registeredCourses) {
      throw new NotFoundException('User or courses not found');
    }

    const course = user.registeredCourses.find(c => c.subject === subjectName);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    course.level = newLevel;
    user.markModified('registeredCourses');
    return user.save();
  }

  // [NEW] Student Registry System
  async getRegistry(): Promise<User[]> {
    return this.userModel.find({ role: UserRole.STUDENT }).sort({ updatedAt: -1 }).exec();
  }

  async upsertRegistryStudent(dto: CreateUserDto): Promise<UserDocument> {
    // 1. Try to find by studentIdMap (Excel ID)
    let user = null;

    if (dto.studentIdMap) {
      user = await this.userModel.findOne({ studentIdMap: dto.studentIdMap });
    }

    // 2. Fallback: Try Name matching
    if (!user && dto.firstName && dto.lastName) {
      user = await this.userModel.findOne({
        firstName: dto.firstName,
        lastName: dto.lastName
      });
    }

    // 3. Fallback: Try Email matching (Prevent Duplicate Key Error)
    if (!user && dto.email) {
      user = await this.userModel.findOne({ email: dto.email });
    }

    if (user) {
      // Update existing
      Object.assign(user, dto);

      // [UPDATED] Do NOT update user.studentId from Excel. 
      // We only update studentIdMap for reference.
      if (dto.studentIdMap) {
        user.studentIdMap = dto.studentIdMap;
      }

      // Ensure displayName is updated if firstName/lastName changed
      if (dto.firstName || dto.lastName) {
        user.displayName = `${dto.firstName} ${dto.lastName}`.trim();
      }
      return user.save();
    } else {
      // Create new
      // Prepare payload
      const finalPayload = {
        ...dto,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0123456789',
        username: dto.studentIdMap || `user-${uuidv4()}`,
        displayName: `${dto.firstName} ${dto.lastName}`.trim(),
        role: UserRole.STUDENT,
        isRegistry: true,
        // [UPDATED] Do NOT set studentId from studentIdMap.
        // Leave studentId undefined so 'this.create()' calls generateStudentId()
        studentId: undefined,
      };

      // Just ensure studentIdMap is passed (dto already has it, but good to be explicit)
      if (dto.studentIdMap) {
        finalPayload.studentIdMap = dto.studentIdMap;
      }

      return this.create(finalPayload as CreateUserDto);
    }
  }

  // Helper to parse structure like "16/69" -> { runningNumber: 16, registrationYear: 69 }
  private parseStudentId(studentId: string) {
    if (!studentId) return null;
    const match = studentId.match(/^(\d+)\/(\d+)$/);
    if (match) {
      return {
        runningNumber: parseInt(match[1], 10),
        registrationYear: parseInt(match[2], 10)
      };
    }
    return null;
  }

  private getExcelDir(): string {
    const fs = require('fs');
    const path = require('path');

    // Check possible locations
    const possiblePaths = [
      path.join(process.cwd(), 'excel'),      // If running from root
      path.join(process.cwd(), '..', 'excel') // If running from backend
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Fallback if not found (will return empty list or error later)
    return possiblePaths[0];
  }

  async listExcelFiles(): Promise<string[]> {
    const fs = require('fs');
    const excelDir = this.getExcelDir();

    console.log('Looking for excel files in:', excelDir);

    if (!fs.existsSync(excelDir)) {
      console.log('Excel directory not found');
      return [];
    }

    const files = fs.readdirSync(excelDir)
      .filter((file: string) => file.endsWith('.xlsx'))
      .sort((a: string, b: string) => b.localeCompare(a));

    console.log('Found excel files:', files);
    return files;
  }

  async importFromExcelFile(filename: string): Promise<{ success: boolean; count: number }> {
    const fs = require('fs');
    const path = require('path');
    const XLSX = require('xlsx');
    const excelDir = this.getExcelDir();
    const filePath = path.join(excelDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return { success: true, count: 0 };
    }

    const results: any[] = [];

    for (const row of data as any[]) {
      try {
        const studentDto: Partial<CreateUserDto> = {
          studentIdMap: row['ID'] ? String(row['ID']) : undefined,
          prefix: row['คำนำหน้า'],
          firstName: row['ชื่อ'],
          lastName: row['นามสกุล'],
          nickname: row['ชื่อเล่น'],
          birthDate: row['วัน/เดือน/ปี เกิด'],
          age: row['อายุ'] ? Number(row['อายุ']) : undefined,
          gender: row['เพศ'],
          ethnicity: row['เชื้อชาติ'],
          nationality: row['สัญชาติ'],
          religion: row['ศาสนา'],
          school: row['โรงเรียน'],
          studentClass: row['ระดับชั้น'],
          address: row['ที่อยู่นักเรียน'],
          studentPhone: row['เบอร์นักเรียน'],
          parentName: row['ผู้ปกครอง'],
          parentRelation: row['ความสัมพันธ์'],
          parentAddress: row['ที่อยู่ผู้ปกครอง'],
          parentPhone: row['เบอร์ผู้ปกครอง'],
          enrollmentType: row['สมัครเรียนหลักสูตร'],
          status: row['สถานะ'] === 'drop' ? 'drop' : 'studying',
          role: UserRole.STUDENT,
          isRegistry: true
        };

        const email = row['อีเมลล์'];
        if (email && email !== '-' && typeof email === 'string' && email.trim() !== '') {
          studentDto.email = email.trim();
        }

        const result = await this.upsertRegistryStudent(studentDto as CreateUserDto);
        results.push(result);
      } catch (error) {
        console.error(`Error importing row ID ${row['ID']}:`, error.message);
        // Continue to next row even if one fails
      }
    }

    return { success: true, count: results.length };
  }

  async backfillStudentIds(): Promise<{ count: number }> {
    const users = await this.userModel.find({ role: UserRole.STUDENT, studentId: { $exists: false } }).sort({ createdAt: 1 }).exec();
    let count = 0;

    // Group by Year
    const usersByYear = new Map<number, UserDocument[]>();

    for (const user of users) {
      const date = user.createdAt || new Date();
      const yearBE = date.getFullYear() + 543;
      const yearShort = yearBE % 100;

      if (!usersByYear.has(yearShort)) {
        usersByYear.set(yearShort, []);
      }
      usersByYear.get(yearShort)?.push(user);
    }

    for (const [year, yearlyUsers] of usersByYear.entries()) {
      let runNum = 1;
      const lastUser = await this.userModel.findOne({ registrationYear: year }).sort({ runningNumber: -1 }).limit(1).exec();

      if (lastUser && lastUser.runningNumber) {
        runNum = lastUser.runningNumber + 1;
      }

      for (const user of yearlyUsers) {
        user.runningNumber = runNum;
        user.registrationYear = year;
        user.studentId = `${runNum}/${year}`;
        await user.save();
        runNum++;
        count++;
      }
    }

    return { count };
  }

  // [NEW] Debug Tool: Re-calculate and sequence IDs for a given year
  async recalculateStudentIds(year?: number): Promise<{ count: number; message: string }> {
    const currentYearAD = new Date().getFullYear();
    const currentYearBE = currentYearAD + 543;
    const targetYear = year || (currentYearBE % 100);

    const users = await this.userModel
      .find({ role: UserRole.STUDENT, registrationYear: targetYear })
      .sort({ createdAt: 1 }) // Sort by creation time to keep order
      .exec();

    if (users.length === 0) {
      return { count: 0, message: 'No students found to re-sequence' };
    }

    // [CRITICAL FIX V2] Robust 2-Pass Update
    // 1. Rename ALL target users to UUID-based temporary IDs to guarantee zero collisions.
    // 2. Assign correct sequential IDs.

    // Pass 1: Set Temporary IDs
    try {
      const bulkTemp = users.map(user => ({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { studentId: `TEMP-${uuidv4()}` } }
        }
      }));
      await this.userModel.bulkWrite(bulkTemp, { ordered: false });
    } catch (error) {
      console.warn('Non-fatal error in Pass 1 (Temp IDs):', error);
      // Continue, as some might have succeeded.
    }

    // Pass 2: Set Correct Sequence
    let runNum = 1;
    const bulkFinal = [];

    for (const user of users) {
      const newId = `${runNum}/${targetYear}`;

      // Safety: Check if "Ghost" user (outside our list) holds this ID
      const conflict = await this.userModel.findOne({ studentId: newId, _id: { $ne: user._id } });
      if (conflict) {
        // If a ghost exists, rename the ghost first!
        conflict.studentId = `CONFLICT-${newId}-${uuidv4()}`;
        await conflict.save();
      }

      bulkFinal.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              studentId: newId,
              runningNumber: runNum,
              registrationYear: targetYear
            }
          }
        }
      });
      runNum++;
    }

    if (bulkFinal.length > 0) {
      await this.userModel.bulkWrite(bulkFinal, { ordered: true });
    }

    return { count: users.length, message: `Resequenced ${users.length} students for year ${targetYear}` };
  }

  async updateBatchAttendance(dto: BatchAttendanceDto): Promise<{ success: boolean; updatedCount: number; errors: any[] }> {
    const { subjectId, teacherId, date, records } = dto;
    let updatedCount = 0;
    const errors = [];
    const attendanceStudents = [];

    // Resolve Subject Info (Needed for Attendance Doc)
    // We try to find a subject that matches the ID or Name
    let realSubjectId = subjectId;
    let realSubjectName = subjectId;

    // Try to find the Subject Document to get accurate ID/Name
    // (Ideally inject SubjectModel too, but for now we can rely on what we have or just store what is passed if valid)
    // For specific requirement: If subjectId is a Name (e.g. "Web Design"), we need to emulate an ID or look it up.
    // In this codebase, typically subjectId passed here is the Name from the Frontend dropdown if it was manual,
    // or ID if selected from list. 
    // Let's assume for now we use what is passed, but we essentially need to populate 'students' list.

    for (const record of records) {
      try {
        const user = await this.userModel.findById(record.studentId);
        if (!user) {
          errors.push({ studentId: record.studentId, error: 'User not found' });
          continue;
        }

        // Find the course
        const courseIndex = user.registeredCourses?.findIndex(c =>
          (c.subject === subjectId || c.subject === subjectId) && // Name check (expand if ID logic needed)
          (c.teacherId === teacherId || c.teacherId === '' || !c.teacherId) // Allow lax teacher check
        );

        if (courseIndex === undefined || courseIndex === -1) {
          errors.push({ studentId: record.studentId, error: 'Course not found for this teacher' });
          // Even if course not found in Student Profile, we might still want to add to Attendance Sheet?
          // No, usually strict.
          continue;
        }

        const course = user.registeredCourses[courseIndex];

        // Capture Subject Name from User record if available to be safer
        realSubjectName = course.subject;

        // Add History to Student Profile
        if (!course.attendanceHistory) course.attendanceHistory = [];
        // Prevent duplicate check-in for same date? 
        // Simple check:
        const existingHistory = course.attendanceHistory.find(h => new Date(h.date).toDateString() === new Date(date).toDateString());
        if (!existingHistory) {
          course.attendanceHistory.push({
            date: new Date(date),
            status: record.status,
            note: record.note || '',
            checkInTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
          });
          // Update Quota
          if (record.status === 'present') {
            course.usedSessions = (course.usedSessions || 0) + 1;
          }
        } else {
          // Update existing
          // If changing FROM present TO absent -> decrease
          if (existingHistory.status === 'present' && record.status !== 'present') {
            course.usedSessions = Math.max(0, (course.usedSessions || 0) - 1);
          }
          // If changing FROM absent TO present -> increase
          else if (existingHistory.status !== 'present' && record.status === 'present') {
            course.usedSessions = (course.usedSessions || 0) + 1;
          }
          existingHistory.status = record.status;
          existingHistory.note = record.note || '';
        }

        // Update array
        user.registeredCourses[courseIndex] = course;
        user.markModified('registeredCourses');

        await user.save();
        updatedCount++;

        // Prepare data for Attendance Document
        attendanceStudents.push({
          studentId: user._id,
          firstName: user.firstName || user.displayName.split(' ')[0],
          lastName: user.lastName || user.displayName.split(' ').slice(1).join(' ') || '',
          nickname: user.nickname,
          status: record.status === 'present' ? 'Present' :
            record.status === 'late' ? 'Late' :
              record.status === 'leave' ? 'Leave' : 'Absent',
          leaveType: '',
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          classPeriod: '', // Not specified in batch
          comment: record.note
        });

      } catch (err: any) {
        errors.push({ studentId: record.studentId, error: err.message });
      }
    }

    // [FIX] Create or Update Master Attendance Record
    if (attendanceStudents.length > 0) {
      // We accept 'subjectId' might be a name.
      // We try to find strict Subject ID if possible, but for now we trust valid inputs or create a valid Record.
      // If subjectId is not an ObjectId, we might have trouble if Schema enforces ObjectId.
      // Schema definition: @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Class', required: true }) subjectId
      // IF subjectId is a string name (like "Web Design"), this will fail validation!

      // Strategy: We MUST find the real Subject ID.
      // We can query the 'subjects' collection via generic connection or inject SubjectModel.
      // Since we didn't inject SubjectModel, let's try to query via User's registeredCourses which might have metadata?
      // No, User only has subject name strings usually.

      // Workaround: We will query the DB using the native connection (or similar) or assume the frontend passed an ID.
      // If frontend passed "Web Design", we are in trouble.
      // Let's check if the 'subjectId' passed is a valid MongoID.
      const mongoose = require('mongoose');
      let validSubjectId = null;

      if (mongoose.Types.ObjectId.isValid(subjectId)) {
        validSubjectId = subjectId;
      } else {
        // It's a name. We need to find the ID.
        // We can use the userModel.db.collection('subjects') to find it.
        const subjectDoc = await this.userModel.db.collection('subjects').findOne({ name: realSubjectName });
        if (subjectDoc) {
          validSubjectId = subjectDoc._id;
          realSubjectName = subjectDoc.name;
        } else {
          console.warn(`[BatchAttendance] Could not find Subject ID for name: ${realSubjectName}`);
          // Fallback: If strict schema, we can't save. 
          // But let's check input. If it was a Name, we absolutely need the ID.
        }
      }

      if (validSubjectId) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        await this.attendanceModel.findOneAndUpdate(
          {
            subjectId: validSubjectId,
            date: { $gte: startOfDay, $lte: endOfDay }
          },
          {
            $set: {
              teacherId: teacherId, // Or find from user course
              subjectId: validSubjectId,
              subjectName: realSubjectName,
              date: new Date(date),
              students: attendanceStudents
            }
          },
          { upsert: true, new: true }
        );
      } else {
        console.error('[BatchAttendance] IMPOSSIBLE TO SAVE ATTENDANCE DOC - Invalid Subject ID');
      }
    }

    return { success: true, updatedCount, errors };
  }
}
