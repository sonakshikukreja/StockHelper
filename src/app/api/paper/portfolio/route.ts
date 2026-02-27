import { NextResponse } from 'next/server';
import db from '@/lib/db';
import axios from 'axios';

const NSE_HOME_URL = 'https://www.nseindia.com/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let nseCookies = '';

async function getNseCookies() {
    try {
        const response = await axios.get(NSE_HOME_URL, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            },
        });
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
            nseCookies = setCookie.map(c => c.split(';')[0]).join('; ');
        }
        return nseCookies;
    } catch (error) {
        return '';
    }
}

async function getLTP(symbol: string) {
    if (!nseCookies) await getNseCookies();

    const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;
    const headers = {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
        'Referer': 'https://www.nseindia.com/get-quotes/equity?symbol=' + symbol,
        'Cookie': nseCookies,
    };

    try {
        const resp = await axios.get(url, { headers, timeout: 5000 });
        return resp.data.priceInfo.lastPrice;
    } catch (e) {
        // Retry with fresh cookies if 401/403
        try {
            await getNseCookies();
            headers.Cookie = nseCookies;
            const resp = await axios.get(url, { headers, timeout: 5000 });
            return resp.data.priceInfo.lastPrice;
        } catch (err) {
            console.error(`LTP fetch failed for ${symbol}`);
            return null;
        }
    }
}

export async function GET() {
    try {
        const holdings = db.prepare('SELECT * FROM holdings').all() as any[];
        const account = db.prepare('SELECT cash_balance FROM account WHERE id = 1').get() as any;

        // Fetch live prices in parallel
        const enrichedHoldings = await Promise.all(holdings.map(async (h) => {
            const ltp = await getLTP(h.symbol);
            return {
                id: h.id,
                symbol: h.symbol,
                quantity: h.quantity,
                avgPrice: h.avg_price,
                aiVerdict: h.ai_verdict || 'HOLD',
                buyDate: h.buy_date,
                currentPrice: ltp || h.avg_price
            };
        }));

        return NextResponse.json({
            holdings: enrichedHoldings,
            account
        });
    } catch (error: any) {
        console.error('Portfolio API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
