import { NextResponse } from 'next/server';
import axios from 'axios';

const NSE_HOME_URL = 'https://www.nseindia.com/';
const NSE_NIFTY100_URL = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20100';
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

        const fetchData = async () => axios.get(NSE_NIFTY100_URL, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.nseindia.com/market-data/live-equity-market',
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

        const stocks: any[] = (response.data?.data || []).filter(
            (s: any) => s.symbol !== 'NIFTY 100'
        );

        const mapped = stocks.map((s: any) => ({
            ticker: s.symbol,
            name: s.meta?.companyName || s.symbol,
            ltp: s.lastPrice,
            changePct: s.pChange,
            sector: s.meta?.industry || '',
        }));

        const sorted = [...mapped].sort((a, b) => b.changePct - a.changePct);
        const gainers = sorted.slice(0, 5);
        const losers = sorted.slice(-5).reverse();

        // Sector distribution from NIFTY100 breakdown
        const sectorMap: Record<string, number> = {};
        mapped.forEach(s => {
            const sec = s.sector || 'Other';
            sectorMap[sec] = (sectorMap[sec] || 0) + 1;
        });
        const total = mapped.length || 1;
        const sectorColors: Record<string, string> = {
            'Financial Services': '#3b82f6',
            'Information Technology': '#06b6d4',
            'Oil Gas & Consumable Fuels': '#f59e0b',
            'Automobile and Auto Components': '#8b5cf6',
            'Fast Moving Consumer Goods': '#10b981',
            'Metals & Mining': '#ef4444',
            'Healthcare': '#14b8a6',
            'Capital Goods': '#f97316',
            'Consumer Durables': '#a855f7',
        };
        const sectorData = Object.entries(sectorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, count], i) => ({
                name,
                value: Math.round((count / total) * 100),
                color: sectorColors[name] || ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#64748b'][i % 6],
            }));

        return NextResponse.json({ gainers, losers, sectorData, timestamp: new Date().toISOString() });
    } catch (error: any) {
        console.error('Gainers/Losers API Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch gainers/losers', details: error.message }, { status: 500 });
    }
}
