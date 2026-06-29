import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

const RESTRICTED_ADMIN_EMAILS = ['eq.science.online1@gmail.com'];

@Injectable()
export class AccountingAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.email) {
      throw new ForbiddenException('Access denied');
    }
    if (RESTRICTED_ADMIN_EMAILS.includes(user.email)) {
      throw new ForbiddenException('บัญชีผู้ใช้ของคุณไม่มีสิทธิ์เข้าใช้งานระบบบัญชี');
    }
    return true;
  }
}
