'use client';
import { useState } from 'react';
import { Plus, X, Search, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { fmtNum, changeSign, changeClass } from '@/lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const POPULAR = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'WIPRO', 'TATAMOTORS', 'ITC', 'SBIN'];

const METRICS = [
    { key: 'ltp', label: 'LTP (₹)', format: (v: number) => `₹${fmtNum(v)}`, higher: true },
    { key: 'changePct', label: 'Day Change %', format: (v: number) => `${changeSign(v)}${fmtNum(v)}%`, higher: true },
    { key: 'pe', label: 'P/E Ratio', format: (v: number) => v ? `${fmtNum(v)}x` : '—', higher: false },
    { key: 'eps', label: 'EPS (₹)', format: (v: number) => v ? `₹${fmtNum(v)}` : '—', higher: true },
    { key: 'bookValue', label: 'Book Value (₹)', format: (v: number) => v ? `₹${fmtNum(v)}` : '—', higher: true },
    { key: 'priceToBook', label: 'Price / Book', format: (v: number) => v ? `${fmtNum(v)}x` : '—', higher: false },
    { key: 'dividendYield', label: 'Dividend Yield %', format: (v: number) => v ? `${fmtNum(v)}%` : '—', higher: true },
    { key: 'marketCap', label: 'Mkt Cap (Cr)', format: (v: number) => v ? `₹${fmtNum(v / 10000000, 0)} Cr` : '—', higher: true },
    { key: 'week52High', label: '52W High (₹)', format: (v: number) => `₹${fmtNum(v)}`, higher: true },
    { key: 'week52Low', label: '52W Low (₹)', format: (v: number) => `₹${fmtNum(v)}`, higher: false },
    { key: 'volume', label: 'Volume', format: (v: number) => v?.toLocaleString('en-IN') || '—', higher: true },
    { key: 'sector', label: 'Sector', format: (v: any) => v || '—', higher: null },
    { key: 'industry', label: 'Industry', format: (v: any) => v || '—', higher: null },
];

export default function ComparePage() {
    const [tickers, setTickers] = useState<string[]>(['RELIANCE', 'TCS']);
    const [input, setInput] = useState('');
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const addTicker = (t: string) => {
        const sym = t.trim().toUpperCase();
        if (!sym || tickers.includes(sym) || tickers.length >= 4) return;
        setTickers(prev => [...prev, sym]);
        setInput('');
    };

    const removeTicker = (t: string) => setTickers(prev => prev.filter(x => x !== t));

    const compare = async () => {
        if (tickers.length < 2) return;
        setLoading(true); setError('');
        try {
            const resp = await fetch(`/api/yf/batch?symbols=${tickers.join(',')}`);
            const json = await resp.json();
            if (json.error) throw new Error(json.error);
            setStocks(json.stocks || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const getBest = (key: string, higher: boolean | null) => {
        if (higher === null || stocks.length < 2) return null;
        const vals = stocks.map(s => s[key] ?? (higher ? -Infinity : Infinity));
        const best = higher ? Math.max(...vals) : Math.min(...vals.filter((v: number) => v > 0));
        return best;
    };

    return (
        <>
            <div className="page-header">
                <h1>Stock Comparison</h1>
                <p>Side-by-side comparison of up to 4 stocks — P/E, EPS, dividend yield, book value &amp; more.</p>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">📊 Select Stocks to Compare (2–4)</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    {tickers.map((t, i) => (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${COLORS[i]}22`, border: `1px solid ${COLORS[i]}55`, borderRadius: 8, padding: '6px 10px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i] }} />
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{t}</span>
                            <button onClick={() => removeTicker(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    {tickers.length < 4 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input
                                className="input-field"
                                placeholder="Add symbol…"
                                value={input}
                                onChange={e => setInput(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && addTicker(input)}
                                style={{ minWidth: 140 }}
                            />
                            <button className="btn btn-ghost" onClick={() => addTicker(input)}><Plus size={14} /></button>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {POPULAR.map(s => (
                        <button key={s} className={`chip${tickers.includes(s) ? ' active' : ''}`}
                            onClick={() => tickers.includes(s) ? removeTicker(s) : addTicker(s)}>
                            {s}
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary" onClick={compare} disabled={loading || tickers.length < 2}>
                    {loading ? <><Loader2 size={14} className="spin" /> Fetching…</> : <><Search size={14} /> Compare Stocks</>}
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: 16, color: 'var(--danger)', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {stocks.length >= 2 && (
                <div className="card">
                    <div className="section-header">
                        <h2>Comparison Table</h2>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🟢 = Best in metric</span>
                    </div>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    {stocks.map((s, i) => (
                                        <th key={s.symbol} style={{ color: COLORS[i] }}>{s.symbol}<div style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>{s.companyName?.slice(0, 18)}</div></th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {METRICS.map(m => {
                                    const best = getBest(m.key, m.higher);
                                    return (
                                        <tr key={m.key}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>{m.label}</td>
                                            {stocks.map((s, i) => {
                                                const val = s[m.key];
                                                const isBest = best !== null && val === best && m.higher !== null;
                                                return (
                                                    <td key={i} className="td-mono" style={{
                                                        background: isBest ? `${COLORS[i]}18` : undefined,
                                                        fontWeight: isBest ? 700 : undefined,
                                                        color: m.key === 'changePct' ? (val >= 0 ? 'var(--success)' : 'var(--danger)') : undefined,
                                                    }}>
                                                        {m.format(val)}
                                                        {isBest && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && stocks.length === 0 && (
                <div className="empty-state">
                    <TrendingUp size={40} />
                    <p>Select 2–4 stocks above and click Compare to see side-by-side fundamentals</p>
                </div>
            )}
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
