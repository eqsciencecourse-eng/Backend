import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookService } from './webhook.service';
import { IncomingWebhookController } from './incoming-webhook.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [HttpModule, RealtimeModule],
  controllers: [IncomingWebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule { }
