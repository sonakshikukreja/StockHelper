import { NextResponse } from 'next/server';
import { fetchYFChart } from '@/lib/yf';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get('symbols');
    if (!symbolsParam) return NextResponse.json({ error: 'symbols required' }, { status: 400 });

    const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
    const results: any[] = [];

    // Process symbols in parallel with a small concurrency limit if needed, 
    // but here we just process the received chunk.
    const scanPromises = symbols.map(async (symbol) => {
        try {
            // Fetch 1 month of daily data
            const chart = await fetchYFChart(symbol, '1mo', '1d');
            if (!chart || !chart.indicators?.quote?.[0]) return null;

            const quotes = chart.indicators.quote[0];
            const volumes = quotes.volume || [];
            const prices = chart.indicators.adjclose?.[0]?.adjclose || quotes.close || [];
            const timestamps = chart.timestamp || [];

            if (volumes.length < 23 || prices.length < 23) return null;

            // Get last 23 trading days
            const recentVols = volumes.slice(-23);
            const recentPrices = prices.slice(-23);

            // Last 5 days vs Last 23 days volume
            const vol5 = recentVols.slice(-5);
            const avgVol5 = vol5.reduce((a: number, b: number) => a + (b || 0), 0) / 5;
            const avgVol23 = recentVols.reduce((a: number, b: number) => a + (b || 0), 0) / 23;

            // Price change over 23 days
            const startPrice = recentPrices[0];
            const endPrice = recentPrices[recentPrices.length - 1];
            const priceChangePct = ((endPrice - startPrice) / startPrice) * 100;

            // Criteria: Vol(5D) > Vol(23D) AND Price Change > 5%
            if (avgVol5 > avgVol23 && priceChangePct > 5) {
                return {
                    symbol,
                    avgVol5,
                    avgVol23,
                    volMultiplier: avgVol5 / avgVol23,
                    priceChangePct,
                    ltp: endPrice
                };
            }
        } catch (e) {
            // Skip failed symbols
            return null;
        }
        return null;
    });

    const scanned = await Promise.all(scanPromises);
    return NextResponse.json({
        matches: scanned.filter(Boolean),
        timestamp: new Date().toISOString()
    });
}
