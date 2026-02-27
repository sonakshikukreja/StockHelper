import { NextResponse } from 'next/server';
import axios from 'axios';

const NSE_HOME_URL = 'https://www.nseindia.com/';
const NSE_HIGH_DATA_URL = 'https://www.nseindia.com/api/live-analysis-data-52weekhighstock';
const NSE_LOW_DATA_URL = 'https://www.nseindia.com/api/live-analysis-data-52weeklowstock';
const NSE_QUOTE_URL = 'https://www.nseindia.com/api/quote-equity';
const NSE_REFERER_URL = 'https://www.nseindia.com/market-data/52-week-high-equity-market';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let nseCookies = '';

async function getNseCookies() {
    try {
        const response = await axios.get(NSE_HOME_URL, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
            nseCookies = setCookie.map((c: string) => c.split(';')[0]).join('; ');
        }
        return nseCookies;
    } catch (error) {
        console.error('Error fetching NSE cookies:', error);
        return '';
    }
}

async function getMarketCap(symbol: string, cookies: string): Promise<number> {
    try {
        const url = `${NSE_QUOTE_URL}?symbol=${encodeURIComponent(symbol)}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`,
                'Cookie': cookies,
            },
            timeout: 5000
        });
        const meta = response.data?.metadata;
        const info = response.data?.marketDeptOrderBook?.tradeInfo;
        return meta?.marketCapFF || info?.marketCapFF || 0;
    } catch {
        return 0;
    }
}

async function enrichWithMarketCap(dataList: any[], cookies: string): Promise<any[]> {
    if (!dataList || dataList.length === 0) return dataList;
    const top = dataList.slice(0, 15);
    const caps = await Promise.all(top.map((item: any) => getMarketCap(item.symbol, cookies)));
    return dataList.map((item: any, i: number) => ({
        ...item,
        marketCap: i < 15 ? caps[i] : 0,
    }));
}

export async function GET() {
    try {
        if (!nseCookies) {
            await getNseCookies();
        }

        const fetchData = async (url: string) => {
            return await axios.get(url, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': NSE_REFERER_URL,
                    'Cookie': nseCookies,
                },
                timeout: 5000
            });
        };

        const fetchWithRetry = async (url: string) => {
            try {
                return await fetchData(url);
            } catch (e) {
                await getNseCookies();
                return await fetchData(url);
            }
        };

        const [highResp, lowResp] = await Promise.all([
            fetchWithRetry(NSE_HIGH_DATA_URL).catch(() => ({ data: { data: [] } })),
            fetchWithRetry(NSE_LOW_DATA_URL).catch(() => ({ data: { data: [] } }))
        ]);

        const highData = highResp.data.data || [];
        const lowData = lowResp.data.data || [];

        const [enrichedHigh, enrichedLow] = await Promise.all([
            enrichWithMarketCap(highData, nseCookies),
            enrichWithMarketCap(lowData, nseCookies),
        ]);

        return NextResponse.json({
            high: enrichedHigh,
            low: enrichedLow,
            timestamp: new Date().toLocaleString('en-IN')
        });

    } catch (error: any) {
        console.error('High-Low API Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to fetch high-low data', details: error.message },
            { status: 500 }
        );
    }
}
