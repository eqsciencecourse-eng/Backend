import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import { UsersService } from '../users/users.service';
import { LineService } from './line.service';

@Controller('line')
export class LineController {
    constructor(
        private usersService: UsersService,
        private lineService: LineService
    ) { }

    @UseGuards(RequireAuthGuard)
    @Post('connect')
    async connectLine(@Request() req: any, @Body() body: { lineUserId: string }) {
        const userId = req.user.userId;
        // Update user with lineUserId
        await this.usersService.update(userId, { lineUserId: body.lineUserId });

        // Send welcome message
        await this.lineService.sendPushMessage(body.lineUserId, '✅ เชื่อมต่อบัญชี Line เรียบร้อยแล้ว! คุณจะได้รับการแจ้งเตือนผลการเรียนที่นี่ครับ');

        return { success: true, message: 'Line account connected' };
    }

    @UseGuards(RequireAuthGuard)
    @Post('test-notify')
    async testNotify(@Request() req: any) {
        const user = await this.usersService.findOne(req.user.userId);
        if (user && user.lineUserId) {
            await this.lineService.sendPushMessage(user.lineUserId, '🔔 ทดสอบการแจ้งเตือนจากระบบ Eqsci');
            return { success: true };
        }
        return { success: false, message: 'Line not connected' };
    }
}
