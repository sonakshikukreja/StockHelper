import { NextResponse } from 'next/server';
import axios from 'axios';

const NSE_HOME_URL = 'https://www.nseindia.com/';
const NSE_VOL_SPURTS_URL = 'https://www.nseindia.com/api/live-analysis-volume-gainers';
const NSE_DELIVERY_URL = 'https://www.nseindia.com/api/historicalOR/generateSecurityWiseHistoricalData';
const NSE_QUOTE_URL = 'https://www.nseindia.com/api/quote-equity';
const NSE_REFERER_URL = 'https://www.nseindia.com/market-data/volume-gainers-spurts';

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
            // Get the latest entry
            const latest = response.data.data[response.data.data.length - 1];
            return latest.COP_DELIV_PERC || 0;
        }
        return 0;
    } catch (error) {
        // Silently fail for individual symbols to avoid breaking the whole list
        return 0;
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
        // NSE returns marketCapFF (free-float) or marketCap in Cr
        const info = response.data?.marketDeptOrderBook?.tradeInfo;
        const meta = response.data?.metadata;
        // Try multiple possible field locations
        return meta?.marketCapFF || info?.marketCapFF || 0;
    } catch {
        return 0;
    }
}

export async function GET() {
    try {
        if (!nseCookies) {
            await getNseCookies();
        }

        const fetchVolumeGainer = async () => {
            return await axios.get(NSE_VOL_SPURTS_URL, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': NSE_REFERER_URL,
                    'Cookie': nseCookies,
                },
            });
        };

        let response;
        try {
            response = await fetchVolumeGainer();
        } catch (e) {
            await getNseCookies();
            response = await fetchVolumeGainer();
        }

        const volumeData = response.data;
        if (volumeData && volumeData.data) {
            // Fetch delivery + market cap for top 15 in parallel
            const symbols = volumeData.data.slice(0, 15);

            const [deliveryPercentages, marketCaps] = await Promise.all([
                Promise.all(symbols.map((item: any) => getDeliveryPercentage(item.symbol, nseCookies))),
                Promise.all(symbols.map((item: any) => getMarketCap(item.symbol, nseCookies))),
            ]);

            // Add deliveryPercentage and marketCap to the data
            volumeData.data = volumeData.data.map((item: any, index: number) => {
                if (index < 15) {
                    return { ...item, deliveryPercentage: deliveryPercentages[index], marketCap: marketCaps[index] };
                }
                return { ...item, deliveryPercentage: 0, marketCap: 0 };
            });
        }

        return NextResponse.json(volumeData);
    } catch (error: any) {
        console.error('NSE API Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to fetch data from NSE', details: error.message },
            { status: 500 }
        );
    }
}
