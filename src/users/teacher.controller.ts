import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './schemas/user.schema';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly usersService: UsersService) {}

  @Post('request-access')
  @UseGuards(RequireAuthGuard)
  async requestAccess(
    @CurrentUser() user: User,
    @Body()
    body: {
      fullName: string;
      googleProfile?: { name?: string; email?: string; picture?: string };
    },
  ) {
    return this.usersService.requestTeacherAccess(
      (user as any)._id.toString(),
      {
        fullName: body.fullName,
        googleProfile: body.googleProfile,
      },
    );
  }
}
