import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientConfig } from '@line/bot-sdk';

@Injectable()
export class LineService {
    private readonly logger = new Logger(LineService.name);
    private readonly client: Client | null = null;
    private readonly channelAccessToken: string;

    constructor(private configService: ConfigService) {
        this.channelAccessToken = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN') || '';
        const channelSecret = this.configService.get<string>('LINE_CHANNEL_SECRET');

        if (this.channelAccessToken && channelSecret) {
            const clientConfig: ClientConfig = {
                channelAccessToken: this.channelAccessToken,
                channelSecret: channelSecret,
            };
            this.client = new Client(clientConfig);
        } else {
            this.logger.warn('LINE Config missing. Messages will be mocked.');
        }
    }

    async sendPushMessage(lineUserId: string, message: string) {
        if (!this.client) {
            this.logger.log(`[MOCK] Sending Line Message to ${lineUserId}: ${message}`);
            return;
        }

        try {
            await this.client.pushMessage(lineUserId, {
                type: 'text',
                text: message,
            });
            this.logger.log(`Line message sent to ${lineUserId}`);
        } catch (error) {
            this.logger.error(`Failed to send Line message: ${error.message}`, error.stack);
        }
    }

    async sendFlexMessage(lineUserId: string, altText: string, flexContent: any) {
        if (!this.client) {
            this.logger.log(`[MOCK] Sending Line Flex Message to ${lineUserId}: ${altText}`);
            return;
        }

        try {
            await this.client.pushMessage(lineUserId, {
                type: 'flex',
                altText: altText,
                contents: flexContent,
            });
        } catch (error) {
            this.logger.error(`Failed to send Line Flex message: ${error.message}`, error.stack);
        }
    }
}
