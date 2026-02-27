import { NextResponse } from 'next/server';
import axios from 'axios';

const YF_SEARCH = 'https://query2.finance.yahoo.com/v1/finance/search';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q || q.trim().length < 1) return NextResponse.json({ results: [] });

    try {
        const { data } = await axios.get(YF_SEARCH, {
            params: {
                q: q.trim(),
                quotesCount: 10,
                newsCount: 0,
                listsCount: 0,
                enableFuzzyQuery: false,
                quotesQueryId: 'tss_match_phrase_query',
                multiQuoteQueryId: 'multi_quote_single_token_query',
                enableCb: false,
                enableNavLinks: false,
                enableEnhancedTriviaInfo: false,
                enableResearchReports: false,
                enableCulturalAssets: false,
            },
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://finance.yahoo.com',
            },
            timeout: 5000,
        });

        const quotes: any[] = data?.quotes || [];

        // Filter to Indian stocks only (NSE .NS or BSE .BO)
        const indian = quotes
            .filter((q: any) => q.symbol?.endsWith('.NS') || q.symbol?.endsWith('.BO'))
            .slice(0, 8)
            .map((q: any) => ({
                symbol: q.symbol.replace('.NS', '').replace('.BO', ''),
                ticker: q.symbol,
                exchange: q.symbol.endsWith('.NS') ? 'NSE' : 'BSE',
                companyName: q.longname || q.shortname || q.symbol,
                sector: q.sector || '',
                industry: q.industry || '',
                type: q.quoteType || 'EQUITY',
            }));

        return NextResponse.json({ results: indian, query: q });
    } catch (error: any) {
        console.error('YF Search error:', error.message);
        return NextResponse.json({ results: [], error: error.message });
    }
}
