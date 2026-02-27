'use client';
import { useState, useEffect, useMemo } from 'react';
import { Activity, Clock, Loader2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { fmtNum, fmtCr, changeSign } from '@/lib/utils';

export interface VolumeShockerRow {
    ticker: string;
    name: string;
    ltp: number;
    changePct: number;
    prevAvgVolume: number;
    todayVolume: number;
    spurts: number;
    turnover?: number;
    deliveryPct?: number;
    marketCap?: number;
}

type SortConfig = {
    key: keyof VolumeShockerRow | null;
    direction: 'asc' | 'desc';
};

export default function VolumeShockersPage() {
    const [data, setData] = useState<VolumeShockerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'spurts', direction: 'desc' });
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
            const resp = await fetch('/api/nse/volume-spurts');
            const json = await resp.json();

            if (json.error) {
                throw new Error(json.details || json.error);
            }

            // Map NSE API fields to our local structure
            // NSE fields: symbol, companyName, ltp, pChange, week1AvgVolume, volume, week1volChange, deliveryPercentage
            const mapped: VolumeShockerRow[] = (json.data || []).map((item: any) => ({
                ticker: item.symbol,
                name: item.companyName,
                ltp: item.ltp,
                changePct: item.pChange,
                prevAvgVolume: item.week1AvgVolume,
                todayVolume: item.volume,
                spurts: item.week1volChange,
                turnover: item.turnover ? item.turnover / 100 : 0,
                deliveryPct: item.deliveryPercentage || 0,
                marketCap: item.marketCap || 0,
            }));

            setData(mapped);

            const now = new Date();
            setLastUpdated(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to connect to NSE API');
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

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const handleSort = (key: keyof VolumeShockerRow) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof VolumeShockerRow) => {
        if (sortConfig.key !== key) return <ChevronUp size={14} style={{ opacity: 0.2 }} />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    return (
        <>
            <div className="page-header">
                <h1>Volume Shockers (Gainers)</h1>
                <p>Stocks with significant volume spurts today compared to their 5-day average volume.</p>
            </div>

            <div className="info-ribbon">
                <Activity size={14} color="var(--primary)" />
                <strong style={{ color: 'var(--text-primary)' }}>Market Status:</strong>&nbsp;
                {loading ? 'Fetching live data...' : `Data as on ${dateStr} ${lastUpdated || '...'}`}
                <button
                    onClick={fetchData}
                    disabled={loading}
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                    {loading ? <Loader2 size={12} className="spin" /> : <Activity size={12} />} Refresh
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: '16px', color: 'var(--danger)', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <AlertCircle size={20} />
                    <div>
                        <div style={{ fontWeight: 700 }}>NSE API Connection Failed</div>
                        <div style={{ fontSize: 13, opacity: 0.8 }}>{error} - Displaying mock data instead.</div>
                    </div>
                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '6px 12px' }} onClick={fetchData}>Retry</button>
                </div>
            )}

            <div className="card">
                <div className="section-header">
                    <h2>Volume Spurts Today</h2>
                    <div className="market-time" style={{ fontSize: 12 }}>
                        <Clock size={12} /> As on {dateStr} {lastUpdated}
                    </div>
                </div>
                <div className="table-wrap">
                    {loading && data.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Loader2 size={32} className="spin" style={{ marginBottom: 16 }} />
                            <p>Fetching real-time data from NSE...</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('ticker')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            Symbol {getSortIndicator('ticker')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('ltp')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            LTP {getSortIndicator('ltp')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('changePct')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            % Change {getSortIndicator('changePct')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('todayVolume')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            Volume {getSortIndicator('todayVolume')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('turnover')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            Turnover (Cr) {getSortIndicator('turnover')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('deliveryPct')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            Delivery % {getSortIndicator('deliveryPct')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('marketCap')} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            Mkt Cap (Cr) {getSortIndicator('marketCap')}
                                        </div>
                                    </th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((r) => (
                                    <tr key={r.ticker}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{r.ticker}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.name}</div>
                                        </td>
                                        <td className="td-mono">₹{fmtNum(r.ltp)}</td>
                                        <td>
                                            <span className={`badge ${r.changePct >= 0 ? 'badge-green' : 'badge-red'}`}>
                                                {changeSign(r.changePct)}{fmtNum(r.changePct)}%
                                            </span>
                                        </td>
                                        <td className="td-mono">{r.todayVolume?.toLocaleString('en-IN')}</td>
                                        <td className="td-mono">₹{fmtNum(r.turnover || 0)}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, minWidth: 60 }}>
                                                    <div className="progress-bar">
                                                        <div className="progress-fill" style={{
                                                            width: `${r.deliveryPct}%`,
                                                            background: (r.deliveryPct || 0) >= 60 ? 'var(--success)' : (r.deliveryPct || 0) >= 48 ? 'var(--primary)' : 'var(--danger)'
                                                        }} />
                                                    </div>
                                                </div>
                                                <span className="td-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                                                    {fmtNum(r.deliveryPct || 0)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="td-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {r.marketCap ? fmtCr(r.marketCap) : '—'}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleBuy(r.ticker, r.ltp)}
                                                disabled={buying === r.ticker}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    opacity: buying === r.ticker ? 0.7 : 1
                                                }}
                                            >
                                                {buying === r.ticker ? 'Buying...' : r.ltp > 10000 ? 'Buy 1 Share' : 'Buy ₹10k'}
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
                💡 <strong style={{ color: 'var(--text-primary)' }}>Insight:</strong>&nbsp;
                A "Volume Shocker" occurs when trading volume is significantly higher than average, often preceding a major price move. High spurts (e.g. &gt; 2x) reflect strong institutional or retail participation.
            </div>

            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
