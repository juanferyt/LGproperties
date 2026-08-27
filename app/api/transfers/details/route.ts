import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    bankName: process.env.BANK_NAME || 'Por definir',
    bankAccountType: process.env.BANK_ACCOUNT_TYPE || 'Ahorros',
    bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || 'No configurado',
    bankAccountHolder: process.env.BANK_ACCOUNT_HOLDER || 'No configurado',
    bankAccountDocument: process.env.BANK_ACCOUNT_DOCUMENT || 'No configurado',
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573113035593',
  })
}
