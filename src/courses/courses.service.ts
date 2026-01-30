import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
    constructor(@InjectModel(Course.name) private courseModel: Model<CourseDocument>) { }

    async create(createCourseDto: CreateCourseDto): Promise<Course> {
        const createdCourse = new this.courseModel(createCourseDto);
        return createdCourse.save();
    }

    async findAll(): Promise<Course[]> {
        return this.courseModel.find().populate('subjectId classId teacherId').exec();
    }

    async findByTeacher(teacherId: string): Promise<Course[]> {
        return this.courseModel.find({ teacherId }).populate('subjectId classId').exec();
    }
}
