import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { symbol, price, aiVerdict } = await req.json();
        const TRADE_AMOUNT = 10000;

        if (!symbol || !price) {
            return NextResponse.json({ error: 'Symbol and price are required' }, { status: 400 });
        }

        // For high-priced stocks (> ₹10,000), buy exactly 1 share
        const quantity = price > 10000 ? 1 : Math.floor(TRADE_AMOUNT / price);
        const actualAmount = price > 10000 ? price : TRADE_AMOUNT;
        if (quantity === 0) {
            return NextResponse.json({ error: 'Price too high for ₹10,000 trade' }, { status: 400 });
        }

        const account = db.prepare('SELECT cash_balance FROM account WHERE id = 1').get() as { cash_balance: number };

        if (account.cash_balance < actualAmount) {
            return NextResponse.json({ error: 'Insufficient virtual balance' }, { status: 400 });
        }

        const timestamp = new Date().toISOString();

        // Transactional update
        const transaction = db.transaction(() => {
            // Update balance
            db.prepare('UPDATE account SET cash_balance = cash_balance - ? WHERE id = 1').run(actualAmount);

            // Update holdings (Upsert)
            const existing = db.prepare('SELECT * FROM holdings WHERE symbol = ?').get(symbol) as any;
            if (existing) {
                const newQty = existing.quantity + quantity;
                const newAvg = ((existing.avg_price * existing.quantity) + (price * quantity)) / newQty;
                db.prepare('UPDATE holdings SET quantity = ?, avg_price = ?, ai_verdict = ? WHERE symbol = ?')
                    .run(newQty, newAvg, aiVerdict || existing.ai_verdict, symbol);
            } else {
                db.prepare('INSERT INTO holdings (symbol, quantity, avg_price, ai_verdict, buy_date) VALUES (?, ?, ?, ?, ?)')
                    .run(symbol, quantity, price, aiVerdict || 'HOLD', timestamp);
            }

            // Log history
            db.prepare('INSERT INTO transactions (symbol, type, quantity, price, timestamp) VALUES (?, ?, ?, ?, ?)')
                .run(symbol, 'BUY', quantity, price, timestamp);
        });

        transaction();

        return NextResponse.json({ success: true, quantity, amount: actualAmount });

    } catch (error: any) {
        console.error('Buy API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
