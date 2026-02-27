import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const account = db.prepare('SELECT cash_balance FROM account WHERE id = 1').get() as { cash_balance: number };
        return NextResponse.json({ balance: account.cash_balance });
    } catch (error: any) {
        console.error('Balance API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
