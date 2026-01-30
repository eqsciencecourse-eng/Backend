import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { RequireAuthGuard } from './guards/auth.guard';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule,
    FirebaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresInStr = config.get<string>('JWT_EXPIRES_IN') || '7d';
        let expiresInSeconds = 604800; // Default 7 days

        const match = expiresInStr.match(/^(\d+)([smhd])$/);
        if (match) {
          const value = parseInt(match[1], 10);
          const unit = match[2];
          const multipliers: Record<string, number> = {
            s: 1,
            m: 60,
            h: 3600,
            d: 86400,
          };
          if (multipliers[unit]) {
            expiresInSeconds = value * multipliers[unit];
          }
        }

        return {
          secret: config.get<string>('JWT_SECRET') || 'change-this-secret',
          signOptions: {
            expiresIn: expiresInSeconds,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RequireAuthGuard],
  exports: [AuthService, JwtModule, RequireAuthGuard],
})
export class AuthModule {}
