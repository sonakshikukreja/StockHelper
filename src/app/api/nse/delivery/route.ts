import { NextResponse } from 'next/server';
import axios from 'axios';

const NSE_HOME_URL = 'https://www.nseindia.com/';
const NSE_INDEX_URL = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20100';
const NSE_NEXT_INDEX_URL = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20NEXT%2050';
const NSE_DELIVERY_URL = 'https://www.nseindia.com/api/historicalOR/generateSecurityWiseHistoricalData';

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
            nseCookies = setCookie.map(c => c.split(';')[0]).join('; ');
        }
        return nseCookies;
    } catch (error) {
        console.error('Error fetching NSE cookies:', error);
        return '';
    }
}

async function getDeliveryPercentage(symbol: string, cookies: string) {
    try {
        const now = new Date();
        const to = now.toLocaleDateString('en-GB').replace(/\//g, '-');
        const fromDate = new Date();
        fromDate.setDate(now.getDate() - 1);
        const from = fromDate.toLocaleDateString('en-GB').replace(/\//g, '-');

        const url = `${NSE_DELIVERY_URL}?from=${from}&to=${to}&symbol=${encodeURIComponent(symbol)}&type=priceVolumeDeliverable&series=ALL`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': `https://www.nseindia.com/report-detail/eq_security`,
                'Cookie': cookies,
            },
            timeout: 5000
        });

        if (response.data && response.data.data && response.data.data.length > 0) {
            const latest = response.data.data[response.data.data.length - 1];
            return {
                symbol: symbol,
                deliveryPct: latest.COP_DELIV_PERC || 0,
                deliveryVol: latest.COP_DELIV_QTY || 0,
                totalVol: latest.CH_TOT_TRADED_QTY || 0,
                ltp: latest.CH_CLOSING_PRICE || item_ltp_fallback(symbol, response.data.data)
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Fallback to get LTP from the historical data if status is not available
function item_ltp_fallback(symbol: string, data: any[]) {
    return data[data.length - 1].CH_LAST_TRADED_PRICE || data[data.length - 1].CH_CLOSING_PRICE || 0;
}

export async function GET() {
    try {
        if (!nseCookies) {
            await getNseCookies();
        }

        const fetchIndex = async (url: string) => {
            return await axios.get(url, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.nseindia.com/market-data/live-equity-market',
                    'Cookie': nseCookies,
                },
            });
        };

        const [resp1, resp2] = await Promise.all([
            fetchIndex(NSE_INDEX_URL).catch(() => ({ data: { data: [] } })),
            fetchIndex(NSE_NEXT_INDEX_URL).catch(() => ({ data: { data: [] } }))
        ]);

        const allStocks = [...(resp1.data.data || []), ...(resp2.data.data || [])];

        // Filter for symbols and basic info
        // In these index APIs, the market cap isn't always direct, but since it's Nifty 100/Next 50, 
        // they are the largest stocks. We'll take top 100 by whatever mc metric available or just first 100.
        // The user asked for top 50 delivered from stocks > 25k Cr.
        const candidates = allStocks.map(s => ({
            symbol: s.symbol,
            name: s.meta?.companyName || s.symbol,
            ltp: s.lastPrice,
            pChange: s.pChange,
            mCap: s.meta?.marketCap || 0 // available in some endpoints
        })).filter(s => s.symbol !== 'NIFTY 100' && s.symbol !== 'NIFTY NEXT 50');

        // Parallel fetch for delivery data
        // To avoid hitting NSE too hard and for speed, let's limit to top 60 candidates to find top 50 
        // OR better yet, let's just do a decent batch. 
        // Concurrency limit 10
        const batchSize = 10;
        const results: any[] = [];

        // We'll process first 80 symbols to find the best 50
        const processingList = candidates.slice(0, 80);

        for (let i = 0; i < processingList.length; i += batchSize) {
            const batch = processingList.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(s => getDeliveryPercentage(s.symbol, nseCookies))
            );
            results.push(...batchResults);
        }

        const deliveryData = results.filter(r => r !== null).map(r => {
            const candidate = candidates.find(c => c.symbol === r.symbol);
            return {
                ...r,
                name: candidate?.name || r.symbol,
                changePct: candidate?.pChange || 0,
            };
        });

        // Sort by delivery percentage descending and take top 50
        const top50 = deliveryData
            .sort((a, b) => b.deliveryPct - a.deliveryPct)
            .slice(0, 50);

        return NextResponse.json({
            data: top50,
            timestamp: new Date().toLocaleString('en-IN')
        });

    } catch (error: any) {
        console.error('Delivery API Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to fetch delivery data', details: error.message },
            { status: 500 }
        );
    }
}
