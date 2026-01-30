import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsNotEmpty()
  parentName: string;

  @IsString()
  @IsNotEmpty()
  studentName: string;

  @IsString()
  @IsOptional()
  studentClass?: string;

  @IsString()
  @IsNotEmpty()
  educationLevel: string;

  @IsArray()
  @IsOptional()
  enrolledSubjects?: string[];

  @IsArray()
  @IsOptional()
  studyTimes?: string[];

  @IsString()
  @IsOptional()
  school?: string;
}
