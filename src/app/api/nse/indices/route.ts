import { NextResponse } from 'next/server';
import axios from 'axios';

const NSE_HOME_URL = 'https://www.nseindia.com/';
const NSE_ALL_INDICES_URL = 'https://www.nseindia.com/api/allIndices';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const INDEX_NAMES = ['NIFTY 50', 'NIFTY BANK', 'INDIA VIX', 'NIFTY NEXT 50'];

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
        if (setCookie) {
            nseCookies = setCookie.map((c: string) => c.split(';')[0]).join('; ');
        }
        return nseCookies;
    } catch {
        return '';
    }
}

export async function GET() {
    try {
        if (!nseCookies) await getNseCookies();

        const fetchData = async () => axios.get(NSE_ALL_INDICES_URL, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.nseindia.com/market-data/live-market-indices',
                'Cookie': nseCookies,
            },
        });

        let response;
        try {
            response = await fetchData();
        } catch {
            await getNseCookies();
            response = await fetchData();
        }

        const allIndices: any[] = response.data?.data || [];

        // Also fetch SENSEX from BSE-related NSE endpoint
        const wantedNames = new Set(INDEX_NAMES);
        const filtered = allIndices
            .filter((idx: any) => wantedNames.has(idx.indexSymbol))
            .map((idx: any) => ({
                name: idx.indexSymbol,
                value: idx.last,
                change: idx.variation,
                changePct: idx.percentChange,
                open: idx.open,
                high: idx.high,
                low: idx.low,
            }));

        // Try to also grab SENSEX (S&P BSE SENSEX)
        const sensex = allIndices.find((i: any) => i.indexSymbol === 'S&P BSE SENSEX');
        if (sensex) {
            filtered.push({
                name: 'SENSEX',
                value: sensex.last,
                change: sensex.variation,
                changePct: sensex.percentChange,
                open: sensex.open,
                high: sensex.high,
                low: sensex.low,
            });
        }

        return NextResponse.json({ indices: filtered, timestamp: new Date().toISOString() });
    } catch (error: any) {
        console.error('Indices API Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch indices', details: error.message }, { status: 500 });
    }
}
