import axios from 'axios';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
    try {
        const fcResp = await axios.get('https://fc.yahoo.com', {
            headers: { 'User-Agent': USER_AGENT }
        }).catch(err => err.response);

        const cookie = fcResp.headers['set-cookie']?.[0]?.split(';')?.[0] || null;

        const crumbResp = await axios.get('https://query2.finance.yahoo.com/v1/test/getcrumb', {
            headers: {
                'User-Agent': USER_AGENT,
                'Cookie': cookie || ''
            }
        });

        const crumb = crumbResp.data;
        console.log('Crumb:', crumb);

        const symbol = 'RELIANCE.NS';
        const modules = 'price,summaryDetail,defaultKeyStatistics,assetProfile,financialData,majorHoldersBreakdown,incomeStatementHistory';
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?crumb=${crumb}&modules=${modules}`;

        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Cookie': cookie || ''
            }
        });

        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err.message);
    }
}

test();
