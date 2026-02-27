import { NextResponse } from 'next/server';
import axios from 'axios';

const NSE_HOME_URL = 'https://www.nseindia.com/';
// Most traded by value (turnover)
const NSE_MOST_ACTIVE_URL = 'https://www.nseindia.com/api/live-analysis-most-active-securities?index=value&limited=false';
const NSE_REFERER = 'https://www.nseindia.com/market-data/most-active-equities';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let nseCookies = '';

async function getNseCookies() {
    try {
        const response = await axios.get(NSE_HOME_URL, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });
        const setCookie = response.headers['set-cookie'];
        if (setCookie) nseCookies = setCookie.map((c: string) => c.split(';')[0]).join('; ');
        return nseCookies;
    } catch {
        return '';
    }
}

export async function GET() {
    try {
        if (!nseCookies) await getNseCookies();

        const fetchData = async () => axios.get(NSE_MOST_ACTIVE_URL, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': NSE_REFERER,
                'Cookie': nseCookies,
            },
            timeout: 8000,
        });

        let response;
        try {
            response = await fetchData();
        } catch {
            await getNseCookies();
            response = await fetchData();
        }

        const raw: any[] = response.data?.data || [];

        const data = raw.map((s: any, i: number) => ({
            rank: i + 1,
            ticker: s.symbol,
            name: s.companyName || s.symbol,
            ltp: s.lastPrice ?? s.ltp ?? 0,
            changePct: s.pChange ?? s.percentChange ?? 0,
            volume: s.totalTradedVolume ?? s.quantityTraded ?? 0,          // shares
            turnover: s.totalTradedValue ?? s.tradedValue ?? 0,             // in Cr (NSE returns Cr already? check: it's in lakh for some endpoints)
            sector: s.industry || '',
        }));

        // Calculate total & top stats
        const totalTurnover = data.reduce((sum, r) => sum + r.turnover, 0);

        return NextResponse.json({
            data,
            totalTurnover,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('Turnover API Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch turnover data', details: error.message }, { status: 500 });
    }
}
