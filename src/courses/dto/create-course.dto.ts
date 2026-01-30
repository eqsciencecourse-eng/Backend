export class CreateCourseDto {
    subjectId: string;
    classId: string;
    teacherId: string;
    semester: string;
    schedule?: { day: string; startTime: string; endTime: string }[];
}
