import { IsArray, IsDate, IsNotEmpty, IsString, ValidateNested, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class AttendanceRecord {
    @IsString()
    @IsNotEmpty()
    studentId: string;

    @IsEnum(['present', 'absent', 'sick', 'leave'])
    status: string;

    @IsString()
    @IsOptional()
    note?: string;
}

export class BatchAttendanceDto {
    @IsString()
    @IsNotEmpty()
    subjectId: string; // Name or ID

    @IsString()
    @IsNotEmpty()
    teacherId: string;

    @IsDate()
    @Type(() => Date)
    date: Date;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttendanceRecord)
    records: AttendanceRecord[];
}
