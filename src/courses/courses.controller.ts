import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { RequireAuthGuard } from '../auth/guards/auth.guard';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/schemas/user.schema';

@Controller('courses')
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    @Post()
    @UseGuards(RequireAuthGuard)
    create(@Body() createCourseDto: CreateCourseDto) {
        return this.coursesService.create(createCourseDto);
    }

    @Get()
    findAll() {
        return this.coursesService.findAll();
    }

    @Get('my-courses')
    @UseGuards(RequireAuthGuard)
    findMyCourses(@CurrentUser() user: User) {
        return this.coursesService.findByTeacher(user._id);
    }
}
