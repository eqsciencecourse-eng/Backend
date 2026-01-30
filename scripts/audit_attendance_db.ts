
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AttendanceService } from '../src/attendance/attendance.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get<Connection>(getConnectionToken());

    console.log('Connected to DB');

    const attendanceCollection = connection.collection('attendances');
    const subjectsCollection = connection.collection('subjects');
    const usersCollection = connection.collection('users');

    // 1. Fetch All Subjects
    const allSubjects = await subjectsCollection.find().toArray();
    console.log('--- SUBJECTS ---');
    allSubjects.forEach(s => console.log(`ID: ${s._id} | Name: ${s.name}`));

    // 2. Fetch All Attendance
    const allAttendance = await attendanceCollection.find().toArray();
    console.log('\n--- ATTENDANCE RECORDS ---');
    if (allAttendance.length === 0) {
        console.log('NO ATTENDANCE RECORDS FOUND!');
    }
    allAttendance.forEach(a => {
        console.log(`ID: ${a._id}`);
        console.log(`  Date: ${a.date}`);
        console.log(`  SubjectId: ${a.subjectId} (Type: ${typeof a.subjectId})`);
        console.log(`  SubjectName: ${a.subjectName}`);
        console.log(`  TeacherId: ${a.teacherId}`);
        console.log(`  Students: ${a.students?.length || 0}`);
    });

    // 3. Fetch Student Quotas (Sample)
    const students = await usersCollection.find({ role: 'student' }).limit(5).toArray();
    console.log('\n--- SAMPLE STUDENT QUOTAS ---');
    students.forEach(s => {
        console.log(`Student: ${s.studentName || s.displayName}`);
        if (s.registeredCourses) {
            s.registeredCourses.forEach((c: any) => {
                console.log(`  - ${c.subject}: ${c.usedSessions}/${c.totalSessions}`);
            });
        }
    });

    await app.close();
    process.exit(0);
}

bootstrap();
