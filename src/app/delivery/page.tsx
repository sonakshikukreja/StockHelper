'use client';
import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { Truck, Loader2, AlertCircle, ChevronUp, ChevronDown, ShoppingBag } from 'lucide-react';
import { fmtNum, changeSign } from '@/lib/utils';

export default function DeliveryPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'deliveryPct', direction: 'desc' });
    const [buying, setBuying] = useState<string | null>(null);

    const handleBuy = async (symbol: string, price: number) => {
        setBuying(symbol);
        try {
            const resp = await fetch('/api/paper/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, price, aiVerdict: 'BUY' })
            });
            const json = await resp.json();
            if (json.error) throw new Error(json.error);
            const label = price > 10000
                ? `✅ Bought 1 share of ${symbol} for ₹${fmtNum(json.amount)}!`
                : `✅ Successfully bought ${json.quantity} shares of ${symbol} for ₹10,000!`;
            alert(label);
        } catch (err: any) {
            alert(`❌ Trade Failed: ${err.message}`);
        } finally {
            setBuying(null);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const resp = await fetch('/api/nse/delivery');
            const json = await resp.json();
            if (json.error) throw new Error(json.details || json.error);
            setData(json.data || []);
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to connect to API');
        } finally {
            setLoading(false);
        }
    };

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!] ?? 0;
                const bValue = b[sortConfig.key!] ?? 0;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    const chartData = data.slice(0, 10).map(r => ({
        name: r.symbol,
        today: r.deliveryPct,
    }));

    return (
        <>
            <div className="page-header">
                <h1>Most Delivered Stocks</h1>
                <p>Top 50 large-cap stocks (Mcap &gt; 25,000 Cr) with highest delivery percentage today.</p>
            </div>

            <div className="info-ribbon">
                <Truck size={14} color="var(--accent)" />
                <strong style={{ color: 'var(--text-primary)' }}>Real-Time Data:</strong>&nbsp;
                {loading ? 'Fetching large-cap delivery rankings...' : 'NSE EOD Delivery data for Nifty 100/Next 50 stocks.'}
                <button
                    onClick={fetchData}
                    disabled={loading}
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                    {loading ? <Loader2 size={12} className="spin" /> : 'Refresh'}
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: '16px', color: 'var(--danger)', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <AlertCircle size={20} />
                    <div>
                        <div style={{ fontWeight: 700 }}>Data Fetch Failed</div>
                        <div style={{ fontSize: 13, opacity: 0.8 }}>{error}</div>
                    </div>
                </div>
            )}

            {/* Delivery % chart */}
            {!loading && data.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="section-header">
                        <h2>Top Delivery % — Today</h2>
                    </div>
                    <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 10 }} barGap={2} barSize={16}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={40} />
                                <Tooltip formatter={((v: unknown) => [`${fmtNum((v as number) ?? 0)}%`, 'Delivery %']) as never} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="today" name="today" radius={[4, 4, 0, 0]}>
                                    {chartData.map((d, i) => (
                                        <Cell key={i} fill={d.today >= 60 ? '#10b981' : d.today >= 48 ? '#3b82f6' : '#ef4444'} />
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
                    <h2>Real Delivery Rankings (Top 50)</h2>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click column header to sort</span>
                </div>
                <div className="table-wrap">
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Loader2 size={32} className="spin" style={{ marginBottom: 16 }} />
                            <p>Calculating delivery data for Large Cap stocks...</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('symbol')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Symbol {getSortIndicator('symbol')}</div>
                                    </th>
                                    <th onClick={() => handleSort('ltp')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>LTP {getSortIndicator('ltp')}</div>
                                    </th>
                                    <th onClick={() => handleSort('changePct')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Day Chg {getSortIndicator('changePct')}</div>
                                    </th>
                                    <th onClick={() => handleSort('deliveryPct')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Delivery % {getSortIndicator('deliveryPct')}</div>
                                    </th>
                                    <th onClick={() => handleSort('totalVol')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>Volume {getSortIndicator('totalVol')}</div>
                                    </th>
                                    <th onClick={() => handleSort('deliveryVol')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>Del. Quantity {getSortIndicator('deliveryVol')}</div>
                                    </th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((r) => (
                                    <tr key={r.symbol}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{r.symbol}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.name}</div>
                                        </td>
                                        <td className="td-mono">₹{fmtNum(r.ltp)}</td>
                                        <td>
                                            <span className={`badge ${r.changePct >= 0 ? 'badge-green' : 'badge-red'}`}>
                                                {changeSign(r.changePct)}{fmtNum(r.changePct)}%
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, minWidth: 60 }}>
                                                    <div className="progress-bar">
                                                        <div className="progress-fill" style={{
                                                            width: `${r.deliveryPct}%`,
                                                            background: r.deliveryPct >= 60 ? 'var(--success)' : r.deliveryPct >= 48 ? 'var(--primary)' : 'var(--danger)'
                                                        }} />
                                                    </div>
                                                </div>
                                                <span className="td-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                                                    {fmtNum(r.deliveryPct)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }} className="td-mono">{r.totalVol?.toLocaleString('en-IN')}</td>
                                        <td style={{ textAlign: 'right' }} className="td-mono">{r.deliveryVol?.toLocaleString('en-IN')}</td>
                                        <td>
                                            <button
                                                onClick={() => handleBuy(r.symbol, r.ltp)}
                                                disabled={buying === r.symbol}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    opacity: buying === r.symbol ? 0.7 : 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                <ShoppingBag size={12} />
                                                {buying === r.symbol ? 'Buying...' : r.ltp > 10000 ? 'Buy 1' : 'Buy ₹10k'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="info-ribbon" style={{ marginTop: 16 }}>
                💡 <strong style={{ color: 'var(--text-primary)' }}>Analysis:</strong>&nbsp;
                High delivery % in large cap stocks ({'>'}25,000 Cr) reflects long-term investor accumulation. This screen filters for stability and institutional conviction.
            </div>

            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
