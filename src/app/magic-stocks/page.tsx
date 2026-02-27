'use client';
import { useState, useEffect, useMemo } from 'react';
import { Crown, Sparkles, Loader2, AlertCircle, RefreshCw, BarChart3, TrendingUp, Search } from 'lucide-react';
import { fmtNum } from '@/lib/utils';
import { SYMBOLS } from '@/lib/nseSymbols';
import StockAnalysisView from '@/components/StockAnalysisView';

type Category = 'large' | 'mid' | 'small' | 'micro';

interface MagicStock {
    symbol: string;
    ticker: string;
    companyName: string;
    marketCap: number;
    priceChangePct: number;
    volMultiplier: number;
    ltp: number;
    category: Category;
}

export default function MagicStocksPage() {
    const [magicStocks, setMagicStocks] = useState<MagicStock[]>([]);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [activeCategory, setActiveCategory] = useState<Category>('large');
    const [selectedStockData, setSelectedStockData] = useState<any>(null);
    const [loadingStock, setLoadingStock] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('Ready to scan for magic momentum stocks.');

    const categories: { id: Category; label: string; range: string; color: string }[] = [
        { id: 'large', label: 'Large Cap', range: '> 20,000 Cr', color: '#3b82f6' },
        { id: 'mid', label: 'Mid Cap', range: '5,000 - 20,000 Cr', color: '#8b5cf6' },
        { id: 'small', label: 'Small Cap', range: '500 - 5,000 Cr', color: '#06b6d4' },
        { id: 'micro', label: 'Micro Cap', range: '< 500 Cr', color: '#10b981' },
    ];

    const runMagicScan = async () => {
        setScanning(true);
        setProgress(0);
        setError('');
        setMagicStocks([]);
        setStatus('Fetching initial market quotes…');

        const allMatches: MagicStock[] = [];
        const nsePool = SYMBOLS.map(s => `${s}.NS`);
        const bsePool = SYMBOLS.map(s => `${s}.BO`);
        const fullPool = [...nsePool, ...bsePool];

        // Step 1: Pre-filter by Market Cap using batch quotes (Current quotes are cheap)
        // We scan everything to categorize them
        const chunkSize = 200;
        try {
            for (let i = 0; i < fullPool.length; i += chunkSize) {
                const chunk = fullPool.slice(i, i + chunkSize);
                setStatus(`Scanning market caps… ${Math.round((i / fullPool.length) * 100)}%`);
                setProgress(Math.round((i / fullPool.length) * 50)); // 0-50% for Cap scanning

                const resp = await fetch(`/api/yf/batch?symbols=${chunk.join(',')}`);
                const json = await resp.json();

                if (json.stocks) {
                    const candidatesInChunk = json.stocks.map((s: any) => ({
                        symbol: s.symbol,
                        ticker: s.ticker,
                        companyName: s.companyName,
                        marketCap: s.marketCap,
                    }));

                    // Step 2: For each candidate, check Magic Criteria (Momentum)
                    // We only scan symbols that have a valid marketCap to save time
                    const validCandidates = candidatesInChunk.filter((s: any) => s.marketCap > 0);

                    // Further scan in smaller sub-chunks for historical analysis
                    const subSize = 10;
                    for (let k = 0; k < validCandidates.length; k += subSize) {
                        const subChunk = validCandidates.slice(k, k + subSize);
                        const syms = subChunk.map((s: any) => s.symbol).join(',');

                        const scanResp = await fetch(`/api/yf/magic-scan?symbols=${syms}`);
                        const scanJson = await scanResp.json();

                        if (scanJson.matches) {
                            scanJson.matches.forEach((match: any) => {
                                const base = validCandidates.find((c: any) => c.symbol === match.symbol);
                                if (base) {
                                    let cat: Category = 'micro';
                                    const mcapCr = base.marketCap / 10000000; // Cr
                                    if (mcapCr > 20000) cat = 'large';
                                    else if (mcapCr > 5000) cat = 'mid';
                                    else if (mcapCr > 500) cat = 'small';

                                    allMatches.push({
                                        ...base,
                                        ...match,
                                        category: cat
                                    });
                                }
                            });
                        }
                    }
                }

                // Allow UI to breathe
                if (i % 600 === 0) setMagicStocks([...allMatches]);
            }

            setMagicStocks(allMatches);
            setProgress(100);
            setStatus(`Scan complete! Found ${allMatches.length} magic momentum stocks.`);
        } catch (e: any) {
            setError('Scan interrupted. Try reloading the pool.');
        } finally {
            setScanning(false);
        }
    };

    const filteredResults = useMemo(() => {
        return magicStocks.filter(s => s.category === activeCategory)
            .sort((a, b) => b.volMultiplier - a.volMultiplier);
    }, [magicStocks, activeCategory]);

    const viewDetails = async (symbol: string) => {
        setLoadingStock(true);
        setSelectedStockData(null);
        setError('');
        try {
            const resp = await fetch(`/api/yf/quote?symbol=${encodeURIComponent(symbol)}`);
            const json = await resp.json();
            if (json.error) throw new Error(json.error);
            setSelectedStockData(json);
        } catch (err: any) {
            setError(`Failed to fetch details for ${symbol}`);
        } finally {
            setLoadingStock(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <h1>Magic Stocks Discovery</h1>
                <p>Identifies stocks with high volume surges and strong price momentum over the last 23 trading days.</p>
            </div>

            <div className="info-ribbon">
                <Crown size={14} color="var(--accent)" />
                Criteria: <strong style={{ color: 'var(--text-primary)' }}>5D Vol &gt; 23D Vol</strong> &nbsp;and&nbsp; <strong style={{ color: 'var(--text-primary)' }}>23D Price Gain &gt; 5%</strong>
                <button onClick={runMagicScan} disabled={scanning} style={{ marginLeft: 'auto', background: 'var(--primary)', border: 'none', color: 'white', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {scanning ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} {scanning ? 'Scanning…' : 'Start Magic Scan'}
                </button>
            </div>

            {scanning && (
                <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>{status}</div>
                    <div style={{ width: '100%', maxWidth: 400, height: 6, background: 'var(--border)', borderRadius: 3, margin: '0 auto', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.4s ease' }} />
                    </div>
                </div>
            )}

            {!scanning && magicStocks.length > 0 && (
                <div style={{ background: 'var(--primary)08', border: '1px solid var(--primary)22', borderRadius: 12, padding: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
                    <Sparkles size={16} /> Total {magicStocks.length} momentum matches found across all categories.
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            style={{
                                flex: 1, padding: '16px', border: 'none', background: 'none', cursor: 'pointer',
                                fontSize: 14, fontWeight: 700, color: activeCategory === cat.id ? cat.color : 'var(--text-muted)',
                                borderBottom: activeCategory === cat.id ? `3px solid ${cat.color}` : '3px solid transparent',
                                transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                            }}
                        >
                            {cat.label}
                            <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.6 }}>{cat.range}</span>
                        </button>
                    ))}
                </div>

                <div style={{ padding: 20 }}>
                    {filteredResults.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                            <BarChart3 size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                            <div>{scanning ? 'Results will appear soon…' : 'No stocks in this category meet the magic criteria.'}</div>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Stock</th>
                                        <th>Price</th>
                                        <th>23D Momentum</th>
                                        <th>Vol Surge</th>
                                        <th>Volume Mult.</th>
                                        <th style={{ textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResults.map(s => (
                                        <tr key={s.ticker}>
                                            <td>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.symbol}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.companyName.slice(0, 30)}</div>
                                            </td>
                                            <td className="td-mono" style={{ fontWeight: 600 }}>₹{fmtNum(s.ltp)}</td>
                                            <td>
                                                <div className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <TrendingUp size={12} /> +{fmtNum(s.priceChangePct)}%
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {fmtNum(s.volMultiplier)}x Surge
                                                </div>
                                            </td>
                                            <td className="td-mono" style={{ fontSize: 11 }}>
                                                Avg 5D: {Math.round(s.avgVol5 / 1000)}k <br />
                                                Avg 23D: {Math.round(s.avgVol23 / 1000)}k
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button onClick={() => viewDetails(s.symbol)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                                                    Deep Analysis →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {loadingStock && (
                <div className="ai-panel" style={{ marginTop: 30 }}>
                    <div className="ai-loading">
                        <div className="ai-spinner" /> Performing AI Fundamental & Technical Analysis…
                    </div>
                </div>
            )}

            {selectedStockData && (
                <div style={{ marginTop: 30 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, transparent, var(--border))' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Momentum Leader: {selectedStockData.symbol}</span>
                        <div style={{ height: 1, flex: 1, background: 'linear-gradient(270deg, transparent, var(--border))' }} />
                    </div>
                    <StockAnalysisView data={selectedStockData} />
                </div>
            )}

            <style>{`
                .spin { animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
}
