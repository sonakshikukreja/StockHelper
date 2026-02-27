import { NextResponse } from 'next/server';
import axios from 'axios';

const NSE_HOME_URL = 'https://www.nseindia.com/';
const NSE_QUOTE_URL = 'https://www.nseindia.com/api/quote-equity';
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

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    if (!symbol) {
        return NextResponse.json({ error: 'symbol query param required' }, { status: 400 });
    }

    try {
        if (!nseCookies) await getNseCookies();

        const fetchData = async () => axios.get(`${NSE_QUOTE_URL}?symbol=${encodeURIComponent(symbol)}`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`,
                'Cookie': nseCookies,
            },
            timeout: 6000,
        });

        let response;
        try {
            response = await fetchData();
        } catch {
            await getNseCookies();
            response = await fetchData();
        }

        const raw = response.data;
        const info = raw?.priceInfo || {};
        const meta = raw?.metadata || {};
        const tradeInfo = raw?.marketDeptOrderBook?.tradeInfo || {};
        const securityInfo = raw?.securityInfo || {};

        const quote = {
            symbol: meta.symbol || symbol,
            companyName: meta.companyName || symbol,
            industry: meta.industry || '',
            series: meta.series || 'EQ',
            ltp: info.lastPrice ?? 0,
            open: info.open ?? 0,
            high: info.intraDayHighLow?.max ?? 0,
            low: info.intraDayHighLow?.min ?? 0,
            prevClose: info.previousClose ?? 0,
            change: info.change ?? 0,
            changePct: info.pChange ?? 0,
            week52High: info.weekHighLow?.max ?? 0,
            week52Low: info.weekHighLow?.min ?? 0,
            totalTradedVolume: tradeInfo.totalTradedVolume ?? 0,
            totalTradedValue: tradeInfo.totalTradedValue ?? 0,
            marketCapFF: tradeInfo.marketCapFF ?? 0,
            pe: securityInfo.pe ?? 0,
            eps: securityInfo.eps ?? 0,
            faceValue: securityInfo.faceValue ?? 0,
        };

        return NextResponse.json(quote);
    } catch (error: any) {
        console.error(`Quote API Error for ${symbol}:`, error.message);
        return NextResponse.json({ error: 'Failed to fetch quote', details: error.message }, { status: 500 });
    }
}
