import { NextResponse } from 'next/server';
import { fetchYFQuoteSummary, fetchYFChart } from '@/lib/yf';

const MODULES = 'price,summaryDetail,defaultKeyStatistics,assetProfile,financialData,incomeStatementHistory,majorHoldersBreakdown';
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

    const ticker = symbol.includes('.') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;

    try {
        // Parallel fetch quote and chart data
        const [result, chart] = await Promise.all([
            fetchYFQuoteSummary(ticker, MODULES),
            fetchYFChart(ticker, '1y', '1d').catch(() => null)
        ]);

        const price = result.price || {};
        const summary = result.summaryDetail || {};
        const stats = result.defaultKeyStatistics || {};
        const profile = result.assetProfile || {};
        const financial = result.financialData || {};
        const holders = result.majorHoldersBreakdown || {};
        const income = result.incomeStatementHistory || {};

        // Technicals & Chart Data
        let dma23 = 0, dma46 = 0, vwap = 0, chartData: any[] = [];
        if (chart && chart.indicators?.quote?.[0]) {
            const closes = chart.indicators.quote[0].close || [];
            const timestamps = chart.timestamp || [];

            // Calculate DMAs for the whole series to provide to the frontend
            const series = timestamps.map((ts: number, i: number) => {
                const date = new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                const close = closes[i];

                // Sub-series for SMA calculation
                const getSMA = (p: number[], idx: number, period: number) => {
                    if (idx < period - 1) return null;
                    const slice = p.slice(idx - period + 1, idx + 1).filter(v => v !== null);
                    if (slice.length < period) return null;
                    return slice.reduce((a, b) => a + b, 0) / period;
                };

                return {
                    date,
                    ltp: close,
                    dma23: getSMA(closes, i, 23),
                    dma46: getSMA(closes, i, 46)
                };
            }).filter((item: any) => item.ltp !== null);

            // Filter for last 90 days for the UI graph
            chartData = series.slice(-90);

            const last = series[series.length - 1] || {};
            dma23 = last.dma23 || 0;
            dma46 = last.dma46 || 0;
            vwap = price.regularMarketVolumeWeightedAveragePrice || 0;
        }

        const cleanVal = (obj: any) => (typeof obj === 'object' && obj !== null ? obj.raw : obj);

        const quote = {
            symbol: (price.symbol || symbol).replace('.NS', '').replace('.BO', ''),
            ticker,
            exchange: price.exchange === 'NSI' ? 'NSE' : price.exchange === 'BSE' ? 'BSE' : price.exchange || 'NSE',
            companyName: price.longName || price.shortName || symbol,
            sector: profile.sector || '',
            industry: profile.industry || '',
            ltp: cleanVal(price.regularMarketPrice) || 0,
            change: cleanVal(price.regularMarketChange) || 0,
            changePct: (cleanVal(price.regularMarketChangePercent) || 0) * 100,
            open: cleanVal(price.regularMarketOpen) || 0,
            high: cleanVal(price.regularMarketDayHigh) || 0,
            low: cleanVal(price.regularMarketDayLow) || 0,
            prevClose: cleanVal(price.regularMarketPreviousClose) || 0,
            volume: cleanVal(price.regularMarketVolume) || 0,
            marketCap: cleanVal(price.marketCap) || 0,
            week52High: cleanVal(summary.fiftyTwoWeekHigh) || 0,
            week52Low: cleanVal(summary.fiftyTwoWeekLow) || 0,
            pe: cleanVal(summary.trailingPE) || cleanVal(stats.trailingPE) || 0,
            forwardPE: cleanVal(summary.forwardPE) || 0,
            dividendYield: (cleanVal(summary.dividendYield) || 0) * 100,
            dividendRate: cleanVal(summary.dividendRate) || 0,
            eps: cleanVal(stats.trailingEps) || 0,
            bookValue: cleanVal(stats.bookValue) || 0,
            priceToBook: cleanVal(stats.priceToBook) || 0,

            // New Fields
            roe: (cleanVal(financial.returnOnEquity) || 0) * 100,
            roce: (cleanVal(financial.returnOnAssets) || 0) * 100 * 1.5, // Estimation since ROCE isn't directly available
            debtToEquity: cleanVal(financial.debtToEquity) || 0,
            promoterHolding: (cleanVal(stats.heldPercentInsiders) || cleanVal(holders.insidersPercent) || 0) * 100,
            pledgedShares: cleanVal(stats.sharesPledged) || 0,

            // Technicals
            dma23,
            dma46,
            vwap,
            chartData,

            // Profit History (Last 4 years usually)
            profitHistory: (income.incomeStatementHistory || []).map((item: any) => ({
                year: new Date(item.endDate?.raw * 1000).getFullYear(),
                netIncome: cleanVal(item.netIncome) || 0
            })).reverse(),

            lastUpdate: price.regularMarketTime
                ? new Date(price.regularMarketTime * 1000).toISOString()
                : new Date().toISOString(),
            currency: price.currency || 'INR',
        };

        return NextResponse.json(quote);
    } catch (error: any) {
        console.error(`YF Quote error for ${ticker}:`, error.message);
        return NextResponse.json({ error: 'Failed to fetch from Yahoo Finance', details: error.message }, { status: 500 });
    }
}
