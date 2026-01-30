
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { AttendanceService } from './attendance/attendance.service';
import { UserRole } from './users/schemas/user.schema';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    const attendanceService = app.get(AttendanceService);

    console.log('--- DEBUG START ---');

    // 1. Find the student
    // Try to find by name part since we don't know the exact full string or ID
    const allStudents = await usersService.findAll() as any[];
    const student = allStudents.find(u => u.displayName?.includes('ปุณณพัฒน์') || u.studentName?.includes('ปุณณพัฒน์'));

    if (!student) {
        console.log('Student "ปุณณพัฒน์" not found.');
        await app.close();
        return;
    }

    console.log(`Found Student: ${student.displayName} (${student._id})`);
    console.log('Registered Courses:', JSON.stringify(student.registeredCourses, null, 2));

    // 2. Simulate the logic from attendance.service.ts
    const subjectName = 'web design'; // The one from the screenshot
    // We don't know the teacher ID exactly, but let's try to find it from the course if present
    const teacherId = student.registeredCourses?.[0]?.teacherId || 'unknown_teacher_id';

    console.log(`Testing match for Subject: "${subjectName}", TeacherId: "${teacherId}"`);

    const targetSubject = (subjectName || '').toLowerCase().trim();
    const targetTeacherId = (teacherId || '').toString();

    // Logic 1: Exact Match
    let courseIndex = student.registeredCourses.findIndex((c: any) =>
        (c.subject || '').toLowerCase().trim() === targetSubject &&
        (c.teacherId?.toString() === targetTeacherId) &&
        ((c.totalSessions || 0) === 0 || (c.usedSessions || 0) < c.totalSessions)
    );
    console.log(`Logic 1 (Exact+Teacher) Match Index: ${courseIndex}`);

    // Logic 2: Subject Only
    if (courseIndex === -1) {
        courseIndex = student.registeredCourses.findIndex((c: any) =>
            (c.subject || '').toLowerCase().trim() === targetSubject &&
            ((c.totalSessions || 0) === 0 || (c.usedSessions || 0) < (c.totalSessions || 999))
        );
        console.log(`Logic 2 (Subject Only) Match Index: ${courseIndex}`);
    }

    // Logic 3: Reverse
    if (courseIndex === -1) {
        console.log('Logic 3 (Reverse search) would run...');
    }

    console.log('--- CHECKING ATTENDANCE COLLECTION ---');
    // Find attendance for this student and subject
    // We'll search broadly first
    const attendanceRecords = await attendanceService.findAll();
    console.log(`Total Attendance Records: ${attendanceRecords.length}`);

    const relevantRecord = attendanceRecords.find(r =>
        (r.subjectName === subjectName || r.subjectName?.toLowerCase() === 'web design') &&
        r.students.some((s: any) => s.studentId === student._id.toString())
    );

    if (relevantRecord) {
        console.log('Found Relevant Attendance Record:', JSON.stringify(relevantRecord, null, 2));
        const studentEntry = relevantRecord.students.find((s: any) => s.studentId === student._id.toString());
        console.log('Student Entry in Attendance:', JSON.stringify(studentEntry, null, 2));

        const isDeductible = (status: string) => {
            const lowerStatus = (status || '').toLowerCase();
            return lowerStatus === 'present' || lowerStatus === 'late';
        };

        if (studentEntry) {
            console.log(`Is Deductible ("${studentEntry.status}")?`, isDeductible(studentEntry.status));
        } else {
            console.log('Student not found in this attendance record students list.');
        }
        console.log(`Attendance Teacher ID: ${relevantRecord.teacherId}`);
    } else {
        console.log('No matching attendance record found in collection for this student/subject.');
    }

    console.log('--- DEBUG END ---');
    await app.close();
}

bootstrap();
