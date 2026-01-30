
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';

import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]),
        AuthModule,
        UsersModule,
        ConfigModule,
    ],
    controllers: [AccountingController],
    providers: [AccountingService],
    exports: [AccountingService],
})
export class AccountingModule { }
