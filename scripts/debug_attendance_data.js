
const mongoose = require('mongoose');

// Hardcoded URI from .env to ensure connection
const uri = 'mongodb://localhost:27017/school-management';

async function debugAttendance() {
    console.log(`Connecting to ${uri}...`);

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Define schema loosely to catch whatever is there
        const attendanceSchema = new mongoose.Schema({}, { strict: false });
        const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendances');
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

        // 1. Count records
        const count = await Attendance.countDocuments();
        console.log(`Total Attendance Records: ${count}`);

        if (count === 0) {
            console.log("No attendance records found at all.");
        } else {
            // 2. Dump last 5 records
            const last5 = await Attendance.find().sort({ _id: -1 }).limit(5);
            console.log('--- Last 5 Attendance Records (JSON) ---');
            console.log(JSON.stringify(last5, null, 2));
        }

        // 3. Find a student in "Web Design" (case insensitive check)
        // Trying to find a student who has enrolled in something resembling "web"
        const students = await User.find({
            $or: [
                { 'registeredCourses.subject': { $regex: /web/i } },
                { 'enrolledSubjects': { $regex: /web/i } }
            ]
        }).limit(2);

        console.log('--- Sample Students with "web" courses ---');
        console.log(JSON.stringify(students.map(s => ({
            name: s.displayName || s.studentName,
            id: s._id,
            registeredCourses: s.registeredCourses
        })), null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

debugAttendance();
