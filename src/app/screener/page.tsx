'use client';
import { useState, useEffect, useMemo } from 'react';
import { Filter, Loader2, AlertCircle, RefreshCw, TrendingUp, Search as SearchIcon } from 'lucide-react';
import { fmtNum } from '@/lib/utils';
import { SYMBOLS } from '@/lib/nseSymbols';

type Mode = 'dividend' | 'value' | 'pe' | 'marketCap';

export default function ScreenerPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<Mode>('marketCap');
    const [search, setSearch] = useState('');

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'marketCap', direction: 'desc' });

    // Filters
    const [minDiv, setMinDiv] = useState(0);
    const [maxPE, setMaxPE] = useState(100);

    const loadAllData = async () => {
        setLoading(true); setError(''); setProgress(0);
        const chunkSize = 250;
        const chunks = [];
        for (let i = 0; i < SYMBOLS.length; i += chunkSize) {
            chunks.push(SYMBOLS.slice(i, i + chunkSize));
        }

        const allStocks: any[] = [];
        let completed = 0;

        try {
            // Concurrent fetching with a small limit to avoid blocking
            for (let i = 0; i < chunks.length; i++) {
                const resp = await fetch(`/api/yf/batch?symbols=${chunks[i].join(',')}`);
                const json = await resp.json();
                if (json.stocks) {
                    allStocks.push(...json.stocks);
                }
                completed++;
                setProgress(Math.round((completed / chunks.length) * 100));
            }
            setData(allStocks);
            setLoaded(true);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch some data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleHeaderClick = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const filtered = useMemo(() => {
        return data.filter(s => {
            const matchesSearch = s.symbol.toLowerCase().includes(search.toLowerCase()) ||
                s.companyName.toLowerCase().includes(search.toLowerCase());
            if (!matchesSearch) return false;

            if (mode === 'dividend' && s.dividendYield < minDiv) return false;
            if (mode === 'pe' && (s.pe <= 0 || s.pe > maxPE)) return false;

            return true;
        });
    }, [data, search, mode, minDiv, maxPE]);

    const sorted = useMemo(() => {
        if (!sortConfig) return filtered;
        return [...filtered].sort((a, b) => {
            const aVal = a[sortConfig.key] || 0;
            const bVal = b[sortConfig.key] || 0;
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filtered, sortConfig]);

    // Sync mode chips with sortConfig if needed, but keeping them separate for preset filters
    useEffect(() => {
        if (mode === 'marketCap') setSortConfig({ key: 'marketCap', direction: 'desc' });
        if (mode === 'dividend') setSortConfig({ key: 'dividendYield', direction: 'desc' });
        if (mode === 'value') setSortConfig({ key: 'priceToBook', direction: 'asc' });
        if (mode === 'pe') setSortConfig({ key: 'pe', direction: 'asc' });
    }, [mode]);

    const stats = useMemo(() => {
        if (!data.length) return null;
        const validPE = data.filter(s => s.pe > 0);
        return {
            avgDiv: data.reduce((s, r) => s + r.dividendYield, 0) / data.length,
            avgPE: validPE.length ? validPE.reduce((s, r) => s + r.pe, 0) / validPE.length : 0,
            totalCap: data.reduce((s, r) => s + r.marketCap, 0)
        };
    }, [data]);

    return (
        <>
            <div className="page-header">
                <h1>Full NSE Market Screener</h1>
                <p>Screen all {SYMBOLS.length} NSE listed stocks by Dividend Yield, P/E, and Price-to-Book ratio.</p>
            </div>

            <div className="info-ribbon">
                <TrendingUp size={14} color="var(--accent)" />
                <strong style={{ color: 'var(--text-primary)' }}>Full Market:</strong>&nbsp;
                Loads thousands of stocks in batches. Sorting and filtering happen locally for maximum speed.
                <button onClick={loadAllData} disabled={loading} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {loading ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />} {loaded ? 'Refresh Market Data' : 'Load All NSE stocks'}
                </button>
            </div>

            {loading && (
                <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: '30px 20px' }}>
                    <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Fetching Market Data… {progress}%</div>
                    <div style={{ width: '100%', maxWidth: 400, height: 6, background: 'var(--border)', borderRadius: 3, margin: '0 auto', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Processing 2,200+ stocks from Yahoo Finance in batches</p>
                </div>
            )}

            {loaded && !loading && stats && (
                <div className="metric-grid" style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Market Coverage', value: `${data.length}`, sub: `of ${SYMBOLS.length} listed`, subClass: 'neutral' },
                        { label: 'Avg Mkt Dividend', value: `${fmtNum(stats.avgDiv)}%`, sub: 'Entire NSE average', subClass: 'up' },
                        { label: 'Market P/E', value: `${fmtNum(stats.avgPE)}x`, sub: 'Trailing average', subClass: 'neutral' },
                        { label: 'Total Mkt Cap', value: `₹${fmtNum(stats.totalCap / 10000000, 0)} Cr`, sub: 'Notional value', subClass: 'up' },
                    ].map(m => (
                        <div className="metric-card" key={m.label}>
                            <div className="metric-label">{m.label}</div>
                            <div className="metric-value" style={{ fontSize: 18 }}>{m.value}</div>
                            <div className={`metric-sub ${m.subClass}`}>{m.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="chip-group" style={{ marginBottom: 0 }}>
                    {([['marketCap', '🏦 Market Cap'], ['dividend', '💰 Dividend Yield'], ['value', '📊 Price / Book'], ['pe', '📈 P/E Ratio']] as [Mode, string][]).map(([key, label]) => (
                        <button key={key} className={`chip${mode === key ? ' active' : ''}`} onClick={() => setMode(key)}>{label}</button>
                    ))}
                </div>

                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input-field"
                        placeholder="Search symbols or names…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: 32, height: 36, width: '100%' }}
                    />
                </div>

                {mode === 'dividend' && (
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        Min Yield:
                        <input type="range" min={0} max={10} step={0.5} value={minDiv} onChange={e => setMinDiv(+e.target.value)} style={{ width: 100 }} />
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>&gt;{fmtNum(minDiv)}%</span>
                    </label>
                )}
                {mode === 'pe' && (
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        Max P/E:
                        <input type="range" min={5} max={100} step={5} value={maxPE} onChange={e => setMaxPE(+e.target.value)} style={{ width: 100 }} />
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>&lt;{maxPE}x</span>
                    </label>
                )}
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: 16, color: 'var(--danger)', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="card">
                <div className="section-header">
                    <h2>Sorted Market Ranking</h2>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Found {sorted.length} stocks</span>
                </div>
                <div className="table-wrap">
                    {!loaded && !loading ? (
                        <div className="empty-state">
                            <TrendingUp size={40} />
                            <p>Click "Load All NSE stocks" to fetch and rank the entire market</p>
                            <p style={{ fontSize: 12 }}>Loads ~2,200 stocks in one pass for full sorting capability.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>#</th>
                                    <th onClick={() => handleHeaderClick('symbol')} style={{ cursor: 'pointer' }}>
                                        Stock {sortConfig?.key === 'symbol' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleHeaderClick('ltp')} style={{ cursor: 'pointer' }}>
                                        LTP (₹) {sortConfig?.key === 'ltp' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleHeaderClick('changePct')} style={{ cursor: 'pointer' }}>
                                        Day Chg% {sortConfig?.key === 'changePct' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleHeaderClick('marketCap')} style={{ cursor: 'pointer' }}>
                                        Market Cap (Cr) {sortConfig?.key === 'marketCap' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleHeaderClick('dividendYield')} style={{ cursor: 'pointer' }}>
                                        Div Yield {sortConfig?.key === 'dividendYield' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleHeaderClick('pe')} style={{ cursor: 'pointer' }}>
                                        P/E {sortConfig?.key === 'pe' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleHeaderClick('priceToBook')} style={{ cursor: 'pointer' }}>
                                        P/B {sortConfig?.key === 'priceToBook' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleHeaderClick('eps')} style={{ cursor: 'pointer' }}>
                                        EPS (₹) {sortConfig?.key === 'eps' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.slice(0, 500).map((s, i) => (
                                    <tr key={s.ticker}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{s.symbol}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.companyName}</div>
                                        </td>
                                        <td className="td-mono">₹{fmtNum(s.ltp)}</td>
                                        <td><span className={`badge ${s.changePct >= 0 ? 'badge-green' : 'badge-red'}`}>{s.changePct >= 0 ? '+' : ''}{fmtNum(s.changePct)}%</span></td>
                                        <td className="td-mono">₹{fmtNum(s.marketCap / 10000000, 0)} Cr</td>
                                        <td className="td-mono" style={{ color: s.dividendYield >= 2 ? 'var(--success)' : undefined, fontWeight: s.dividendYield >= 2 ? 700 : undefined }}>
                                            {s.dividendYield ? `${fmtNum(s.dividendYield)}%` : '—'}
                                        </td>
                                        <td className="td-mono">{s.pe ? `${fmtNum(s.pe)}x` : '—'}</td>
                                        <td className="td-mono" style={{ color: s.priceToBook > 0 && s.priceToBook < 2 ? 'var(--success)' : undefined }}>
                                            {s.priceToBook ? `${fmtNum(s.priceToBook)}x` : '—'}
                                        </td>
                                        <td className="td-mono">{s.eps ? `₹${fmtNum(s.eps)}` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {sorted.length > 500 && (
                        <div style={{ padding: 20, textAlign: 'center', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
                            Showing top 500 results for performance. Use filters to narrow down the list.
                        </div>
                    )}
                </div>
            </div>
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
