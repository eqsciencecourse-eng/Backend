import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequireAuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Post('google-login')
  googleLogin(@Body('token') token: string) {
    return this.authService.googleLogin(token);
  }

  @Post('google-register')
  googleRegister(@Body() body: { token: string; payload: RegisterDto }) {
    return this.authService.googleRegister(body.token, body.payload);
  }

  @Get('me')
  @UseGuards(RequireAuthGuard)
  async me(@CurrentUser() user: User) {
    return this.authService.me((user as any)._id.toString());
  }
}
