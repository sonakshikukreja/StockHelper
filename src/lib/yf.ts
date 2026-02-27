import axios from 'axios';

let cachedCookie: string | null = null;
let cachedCrumb: string | null = null;
let lastFetch = 0;
let sessionPromise: Promise<{ cookie: string | null, crumb: string | null }> | null = null;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function refreshCrumb() {
    try {
        // 1. Get cookie from fc.yahoo.com
        const fcResp = await axios.get('https://fc.yahoo.com', {
            headers: { 'User-Agent': USER_AGENT }
        }).catch(err => err.response);

        cachedCookie = fcResp.headers['set-cookie']?.[0]?.split(';')?.[0] || null;

        // 2. Get Crumb
        const crumbResp = await axios.get('https://query2.finance.yahoo.com/v1/test/getcrumb', {
            headers: {
                'User-Agent': USER_AGENT,
                'Cookie': cachedCookie || ''
            }
        });

        cachedCrumb = crumbResp.data;
        lastFetch = Date.now();
        console.log('YF Session Refreshed. Crumb:', cachedCrumb);
    } catch (error: any) {
        console.error('YF Crumb refresh failed:', error.message);
        throw error;
    }
}

export async function getYFSession() {
    // Refresh every 30 minutes or if missing
    if (!cachedCrumb || !cachedCookie || (Date.now() - lastFetch > 30 * 60 * 1000)) {
        if (!sessionPromise) {
            sessionPromise = refreshCrumb().then(() => ({ cookie: cachedCookie, crumb: cachedCrumb }));
        }
        return sessionPromise;
    }
    return { cookie: cachedCookie, crumb: cachedCrumb };
}

export async function fetchYFQuoteSummary(symbol: string, modules: string) {
    const { cookie, crumb } = await getYFSession();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?crumb=${crumb}&modules=${modules}`;

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Cookie': cookie || ''
        },
        timeout: 10000
    });

    const result = data?.quoteSummary?.result?.[0];
    if (!result) throw new Error(`No result found for ${symbol}`);
    return result;
}

export async function fetchYFQuotes(symbols: string[]) {
    const { cookie, crumb } = await getYFSession();
    // Yahoo allows up to roughly 200-300 symbols in one go
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?crumb=${crumb}&symbols=${symbols.join(',')}`;

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Cookie': cookie || ''
        },
        timeout: 15000
    });

    return data?.quoteResponse?.result || [];
}

export async function fetchYFQuote(symbol: string) {
    return fetchYFQuoteSummary(symbol, 'price,summaryDetail,defaultKeyStatistics,assetProfile,financialData,incomeStatementHistory,majorHoldersBreakdown');
}

export async function fetchYFChart(symbol: string, range: string = '3mo', interval: string = '1d') {
    const { cookie, crumb } = await getYFSession();
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?crumb=${crumb}&range=${range}&interval=${interval}`;

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Cookie': cookie || ''
        },
        timeout: 10000
    });

    return data?.chart?.result?.[0];
}
