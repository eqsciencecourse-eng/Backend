import { Module } from '@nestjs/common';
import { LineService } from './line.service';
import { LineController } from './line.controller';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [ConfigModule, UsersModule, AuthModule],
    providers: [LineService],
    controllers: [LineController],
    exports: [LineService],
})
export class LineModule { }
