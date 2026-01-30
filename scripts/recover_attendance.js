const mongoose = require('mongoose');
const { Schema } = mongoose;

const MONGO_URI = 'mongodb://localhost:27017/school-management';

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, p) => {
    console.error('UNHANDLED REJECTION:', reason);
});

const UserSchema = new Schema({
    role: String,
    firstName: String,
    lastName: String,
    displayName: String,
    nickname: String,
    studentName: String,
    registeredCourses: {
        type: [
            {
                subject: String,
                teacherId: String,
                subjectId: Object, // Might be ObjectId or missing
                attendanceHistory: [{
                    date: Date,
                    status: String,
                    note: String,
                    checkInTime: String
                }]
            }
        ],
        default: []
    }
}, { strict: false });

const AttendanceSchema = new Schema({
    subjectId: Schema.Types.ObjectId,
    subjectName: String,
    teacherId: Schema.Types.ObjectId,
    date: Date,
    students: [{
        studentId: { type: Schema.Types.ObjectId, ref: 'User' },
        firstName: String,
        lastName: String,
        nickname: String,
        status: String,
        time: String,
        comment: String,
        classPeriod: String,
        leaveType: String
    }]
}, { strict: false }); // Lenient schema

const User = mongoose.model('User', UserSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const students = await User.find({ role: 'student' }).lean();
        console.log(`Found ${students.length} students`);

        let createdCount = 0;
        let updatedCount = 0;

        for (const student of students) {
            if (!student.registeredCourses) continue;

            for (const course of student.registeredCourses) {
                if (!course.attendanceHistory || course.attendanceHistory.length === 0) continue;

                let subjectName = course.subject;
                // Try to find teacherId from course
                let teacherId = course.teacherId;

                for (const hist of course.attendanceHistory) {
                    const date = new Date(hist.date);
                    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

                    // Find or Create Attendance for this Subject+Day
                    let doc = await Attendance.findOne({
                        subjectName: subjectName,
                        date: { $gte: startOfDay, $lte: endOfDay }
                    });

                    const studentEntry = {
                        studentId: student._id,
                        firstName: student.firstName || (student.displayName ? student.displayName.split(' ')[0] : 'Unknown'),
                        lastName: student.lastName || (student.displayName ? student.displayName.split(' ').slice(1).join(' ') : 'Unknown'),
                        nickname: student.nickname || '-',
                        status: hist.status.charAt(0).toUpperCase() + hist.status.slice(1).toLowerCase(),
                        time: hist.checkInTime || '00:00',
                        leaveType: '',
                        classPeriod: '',
                        comment: hist.note || ''
                    };

                    if (doc) {
                        // Check if student exists
                        const exists = doc.students.find(s => s.studentId && s.studentId.toString() === student._id.toString());
                        if (!exists) {
                            doc.students.push(studentEntry);
                            await Attendance.updateOne({ _id: doc._id }, { $push: { students: studentEntry } });
                            updatedCount++;
                        }
                    } else {
                        // Resolve Subject ID
                        // If course has subjectId (from my recent fix), use it. Else find it.
                        let finalSubjId = course.subjectId;
                        if (!finalSubjId) {
                            const subjDoc = await mongoose.connection.collection('subjects').findOne({ name: subjectName });
                            if (subjDoc) finalSubjId = subjDoc._id;
                            else finalSubjId = new mongoose.Types.ObjectId();
                        }

                        if (!teacherId) teacherId = new mongoose.Types.ObjectId(); // Dummy if missing

                        await Attendance.create({
                            subjectId: finalSubjId,
                            subjectName: subjectName,
                            teacherId: teacherId,
                            date: date,
                            students: [studentEntry]
                        });
                        createdCount++;
                    }
                }
            }
        }

        const fs = require('fs');
        fs.writeFileSync('recovery_log.txt', `Recovery Complete. Created Docs: ${createdCount}, Updated Entries: ${updatedCount}`);
        console.log(`Recovery Complete. Created Docs: ${createdCount}, Updated Entries: ${updatedCount}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
