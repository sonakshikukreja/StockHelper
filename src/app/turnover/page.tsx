'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { fmtNum, changeSign } from '@/lib/utils';

export default function TurnoverPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalTurnover, setTotalTurnover] = useState(0);
    const [sortKey, setSortKey] = useState<string>('turnover');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const resp = await fetch('/api/nse/turnover');
            const json = await resp.json();
            if (json.error) throw new Error(json.details || json.error);
            setData(json.data || []);
            setTotalTurnover(json.totalTurnover || 0);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch turnover data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const toggleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const sorted = [...data].sort((a, b) => {
        const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
        return sortDir === 'desc' ? bv - av : av - bv;
    });

    const thSort = (key: string, label: string) => (
        <th onClick={() => toggleSort(key)} style={{ cursor: 'pointer' }}>
            {label}{sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
        </th>
    );

    const top10 = data.slice(0, 10).map(r => ({ name: r.ticker, turnover: r.turnover }));
    const topStock = data[0];

    return (
        <>
            <div className="page-header">
                <h1>Stock Turnover Data</h1>
                <p>Most actively traded stocks by value (₹ Cr) — live from NSE.</p>
            </div>

            <div className="info-ribbon">
                <strong style={{ color: 'var(--text-primary)' }}>Live NSE Data:</strong>&nbsp;
                {loading ? 'Fetching most-active stocks…' : `${data.length} stocks · Total traded value: ₹${fmtNum(totalTurnover)} Cr`}
                <button
                    onClick={fetchData}
                    disabled={loading}
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                    {loading ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />} Refresh
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: '16px', color: 'var(--danger)', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <AlertCircle size={20} />
                    <div>
                        <div style={{ fontWeight: 700 }}>NSE API Unavailable</div>
                        <div style={{ fontSize: 13, opacity: 0.8 }}>{error}</div>
                    </div>
                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '6px 12px' }} onClick={fetchData}>Retry</button>
                </div>
            )}

            {/* Summary metrics */}
            {!loading && data.length > 0 && (
                <div className="metric-grid" style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Total NSE Turnover', value: `₹${fmtNum(totalTurnover)} Cr`, sub: 'All stocks today', subClass: 'up' as const },
                        { label: 'Highest Turnover', value: topStock?.ticker || '—', sub: topStock ? `₹${fmtNum(topStock.turnover)} Cr` : '—', subClass: 'neutral' as const },
                        { label: 'Most Traded', value: topStock?.ticker || '—', sub: topStock ? `Vol: ${fmtNum(topStock.volume, 0)}` : '—', subClass: 'up' as const },
                        { label: 'No. of Stocks', value: `${data.length}`, sub: 'In active list', subClass: 'neutral' as const },
                    ].map(m => (
                        <div className="metric-card" key={m.label}>
                            <div className="metric-label">{m.label}</div>
                            <div className="metric-value" style={{ fontSize: 18 }}>{m.value}</div>
                            <div className={`metric-sub ${m.subClass}`}>{m.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Bar chart */}
            {!loading && top10.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="section-header"><h2>Top 10 Stocks by Turnover (₹ Cr)</h2></div>
                    <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={top10} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} width={50} />
                                <Tooltip formatter={(v: number | undefined) => [`₹${fmtNum(v ?? 0)} Cr`, 'Turnover']} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="turnover" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                    {top10.map((_, i) => (
                                        <Cell key={i} fill={i === 0 ? '#3b82f6' : i === 1 ? '#06b6d4' : i < 4 ? '#8b5cf6' : '#334155'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="card">
                <div className="section-header">
                    <h2>Full Turnover Table</h2>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click column header to sort</span>
                </div>
                <div className="table-wrap">
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Loader2 size={32} className="spin" style={{ marginBottom: 16 }} />
                            <p>Fetching live turnover data from NSE…</p>
                        </div>
                    ) : (
                        <table>
                            <thead><tr>
                                <th>#</th><th>Stock</th>
                                {thSort('ltp', 'LTP')}
                                <th>Day Chg</th>
                                {thSort('volume', 'Volume')}
                                {thSort('turnover', 'Turnover (Cr)')}
                            </tr></thead>
                            <tbody>
                                {sorted.map((r, i) => (
                                    <tr key={r.ticker}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{r.ticker}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.name?.slice(0, 26)}</div>
                                        </td>
                                        <td className="td-mono">₹{fmtNum(r.ltp)}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {r.changePct >= 0 ? <ArrowUpRight size={13} color="var(--success)" /> : <ArrowDownRight size={13} color="var(--danger)" />}
                                                <span style={{ fontSize: 12, fontWeight: 600, color: r.changePct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                    {changeSign(r.changePct)}{fmtNum(r.changePct)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="td-mono">{r.volume?.toLocaleString('en-IN') || '—'}</td>
                                        <td className="td-mono" style={{ fontWeight: 600 }}>₹{fmtNum(r.turnover)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
