
import { Injectable, NotFoundException, BadRequestException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AttendanceService implements OnModuleInit {
    private qrSessions = new Map<string, {
        teacherId: string;
        subjectId: string;
        subjectName: string;
        date: string;
        time: string;
        expiresAt: number;
    }>();

    constructor(
        @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectConnection() private connection: Connection
    ) { }

    async onModuleInit() {
        try {
            const collection = this.connection.collection('attendances');
            const indexes = await collection.indexes();
            const legacyIndex = indexes.find(i => i.name === 'classId_1_date_1');
            if (legacyIndex) {
                console.log('Dropping legacy index: classId_1_date_1');
                await collection.dropIndex('classId_1_date_1');
            }
        } catch (error) {
            console.warn('Failed to clean up indexes:', error);
        }
    }

    private async updateStudentSessions(studentId: string, subjectName: string, teacherId: string, increment: number): Promise<{ success: boolean, remaining?: number }> {
        if (!studentId || !subjectName) return { success: false };

        const student = await this.userModel.findById(studentId);
        if (!student || !student.registeredCourses) {
            return { success: false };
        }

        const targetSubject = (subjectName || '').toLowerCase().trim();
        const targetTeacherId = (teacherId || '').toString();

        // 1. Try to find EXACT match (Subject + Teacher) for precision
        let courseIndex = student.registeredCourses.findIndex(c =>
            (c.subject || '').toLowerCase().trim() === targetSubject &&
            (c.teacherId?.toString() === targetTeacherId) &&
            ((c.totalSessions || 0) === 0 || (c.usedSessions || 0) < c.totalSessions)
        );

        // 2. Fallback: Subject Only (Ignore Teacher) - THIS IS CRITICAL FOR LEGACY DATA
        if (courseIndex === -1) {
            courseIndex = student.registeredCourses.findIndex(c =>
                (c.subject || '').toLowerCase().trim() === targetSubject
            );
        }

        // 3. Fallback: Fuzzy / Contains
        if (courseIndex === -1) {
            courseIndex = student.registeredCourses.findIndex(c =>
                targetSubject.includes((c.subject || '').toLowerCase().trim()) ||
                (c.subject || '').toLowerCase().trim().includes(targetSubject)
            );
        }

        if (courseIndex !== -1) {
            const course = student.registeredCourses[courseIndex];
            const newUsedSessions = Math.max(0, (course.usedSessions || 0) + increment);

            // Optimization: Only update if changed
            const updatePath = `registeredCourses.${courseIndex}.usedSessions`;
            await this.userModel.updateOne(
                { _id: studentId },
                { $set: { [updatePath]: newUsedSessions } }
            );
            return { success: true };
        }

        // console.warn(`[Sync-Fail] Student: ${student.displayName} | Subj: ${subjectName} | No Match`);
        return { success: false };
    }

    private isDeductible(status: string): boolean {
        const lowerStatus = (status || '').toLowerCase();
        return lowerStatus === 'present' || lowerStatus === 'late';
    }

    private async resolveStudentNames(students: any[]) {
        const needsResolution = students.filter(s => !s.firstName || s.firstName === 'Unknown' || !s.lastName || s.lastName === '-');
        if (needsResolution.length === 0) return students;

        const studentIds = needsResolution.map(s => s.studentId);
        const users = await this.userModel.find({ _id: { $in: studentIds } }).exec();

        return students.map(s => {
            const user = users.find(u => u._id.toString() === s.studentId.toString());
            if (!user) return s;

            const fName = user.firstName || (user.studentName ? user.studentName.split(' ')[0] : (user.displayName ? user.displayName.split(' ')[0] : ''));
            const lName = user.lastName || (user.studentName ? user.studentName.split(' ').slice(1).join(' ') : (user.displayName ? user.displayName.split(' ').slice(1).join(' ') : ''));

            return {
                ...s,
                firstName: (s.firstName && s.firstName !== 'Unknown') ? s.firstName : (fName || 'Unknown'),
                lastName: (s.lastName && s.lastName !== '-') ? s.lastName : (lName || '-'),
                nickname: s.nickname || user.nickname || '-'
            };
        });
    }

    async create(createAttendanceDto: CreateAttendanceDto, teacher: User): Promise<Attendance> {
        const { subjectId, date } = createAttendanceDto;

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        let existing = await this.attendanceModel.findOne({
            subjectId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        const oldStudents = existing ? (existing.students || []) : [];
        const requestStudents = createAttendanceDto.students || [];

        const mergedStudents = [...oldStudents];

        requestStudents.forEach(newS => {
            const idx = mergedStudents.findIndex(s => s.studentId.toString() === newS.studentId.toString());
            if (idx > -1) {
                mergedStudents[idx] = {
                    ...mergedStudents[idx],
                    ...newS,
                    status: newS.status,
                    comment: newS.comment
                };
            } else {
                mergedStudents.push(newS);
            }
        });

        const finalStudents = await this.resolveStudentNames(mergedStudents);
        const allStudentIds = new Set(finalStudents.map(s => s.studentId.toString()));

        for (const studentId of allStudentIds) {
            const oldS = oldStudents.find(s => s.studentId.toString() === studentId);
            const newS = finalStudents.find(s => s.studentId.toString() === studentId);

            const oldDeductible = oldS && this.isDeductible(oldS.status);
            const newDeductible = newS && this.isDeductible(newS.status);

            let delta = 0;
            if (newDeductible && !oldDeductible) delta = 1;
            else if (!newDeductible && oldDeductible) delta = -1;

            if (delta !== 0) {
                const subj = createAttendanceDto.subjectName || (existing ? existing.subjectName : '');
                await this.updateStudentSessions(studentId, subj, (teacher as any)._id, delta);
            }
        }

        if (existing) {
            existing.students = finalStudents;
            existing.teacherId = (teacher as any)._id;
            existing.subjectName = createAttendanceDto.subjectName;
            return existing.save();
        }

        const newAttendance = new this.attendanceModel({
            ...createAttendanceDto,
            date: new Date(date),
            teacherId: (teacher as any)._id,
            students: finalStudents
        });

        return newAttendance.save();
    }

    async findAllByTeacher(teacher: User): Promise<Attendance[]> {
        return this.attendanceModel.find({ teacherId: (teacher as any)._id })
            .sort({ date: -1 })
            .exec();
    }

    async findBySubjectAndDate(subjectId: string, date: string): Promise<Attendance | null> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return this.attendanceModel.findOne({
            subjectId,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).exec();
    }

    async findAll(subjectId?: string, teacherId?: string): Promise<Attendance[]> {
        const query: any = {};

        if (subjectId) {
            query.$or = [
                { subjectId: subjectId },
                { subjectName: subjectId }
            ];
            if (Types.ObjectId.isValid(subjectId)) {
                query.$or.push({ subjectId: new Types.ObjectId(subjectId) });
            }
        }

        if (teacherId) {
            query.teacherId = teacherId;
        }

        return this.attendanceModel.find(query).sort({ date: 1 }).exec();
    }

    async findByStudentId(studentId: string): Promise<Attendance[]> {
        return this.attendanceModel.find({
            'students.studentId': studentId,
        }).sort({ date: -1 }).exec();
    }

    async recalculateAllQuotas(): Promise<any> {
        console.log('[Sync] Starting Full Recalculation...');
        const students = await this.userModel.find({ role: 'student' });
        // Reset
        for (const student of students) {
            if (student.registeredCourses) {
                let modified = false;
                student.registeredCourses.forEach(c => {
                    if (c.usedSessions !== 0) {
                        c.usedSessions = 0;
                        modified = true;
                    }
                });
                if (modified) await student.save();
            }
        }
        console.log('[Sync] Reset complete. Processing attendance records...');

        const allAttendance = await this.attendanceModel.find();
        let updatedCount = 0;
        let failCount = 0;

        for (const record of allAttendance) {
            if (!record.students || record.students.length === 0) continue;
            for (const s of record.students) {
                // Ensure extended deductible check
                const status = (s.status || '').toLowerCase();
                const isDeductible = status === 'present' || status === 'late' || status === 'มาเรียน' || status === 'มาสาย';

                if (isDeductible) {
                    const result = await this.updateStudentSessions(s.studentId as string, record.subjectName, record.teacherId, 1);
                    if (result.success) updatedCount++;
                    else failCount++;
                }
            }
        }

        console.log(`[Sync] Complete. Updated: ${updatedCount}, Failed: ${failCount}`);
        return { message: 'Recalculation Complete', updatedCount, failCount };
    }
    async generateQrToken(dto: { teacherId: string; subjectId: string; subjectName: string; date: string; time: string }) {
        const token = uuidv4();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        this.qrSessions.set(token, {
            ...dto,
            expiresAt
        });
        return { token, expiresAt };
    }

    async processQrCheckIn(token: string, student: User) {
        const session = this.qrSessions.get(token);
        if (!session) {
            throw new NotFoundException('QR Code expired or invalid');
        }
        if (Date.now() > session.expiresAt) {
            this.qrSessions.delete(token);
            throw new BadRequestException('QR Code has expired');
        }

        // 0. Enrollment Validation (Strict-ish)
        const targetSubject = (session.subjectName || '').toLowerCase().trim();
        const isEnrolled = student.registeredCourses?.some(c =>
            (c.subject || '').toLowerCase().trim() === targetSubject
        );
        // Also check legacy enrolledSubjects array just in case
        const isLegacyEnrolled = student.enrolledSubjects?.some(s => s.toLowerCase().trim() === targetSubject);

        // Warn but do not block (soft validation) - allowing trial classes or unchecked enrollments
        // Ideally, we should maybe flag this in the response.

        const nameParts = (student.studentName || student.displayName || '').trim().split(' ');
        const firstName = nameParts[0] || '-';
        const lastName = nameParts.slice(1).join(' ') || '-';

        const now = new Date();
        const checkInTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        // Check if already checked in
        const existing = await this.attendanceModel.findOne({
            subjectId: session.subjectId,
            date: new Date(session.date),
            'students.studentId': student._id
        });

        if (existing) {
            const studentRecord = existing.students.find(s => s.studentId.toString() === student._id.toString());
            if (studentRecord) {
                return { message: 'Already checked in', status: studentRecord.status };
            }

            // Add student to existing record
            existing.students.push({
                studentId: student._id.toString(),
                firstName,
                lastName,
                nickname: student.nickname || '-',
                status: 'Present',
                comment: 'QR Check-in',
                time: checkInTime
            });
            await existing.save();

            // Deduct Quota
            const quotaResult = await this.updateStudentSessions(student._id.toString(), session.subjectName, session.teacherId, 1);

            return {
                message: 'Check-in successful',
                quotaDeducted: quotaResult.success,
                remainingQuota: quotaResult.remaining,
                warning: (!isEnrolled && !isLegacyEnrolled) ? 'Not actively enrolled in this course' : undefined
            };
        } else {
            // Create new record
            const newAttendance = new this.attendanceModel({
                subjectId: session.subjectId,
                subjectName: session.subjectName,
                date: new Date(session.date),
                teacherId: session.teacherId,
                students: [{
                    studentId: student._id.toString(),
                    firstName,
                    lastName,
                    nickname: student.nickname || '-',
                    status: 'Present',
                    comment: 'QR Check-in',
                    time: checkInTime
                }]
            });
            await newAttendance.save();

            const quotaResult = await this.updateStudentSessions(student._id.toString(), session.subjectName, session.teacherId, 1);

            return {
                message: 'Check-in successful',
                quotaDeducted: quotaResult.success,
                remainingQuota: quotaResult.remaining,
                warning: (!isEnrolled && !isLegacyEnrolled) ? 'Not actively enrolled in this course' : undefined
            };
        }
    }

    async update(id: string, updateDto: CreateAttendanceDto, teacher: User): Promise<Attendance> {
        const attendance = await this.attendanceModel.findById(id);
        if (!attendance) throw new NotFoundException('Attendance record not found');

        // Validate Unique Date Violation BEFORE modifying anything
        const startOfDay = new Date(updateDto.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(updateDto.date);
        endOfDay.setHours(23, 59, 59, 999);

        const existingConflict = await this.attendanceModel.findOne({
            subjectId: attendance.subjectId,
            date: { $gte: startOfDay, $lte: endOfDay },
            _id: { $ne: id } // Exclude self
        });

        if (existingConflict) {
            throw new ConflictException('มีข้อมูลการลงเวลาในวันนี้แล้ว (Duplicate Date)');
        }

        const oldStudents = attendance.students || [];
        const requestStudents = updateDto.students || [];

        // 1. Merge Students (Preserve existing if not in request)
        const mergedStudents = [...oldStudents];

        requestStudents.forEach(newS => {
            const idx = mergedStudents.findIndex(s => s.studentId.toString() === newS.studentId.toString());
            if (idx > -1) {
                // Update existing
                mergedStudents[idx] = {
                    ...mergedStudents[idx],
                    ...newS,
                    status: newS.status,
                    comment: newS.comment
                };
            } else {
                // Add new
                mergedStudents.push(newS);
            }
        });

        // Resolve names
        const finalStudents = await this.resolveStudentNames(mergedStudents);

        // Identify all unique student IDs involved (from the merged set)
        const allStudentIds = new Set(finalStudents.map(s => s.studentId.toString()));

        // Process Quota Changes using finalStudents vs oldStudents
        for (const studentId of allStudentIds) {
            const oldS = oldStudents.find(s => s.studentId.toString() === studentId);
            const newS = finalStudents.find(s => s.studentId.toString() === studentId);

            const oldDeductible = oldS && this.isDeductible(oldS.status);
            const newDeductible = newS && this.isDeductible(newS.status);

            let delta = 0;
            if (newDeductible && !oldDeductible) delta = 1;
            else if (!newDeductible && oldDeductible) delta = -1;

            if (delta !== 0) {
                // Use new subject name for deduction context
                await this.updateStudentSessions(studentId, updateDto.subjectName, (teacher as any)._id, delta);
            }
        }

        attendance.date = new Date(updateDto.date);
        attendance.students = finalStudents;
        attendance.subjectName = updateDto.subjectName;

        return attendance.save();
    }

    async delete(id: string, teacher: User, studentId?: string): Promise<void> {
        const attendance = await this.attendanceModel.findById(id);
        if (!attendance) throw new NotFoundException('Attendance record not found');

        if (studentId) {
            // Case 1: Delete specific student
            const studentIdx = attendance.students.findIndex(s => s.studentId.toString() === studentId);
            if (studentIdx === -1) {
                // If student not found, maybe they were already deleted? Just return.
                return;
            }

            const studentRecord = attendance.students[studentIdx];
            // Rollback Quota for this student ONLY
            if (this.isDeductible(studentRecord.status)) {
                await this.updateStudentSessions(studentRecord.studentId as string, attendance.subjectName, (teacher as any)._id, -1);
            }

            // Remove from array
            attendance.students.splice(studentIdx, 1);

            // If empty, delete the whole doc
            if (attendance.students.length === 0) {
                await this.attendanceModel.findByIdAndDelete(id);
            } else {
                await attendance.save();
            }

        } else {
            // Case 2: Delete entire record (e.g. invalid date created)
            // Rollback quota for all students in this record
            for (const s of attendance.students) {
                if (this.isDeductible(s.status)) {
                    await this.updateStudentSessions(s.studentId as string, attendance.subjectName, (teacher as any)._id, -1);
                }
            }
            await this.attendanceModel.findByIdAndDelete(id);
        }
    }

    async recoverHistoryFromAllStudents() {
        const students = await this.userModel.find({ role: 'student' }).exec();
        let createdCount = 0;
        let updatedCount = 0;

        for (const student of students) {
            if (!student.registeredCourses) continue;

            for (const course of student.registeredCourses) {
                if (!course.attendanceHistory || course.attendanceHistory.length === 0) continue;

                let subjectName = course.subject;

                for (const hist of course.attendanceHistory) {
                    const date = new Date(hist.date);

                    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

                    const query = {
                        subjectName: subjectName,
                        date: { $gte: startOfDay, $lte: endOfDay }
                    };

                    const studentEntry = {
                        studentId: student._id,
                        firstName: student.firstName || (student.displayName ? student.displayName.split(' ')[0] : 'Unknown'),
                        lastName: student.lastName || (student.displayName ? student.displayName.split(' ').slice(1).join(' ') : 'Unknown'),
                        nickname: student.nickname,
                        status: hist.status.charAt(0).toUpperCase() + hist.status.slice(1).toLowerCase(),
                        time: hist.checkInTime || '00:00',
                        leaveType: '',
                        classPeriod: '',
                        comment: hist.note
                    };

                    const doc = await this.attendanceModel.findOne(query);

                    if (doc) {
                        const sIdx = doc.students.findIndex(s => s.studentId.toString() === student._id.toString());
                        if (sIdx === -1) {
                            doc.students.push(studentEntry as any);
                            await doc.save();
                            updatedCount++;
                        }
                    } else {
                        let finalSubjId = (course as any).subjectId || null;

                        if (!finalSubjId) {
                            const realSubj = await this.connection.collection('subjects').findOne({ name: subjectName });
                            if (realSubj) finalSubjId = realSubj._id;
                            else finalSubjId = new Types.ObjectId();
                        }

                        await this.attendanceModel.create({
                            subjectId: finalSubjId,
                            subjectName: subjectName,
                            teacherId: course.teacherId || new Types.ObjectId(),
                            date: date,
                            students: [studentEntry]
                        });
                        createdCount++;
                    }
                }
            }
        }
        return { message: 'Recovery Complete', createdCount, updatedCount };
    }

    async sanitizeSystem(): Promise<any> {
        console.log('[Sanitize] Starting System Sanitization...');

        // 1. CLEANING PHASE
        const allAttendance = await this.attendanceModel.find();
        let cleanedCount = 0;

        for (const record of allAttendance) {
            let dirty = false;
            // Trim Subject Name
            if (record.subjectName && record.subjectName !== record.subjectName.trim()) {
                record.subjectName = record.subjectName.trim();
                dirty = true;
            }

            // Clean Students
            if (record.students && record.students.length > 0) {
                record.students.forEach(s => {
                    // Stringify Student IDs
                    if (s.studentId && typeof s.studentId !== 'string') {
                        s.studentId = (s.studentId as any).toString();
                        dirty = true;
                    }
                    // Normalize Status
                    if (s.status) {
                        const lower = s.status.toLowerCase();
                        if (lower === 'มาเรียน' || lower === 'present') { if (s.status !== 'Present') { s.status = 'Present'; dirty = true; } }
                        else if (lower === 'มาสาย' || lower === 'late') { if (s.status !== 'Late') { s.status = 'Late'; dirty = true; } }
                        else if (lower === 'ขาด' || lower === 'absent') { if (s.status !== 'Absent') { s.status = 'Absent'; dirty = true; } }
                        else if (lower === 'ลา' || lower === 'leave') { if (s.status !== 'Leave') { s.status = 'Leave'; dirty = true; } }
                        else if (lower === 'ลาป่วย' || lower === 'sick') { if (s.status !== 'Sick') { s.status = 'Sick'; dirty = true; } }
                        else if (lower !== s.status) { s.status = lower.charAt(0).toUpperCase() + lower.slice(1); dirty = true; }
                    }
                });
            }
            if (dirty) {
                await record.save();
                cleanedCount++;
            }
        }

        // 2. RESET QUOTAS
        console.log('[Sanitize] Resetting quotas...');
        const students = await this.userModel.find({ role: 'student' });
        for (const student of students) {
            if (student.registeredCourses && student.registeredCourses.length > 0) {
                let modified = false;
                student.registeredCourses.forEach(c => {
                    if (c.usedSessions !== 0) {
                        c.usedSessions = 0;
                        modified = true;
                    }
                });
                if (modified) await student.save();
            }
        }

        // 3. ROBUST RECALCULATION
        console.log('[Sanitize] Starting Robust Recalculation...');
        let updatedCount = 0;
        let failCount = 0;

        // Re-fetch clean attendance
        const cleanAttendance = await this.attendanceModel.find();

        for (const record of cleanAttendance) {
            if (!record.students || record.students.length === 0) continue;

            for (const s of record.students) {
                const status = (s.status || '').toLowerCase();
                const isDeductible = status === 'present' || status === 'late';

                if (isDeductible) {
                    // Manual Update Logic to ensure we find the course
                    const student = await this.userModel.findById(s.studentId);
                    if (!student || !student.registeredCourses) {
                        // console.log(`[Sanitize] Student not found: ${s.studentId}`);
                        continue;
                    }

                    const targetSubject = (record.subjectName || '').toLowerCase().trim();

                    // Match Logic: Subject Name ONLY (Most reliable)
                    // We ignore teacherID for now as it causes too many mismatches in legacy data
                    let courseIndex = student.registeredCourses.findIndex(c =>
                        (c.subject || '').toLowerCase().trim() === targetSubject
                    );

                    // If not found, try fuzzy match (contains)
                    if (courseIndex === -1) {
                        courseIndex = student.registeredCourses.findIndex(c =>
                            targetSubject.includes((c.subject || '').toLowerCase().trim()) ||
                            (c.subject || '').toLowerCase().trim().includes(targetSubject)
                        );
                    }

                    if (courseIndex !== -1) {
                        const course = student.registeredCourses[courseIndex];
                        // Increment
                        const newUsed = (course.usedSessions || 0) + 1;

                        // Update DB directly
                        await this.userModel.updateOne(
                            { _id: student._id },
                            { $set: { [`registeredCourses.${courseIndex}.usedSessions`]: newUsed } }
                        );
                        updatedCount++;
                    } else {
                        console.log(`[Sanitize-Fail] No course for ${student.displayName}: "${record.subjectName}"`);
                        failCount++;
                    }
                }
            }
        }

        console.log(`[Sanitize] Complete. Updated: ${updatedCount}, Failed: ${failCount}`);

        return {
            message: 'Sanitization Complete',
            cleanedRecords: cleanedCount,
            recalculation: { updatedCount, failCount }
        };
    }
}
