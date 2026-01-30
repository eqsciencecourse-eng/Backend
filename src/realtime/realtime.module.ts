import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
