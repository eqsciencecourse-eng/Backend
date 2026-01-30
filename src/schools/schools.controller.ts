import { Controller, Get, Query } from '@nestjs/common';
import { SchoolsService } from './schools.service';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  async search(@Query('q') query: string) {
    return this.schoolsService.search(query);
  }
}
