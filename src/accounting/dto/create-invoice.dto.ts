
export class CreateInvoiceDto {
    receiveId: string;
    customerName: string;
    paymentDate: Date;
    amount: number;
    bank?: string;
    classLevel?: string;
    periodStart?: Date;
    periodEnd?: Date;
    paymentTime?: string;
}
