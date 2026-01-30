
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';

@Injectable()
export class AccountingService {
    constructor(
        @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    ) { }

    async create(createInvoiceDto: any): Promise<Invoice> {
        const createdInvoice = new this.invoiceModel(createInvoiceDto);
        return createdInvoice.save();
    }

    async createMany(invoices: any[]): Promise<Invoice[]> {
        return this.invoiceModel.insertMany(invoices) as any;
    }

    async findAll(): Promise<Invoice[]> {
        return this.invoiceModel.find().sort({ createdAt: -1 }).exec();
    }

    async update(id: string, updateInvoiceDto: any): Promise<Invoice> {
        const updatedInvoice = await this.invoiceModel
            .findOneAndUpdate({ receiveId: id }, updateInvoiceDto, { new: true })
            .exec();

        if (!updatedInvoice) {
            throw new NotFoundException(`Invoice with ID ${id} not found`);
        }
        return updatedInvoice;
    }

    async remove(id: string): Promise<void> {
        const result = await this.invoiceModel.deleteOne({ receiveId: id }).exec();
        if (result.deletedCount === 0) {
            throw new NotFoundException(`Invoice with ID ${id} not found`);
        }
    }
}
