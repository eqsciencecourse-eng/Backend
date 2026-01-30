import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) { }

  @Get()
  async findAll() {
    return this.subjectsService.findAll();
  }

  @Post()
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body('name') name: string) {
    return this.subjectsService.create(name);
  }

  @Delete(':id')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    return this.subjectsService.delete(id);
  }

  @Patch(':id')
  @UseGuards(RequireAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body('name') name: string) {
    return this.subjectsService.update(id, name);
  }
}
