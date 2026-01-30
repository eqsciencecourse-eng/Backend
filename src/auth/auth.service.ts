import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDocument, UserRole } from '../users/schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
  ) { }

  /* REMOVED HARDCODED EMAILS
  private readonly ADMIN_EMAILS = [
    '67319010041@technicrayong.ac.th',
    'eq.science.course@gmail.com',
  ];
  */

  private getAdminEmails(): string[] {
    const emails = this.configService.get<string>('ADMIN_EMAILS');
    const fallbackAdmins = ['67319010041@technicrayong.ac.th', 'eq.science.course@gmail.com'];

    if (!emails) return fallbackAdmins;
    const configEmails = emails.split(',').map(e => e.trim());
    return [...new Set([...configEmails, ...fallbackAdmins])];
  }

  async googleLogin(token: string) {
    try {
      const decodedToken = await this.firebaseService
        .getAuth()
        .verifyIdToken(token);
      const email = decodedToken.email;

      if (!email) {
        throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
      }

      let user = await this.usersService.findByEmail(email);
      const isAdminEmail = this.getAdminEmails().includes(email);

      // Mode 2: Strict Login - Throw error if user not found (UNLESS it's an admin)
      if (!user) {
        if (isAdminEmail) {
          console.log(`Auto-creating missing ADMIN user: ${email}`);
          user = await this.usersService.create({
            email: email,
            firebaseUid: decodedToken.uid,
            displayName: decodedToken.name || email.split('@')[0],
            photoURL: decodedToken.picture,
            role: UserRole.ADMIN,
            isApproved: true,
            // Add other defaults as needed
          });
        } else {
          throw new NotFoundException('EMAIL_NOT_FOUND');
        }
      }

      // If user exists but should be admin and isn't, update them
      if (isAdminEmail && user.role !== UserRole.ADMIN) {
        console.log(`Promoting user ${email} to ADMIN`);
        const updatedUser: UserDocument | null = await this.usersService.update(
          user._id.toString(),
          { role: UserRole.ADMIN },
        );
        if (!updatedUser) {
          throw new NotFoundException('User not found during update');
        }
        user = updatedUser;
      }

      return this.buildAuthResponse(user);
    } catch (error) {
      console.error('Google Login Error:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
    }
  }

  async googleRegister(token: string, payload: RegisterDto) {
    try {
      const decodedToken = await this.firebaseService
        .getAuth()
        .verifyIdToken(token);
      const email = decodedToken.email;

      if (!email) {
        throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
      }

      if (email !== payload.email) {
        throw new UnauthorizedException('EMAIL_MISMATCH');
      }

      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('EMAIL_ALREADY_EXISTS');
      }

      // No password hash needed for Google Auth users
      const newUser = await this.usersService.create({
        email: payload.email,
        passwordHash: undefined, // Explicitly undefined
        displayName:
          payload.studentName ||
          payload.parentName ||
          payload.email.split('@')[0],
        parentName: payload.parentName,
        studentName: payload.studentName,
        studentClass: payload.studentClass,
        enrolledSubjects: payload.enrolledSubjects || [],
        studyTimes: payload.studyTimes || [],
        school: payload.school,
        educationLevel: payload.educationLevel,
        role: UserRole.STUDENT,
        firebaseUid: decodedToken.uid, // Store Firebase UID
        photoURL: decodedToken.picture,
      });

      return this.buildAuthResponse(newUser);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
    }
  }

  async register(payload: RegisterDto) {
    if (payload.email) {
      const existingUser = await this.usersService.findByEmail(payload.email);
      if (existingUser) {
        throw new ConflictException('EMAIL_ALREADY_EXISTS');
      }
    }

    if (payload.username) {
      const existingUser = await this.usersService.findByUsername(payload.username);
      if (existingUser) {
        throw new ConflictException('USERNAME_ALREADY_EXISTS');
      }
    }

    if (!payload.email && !payload.username) {
      throw new ConflictException('EMAIL_OR_USERNAME_REQUIRED');
    }

    if (payload.password) {
      const passwordHash = await bcrypt.hash(payload.password, 12);

      const newUser = await this.usersService.create({
        email: payload.email,
        username: payload.username,
        passwordHash,
        displayName:
          payload.studentName ||
          payload.parentName ||
          payload.username ||
          (payload.email ? payload.email.split('@')[0] : 'User'),
        parentName: payload.parentName,
        studentName: payload.studentName,
        studentClass: payload.studentClass,
        enrolledSubjects: payload.enrolledSubjects || [],
        studyTimes: payload.studyTimes || [],
        school: payload.school,
        educationLevel: payload.educationLevel,
        role: UserRole.STUDENT,
      });
      return this.buildAuthResponse(newUser);
    } else {
      // Should not happen in Google Auth flow, but for safety
      throw new UnauthorizedException('PASSWORD_REQUIRED');
    }
  }

  async login(payload: LoginDto) {
    let user: UserDocument | null = null;

    if (payload.email) {
      user = await this.usersService.findByEmail(payload.email, true);
    } else if (payload.username) {
      user = await this.usersService.findByUsername(payload.username, true);
    }

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const validPassword = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );
    if (!validPassword) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return this.buildAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }
    return this.usersService.toSafeObject(user);
  }

  private async buildAuthResponse(user: UserDocument) {
    const safeUser = await this.usersService.toSafeObject(user);

    const expiresInStr =
      this.configService.get<string>('JWT_EXPIRES_IN') || '7d';
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

    const token = await this.jwtService.signAsync(
      {
        sub: user._id.toString(),
        email: safeUser?.email,
        role: safeUser?.role,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: expiresInSeconds,
      },
    );

    return {
      token,
      user: safeUser,
      meta: {
        requiresTeacherProfile:
          safeUser?.role === UserRole.PENDING &&
          !safeUser?.teacherRequest?.fullName,
      },
    };
  }
}
