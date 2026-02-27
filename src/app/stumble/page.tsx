'use client';
import { useState, useEffect, useMemo } from 'react';
import { Brain, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { fmtNum } from '@/lib/utils';
import { SYMBOLS } from '@/lib/nseSymbols';
import StockAnalysisView from '@/components/StockAnalysisView';

type Category = 'large' | 'mid' | 'small' | 'micro';

interface StockBase {
    symbol: string;
    ticker: string;
    marketCap: number;
    companyName: string;
}

export default function StumblePage() {
    const [pool, setPool] = useState<StockBase[]>([]);
    const [loadingPool, setLoadingPool] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('Wait for market data to load…');

    const loadMarketPool = async () => {
        setLoadingPool(true); setProgress(0); setError('');
        const chunkSize = 200;
        const allStocks: StockBase[] = [];
        try {
            for (let i = 0; i < SYMBOLS.length; i += chunkSize) {
                const chunk = SYMBOLS.slice(i, i + chunkSize);
                // Create both NSE and BSE versions
                const bseChunk = chunk.map(s => `${s}.BO`);
                const nseChunk = chunk.map(s => `${s}.NS`);
                const combined = [...nseChunk, ...bseChunk];

                // Fetch in smaller sub-chunks to avoid URL length issues
                const subSize = 100;
                for (let j = 0; j < combined.length; j += subSize) {
                    const subChunk = combined.slice(j, j + subSize);
                    const resp = await fetch(`/api/yf/batch?symbols=${subChunk.join(',')}`);
                    const json = await resp.json();
                    if (json.stocks) {
                        allStocks.push(...json.stocks.map((s: any) => ({
                            symbol: s.symbol,
                            ticker: s.ticker,
                            marketCap: s.marketCap,
                            companyName: s.companyName
                        })));
                    }
                }
                setProgress(Math.round(((i + chunkSize) / SYMBOLS.length) * 100));
            }
            setPool(allStocks);
            setStatus(`Market loaded! ${allStocks.length.toLocaleString()} All BSE/NSE shares indexed. Pick a category.`);
        } catch (e: any) {
            setError('Failed to load market data pool. Please refresh.');
        } finally {
            setLoadingPool(false);
        }
    };

    useEffect(() => {
        loadMarketPool();
    }, []);

    const stumble = async (category: Category) => {
        if (pool.length === 0) return;

        let filtered: StockBase[] = [];
        if (category === 'large') filtered = pool.filter(s => s.marketCap > 200000000000); // 20,000 Cr
        else if (category === 'mid') filtered = pool.filter(s => s.marketCap > 50000000000 && s.marketCap <= 200000000000);
        else if (category === 'small') filtered = pool.filter(s => s.marketCap > 5000000000 && s.marketCap <= 50000000000);
        else if (category === 'micro') filtered = pool.filter(s => s.marketCap <= 5000000000);

        if (filtered.length === 0) {
            setError(`No stocks found in ${category} cap category within current pool.`);
            return;
        }

        const random = filtered[Math.floor(Math.random() * filtered.length)];

        setError('');
        setLoadingAnalysis(true);
        setSelectedStock(null);

        try {
            const resp = await fetch(`/api/yf/quote?symbol=${encodeURIComponent(random.symbol)}`);
            const json = await resp.json();
            if (json.error) throw new Error(json.error);
            setSelectedStock(json);
        } catch (err: any) {
            setError(`Failed to fetch analysis for ${random.symbol}. Try again.`);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const categories = [
        { id: 'large', label: 'Large Cap', range: '> 20,000 Cr', color: '#3b82f6' },
        { id: 'mid', label: 'Mid Cap', range: '5,000 - 20,000 Cr', color: '#8b5cf6' },
        { id: 'small', label: 'Small Cap', range: '500 - 5,000 Cr', color: '#06b6d4' },
        { id: 'micro', label: 'Micro Cap', range: '< 500 Cr', color: '#10b981' },
    ];

    return (
        <>
            <div className="page-header">
                <h1>Stumble Stock Discovery</h1>
                <p>Don't know what to analyze? Pick a category and discover all BSE/NSE shares indexed by AI.</p>
            </div>

            <div className="info-ribbon">
                <Sparkles size={14} color="var(--accent)" />
                Discover hidden gems: <strong style={{ color: 'var(--text-primary)' }}>{status}</strong>
                {pool.length > 0 && !loadingPool && (
                    <button onClick={loadMarketPool} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <RefreshCw size={12} /> Reload Pool ({pool.length})
                    </button>
                )}
            </div>

            {loadingPool && (
                <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Building Full Market Pool… {progress}%</div>
                    <div style={{ width: '100%', maxWidth: 300, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 30 }}>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className="card"
                        onClick={() => stumble(cat.id as Category)}
                        disabled={loadingPool || loadingAnalysis}
                        style={{
                            cursor: 'pointer',
                            textAlign: 'center',
                            padding: '24px 16px',
                            transition: 'all 0.2s ease',
                            border: '1px solid var(--border)',
                            background: 'var(--card-bg)',
                            opacity: loadingPool ? 0.6 : 1,
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{cat.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{cat.range}</div>
                        <div style={{ marginTop: 16, fontSize: 11, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stumble →</div>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: cat.color }} />
                    </button>
                ))}
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 18px', color: 'var(--danger)', fontSize: 13, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {loadingAnalysis && (
                <div className="ai-panel">
                    <div className="ai-loading">
                        <div className="ai-spinner" />
                        Fetching random pick and performing deep analysis…
                    </div>
                </div>
            )}

            {selectedStock && !loadingAnalysis && (
                <div>
                    <div style={{ textAlign: 'center', padding: '40px 20px', marginBottom: 20, background: 'linear-gradient(180deg, var(--primary)05, transparent)', borderRadius: 24, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>Random Discovery</div>
                        <h2 style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            {selectedStock.symbol}
                        </h2>
                        <div style={{ fontSize: 18, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>{selectedStock.companyName}</div>
                    </div>
                    <StockAnalysisView data={selectedStock} />
                </div>
            )}

            {!selectedStock && !loadingAnalysis && !loadingPool && (
                <div className="empty-state" style={{ minHeight: 200 }}>
                    <Brain size={48} color="var(--border)" />
                    <p style={{ marginTop: 16 }}>Market Pool Ready. Press a button above to discover a stock.</p>
                </div>
            )}

            <style>{`
                .card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -10px rgba(0,0,0,0.15); }
                .card:active { transform: translateY(-1px); }
                .spin { animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
}
