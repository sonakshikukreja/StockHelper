import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const trades = body.trades ? body.trades : [{ symbol: body.symbol, price: body.price }];

        if (!trades || trades.length === 0) {
            return NextResponse.json({ error: 'No trades provided' }, { status: 400 });
        }

        let totalProceeds = 0;
        const timestamp = new Date().toISOString();

        // Transactional update
        const transaction = db.transaction(() => {
            for (const trade of trades) {
                const { symbol, price } = trade;
                if (!symbol || !price) continue;

                const holding = db.prepare('SELECT * FROM holdings WHERE symbol = ?').get(symbol) as any;
                if (!holding) continue;

                const proceeds = holding.quantity * price;
                totalProceeds += proceeds;

                // Increase balance
                db.prepare('UPDATE account SET cash_balance = cash_balance + ? WHERE id = 1').run(proceeds);

                // Remove holding
                db.prepare('DELETE FROM holdings WHERE symbol = ?').run(symbol);

                // Log history
                db.prepare('INSERT INTO transactions (symbol, type, quantity, price, timestamp) VALUES (?, ?, ?, ?, ?)')
                    .run(symbol, 'SELL', holding.quantity, price, timestamp);
            }
        });

        transaction();

        return NextResponse.json({ success: true, totalProceeds });

    } catch (error: any) {
        console.error('Sell API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
