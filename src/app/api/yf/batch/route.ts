import { NextResponse } from 'next/server';
import { fetchYFQuotes } from '@/lib/yf';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get('symbols');
    if (!symbolsParam) return NextResponse.json({ error: 'symbols required' }, { status: 400 });

    const rawSymbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
    const tickers = rawSymbols.map(s => s.includes('.') ? s.toUpperCase() : `${s.toUpperCase()}.NS`);

    try {
        // Fetch using the bulk v7 quote endpoint
        const results = await fetchYFQuotes(tickers);

        const stocks = results.map((r: any) => ({
            symbol: (r.symbol || '').replace('.NS', '').replace('.BO', ''),
            ticker: r.symbol,
            exchange: r.fullExchangeName || r.exchange,
            companyName: r.longName || r.shortName || r.symbol,
            sector: '', // Not available in v7 quote
            industry: '',
            ltp: r.regularMarketPrice || 0,
            change: r.regularMarketChange || 0,
            changePct: r.regularMarketChangePercent || 0,
            volume: r.regularMarketVolume || 0,
            marketCap: r.marketCap || 0,
            week52High: r.fiftyTwoWeekHigh || 0,
            week52Low: r.fiftyTwoWeekLow || 0,
            pe: r.trailingPE || 0,
            dividendYield: r.dividendYield || 0,
            eps: r.trailingEps || 0,
            bookValue: r.bookValue || 0,
            priceToBook: r.priceToBook || 0,
            currency: r.currency || 'INR',
        }));

        return NextResponse.json({ stocks, count: stocks.length, timestamp: new Date().toISOString() });
    } catch (e: any) {
        console.error('Batch fetch error:', e.message);
        return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 });
    }
}
