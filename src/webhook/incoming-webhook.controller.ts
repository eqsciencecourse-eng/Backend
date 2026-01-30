
import { Controller, Post, Body, Headers, BadRequestException, Logger } from '@nestjs/common';
import { RealtimeService } from '../realtime/realtime.service';

@Controller('webhooks')
export class IncomingWebhookController {
    private readonly logger = new Logger(IncomingWebhookController.name);

    constructor(private readonly realtimeService: RealtimeService) { }

    @Post('google-form')
    async handleGoogleFormSubmission(
        @Body() payload: any,
        @Headers('x-api-key') apiKey: string
    ) {
        // Optional: Add simple API key security if needed, or keep consistent with existing public endpoints
        // For now, minimal security as requested for prototype/speed

        this.logger.log('Received Google Form Submission:', payload);

        if (!payload) {
            throw new BadRequestException('No payload provided');
        }

        // Broadcast to Admin Dashboard
        await this.realtimeService.notifyAdmin('google_form_submission', {
            ...payload,
            receivedAt: new Date().toISOString()
        });

        return { success: true, message: 'Webhook processed' };
    }
}
