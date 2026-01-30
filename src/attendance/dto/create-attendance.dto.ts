
import { IsNotEmpty, IsString, IsArray, ValidateNested, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class StudentAttendanceDto {
    @IsString()
    @IsNotEmpty()
    studentId: string;

    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsString()
    @IsOptional()
    nickname?: string;

    @IsEnum(['Present', 'Late', 'Leave', 'Absent'])
    status: string;

    @IsString()
    @IsOptional()
    leaveType?: string;

    @IsString()
    @IsOptional()
    time?: string;

    @IsString()
    @IsOptional()
    classPeriod?: string;

    @IsString()
    @IsOptional()
    comment?: string;
}

export class CreateAttendanceDto {
    @IsString()
    @IsNotEmpty()
    subjectId: string;

    @IsString()
    @IsNotEmpty()
    subjectName: string;

    @IsDateString()
    date: string; // ISO Date String

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StudentAttendanceDto)
    students: StudentAttendanceDto[];
}
