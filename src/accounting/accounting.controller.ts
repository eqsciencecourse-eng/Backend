
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccountingService } from './accounting.service';
import { diskStorage } from 'multer';
import { RequireAuthGuard } from '../auth/guards/auth.guard';
import * as xlsx from 'xlsx';
import { extname } from 'path';

@Controller('accounting')
@UseGuards(RequireAuthGuard)
export class AccountingController {
    constructor(private readonly accountingService: AccountingService) { }

    @Post()
    @UseInterceptors(
        FileInterceptor('slip', {
            storage: diskStorage({
                destination: './uploads/slips',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
                },
            }),
        }),
    )
    create(@Body() body: any, @UploadedFile() file: Express.Multer.File) {
        const data = {
            ...body,
            slipUrl: file ? `/uploads/slips/${file.filename}` : null,
        };
        return this.accountingService.create(data);
    }

    @Post('import')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/excels',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `import-${uniqueSuffix}${ext}`);
                },
            }),
        }),
    )
    async importExcel(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file uploaded');

        const wb = xlsx.readFile(file.path);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet);

        const invoices = rawData.map((row: any) => ({
            receiveId: row['เลขที่ใบเสร็จ'] || row['Receipt ID'] || `REC${Math.floor(Math.random() * 10000)}`,
            customerName: row['ชื่อ-สกุล'] || row['Name'] || 'Unknown',
            paymentDate: row['วันที่ชำระ'] || row['Payment Date'] ? new Date(row['วันที่ชำระ'] || row['Payment Date']) : new Date(),
            amount: Number(row['จำนวนเงิน'] || row['Amount'] || 0),
            classLevel: row['โปรแกรมวิชา'] || row['Course'] || '',
            bank: row['ธนาคาร'] || row['Bank'] || '',
            periodStart: row['วันที่เริ่มเรียน'] ? new Date(row['วันที่เริ่มเรียน']) : null,
            periodEnd: row['วันสิ้นสุด'] ? new Date(row['วันสิ้นสุด']) : null,
            paymentTime: row['เวลา'] || row['Time'] || '',
        }));

        const created = await this.accountingService.createMany(invoices);
        return { count: created.length, message: 'Import successful', file: file.filename };
    }

    @Get()
    findAll() {
        return this.accountingService.findAll();
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.accountingService.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.accountingService.remove(id);
    }
}
