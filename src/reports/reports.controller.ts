import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { RequireAuthGuard } from '../auth/guards/auth.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(RequireAuthGuard)
  @Post()
  create(@Request() req: any, @Body() body: { message: string }) {
    return this.reportsService.create(
      req.user._id.toString(),
      req.user.displayName || 'User',
      body.message,
    );
  }

  @UseGuards(RequireAuthGuard)
  @Get()
  findAll() {
    // In a real app, check if user is admin
    return this.reportsService.findAll();
  }

  @UseGuards(RequireAuthGuard)
  @Get('user')
  findByUser(@Request() req: any) {
    return this.reportsService.findByUser(req.user._id.toString());
  }

  @UseGuards(RequireAuthGuard)
  @Patch(':id/reply')
  reply(@Param('id') id: string, @Body() body: { reply: string }) {
    return this.reportsService.reply(id, body.reply);
  }
}
