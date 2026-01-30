import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScoreItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  score: number;

  @IsNumber()
  maxScore: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  timestamp?: string;
}

export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  subjectName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreItemDto)
  @IsOptional()
  scores?: ScoreItemDto[];

  @IsOptional()
  skills?: {
    exercise: number;
    flowchart: number;
    reading: number;
    planning: number;
    equipmentUsage: number;
    problemSolving: number;
    improvement: number;
    programming: number;
    presentation: number;
    attitude: number;
  };
}

export class AddScoreDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  subjectName?: string;

  @ValidateNested()
  @Type(() => ScoreItemDto)
  @IsOptional()
  scoreItem?: ScoreItemDto;

  @IsOptional()
  skills?: {
    exercise: number;
    flowchart: number;
    reading: number;
    planning: number;
    equipmentUsage: number;
    problemSolving: number;
    improvement: number;
    programming: number;
    presentation: number;
    attitude: number;
  };
}

export class AddScoreMultipartDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  subjectName?: string;

  @IsString()
  @IsOptional()
  scoreItem?: string; // JSON String

  @IsString()
  @IsOptional()
  skills?: string; // JSON String
}

export class UpdateEvaluationDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  subjectName: string;

  @IsNumber()
  @IsNotEmpty()
  period: number;

  @IsObject()
  @IsNotEmpty()
  scores: Record<string, number> | { knowledge: number; skill: number; creative: number };

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  attendance?: string;

  @IsString()
  @IsOptional()
  date?: string; // ISO Date string
}
