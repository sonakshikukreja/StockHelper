'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { fmtNum, fmtCr, changeSign } from '@/lib/utils';

export default function FiftyTwoWeekHighPage() {
    const [data, setData] = useState<{ high: any[], low: any[] }>({ high: [], low: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'high' | 'low'>('high');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const resp = await fetch('/api/nse/high-low');
            const json = await resp.json();
            if (json.error) throw new Error(json.details || json.error);
            setData(json);
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to connect to API');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedData = (dataList: any[]) => {
        if (!sortConfig) return dataList;
        return [...dataList].sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Convert to numbers if possible
            if (!isNaN(parseFloat(aVal)) && isFinite(aVal)) aVal = parseFloat(aVal);
            if (!isNaN(parseFloat(bVal)) && isFinite(bVal)) bVal = parseFloat(bVal);

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

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

    const currentData = getSortedData(activeTab === 'high' ? data.high : data.low);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    const SortIndicator = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
        return <span style={{ marginLeft: 4 }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <>
            <div className="page-header">
                <h1>52-Week High/Low Stocks</h1>
                <p>Stocks that have hit their 52-week high or low price in the current trading session.</p>
            </div>

            <div className="info-ribbon">
                {activeTab === 'high' ? <TrendingUp size={14} color="var(--success)" /> : <TrendingDown size={14} color="var(--danger)" />}
                <strong style={{ color: 'var(--text-primary)' }}>Market Data:</strong>&nbsp;
                {loading ? 'Fetching high/low records...' : `Showing stocks hitting new 52-week ${activeTab}s`}
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

            <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
                <button
                    onClick={() => { setActiveTab('high'); setSortConfig(null); }}
                    style={{
                        padding: '12px 24px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'high' ? '2px solid var(--success)' : '2px solid transparent',
                        color: activeTab === 'high' ? 'var(--success)' : 'var(--text-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    <TrendingUp size={16} /> 52-Week High ({data.high.length})
                </button>
                <button
                    onClick={() => { setActiveTab('low'); setSortConfig(null); }}
                    style={{
                        padding: '12px 24px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'low' ? '2px solid var(--danger)' : '2px solid transparent',
                        color: activeTab === 'low' ? 'var(--danger)' : 'var(--text-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    <TrendingDown size={16} /> 52-Week Low ({data.low.length})
                </button>
            </div>

            <div className="card">
                <div className="section-header">
                    <h2>New 52-Week {activeTab === 'high' ? 'High' : 'Low'} (Equity)</h2>
                    <div className="market-time" style={{ fontSize: 12 }}>
                        <Calendar size={12} /> {dateStr}
                    </div>
                </div>
                <div className="table-wrap">
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Loader2 size={32} className="spin" style={{ marginBottom: 16 }} />
                            <p>Loading market data...</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('symbol')} style={{ cursor: 'pointer' }}>Symbol <SortIndicator column="symbol" /></th>
                                    <th onClick={() => handleSort('ltp')} style={{ cursor: 'pointer' }}>LTP <SortIndicator column="ltp" /></th>
                                    <th onClick={() => handleSort('prevClose')} style={{ cursor: 'pointer' }}>Prev Close <SortIndicator column="prevClose" /></th>
                                    <th onClick={() => handleSort('pChange')} style={{ cursor: 'pointer' }}>% Change <SortIndicator column="pChange" /></th>
                                    <th onClick={() => handleSort('new52WHL')} style={{ cursor: 'pointer' }}>New 52W {activeTab === 'high' ? 'High' : 'Low'} <SortIndicator column="new52WHL" /></th>
                                    <th onClick={() => handleSort('prev52WHL')} style={{ cursor: 'pointer' }}>Prev 52W {activeTab === 'high' ? 'High' : 'Low'} <SortIndicator column="prev52WHL" /></th>
                                    <th onClick={() => handleSort('prevHLDate')} style={{ cursor: 'pointer' }}>Prev Date <SortIndicator column="prevHLDate" /></th>
                                    <th onClick={() => handleSort('marketCap')} style={{ cursor: 'pointer' }}>Mkt Cap (Cr) <SortIndicator column="marketCap" /></th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No stocks hit a 52-week {activeTab} in this session yet.
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((r: any) => (
                                        <tr key={r.symbol}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{r.symbol}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.comapnyName || r.symbol}</div>
                                            </td>
                                            <td className="td-mono">₹{fmtNum(r.ltp)}</td>
                                            <td className="td-mono">₹{fmtNum(r.prevClose)}</td>
                                            <td>
                                                <span className={`badge ${r.pChange >= 0 ? 'badge-green' : 'badge-red'}`}>
                                                    {changeSign(r.pChange)}{fmtNum(r.pChange)}%
                                                </span>
                                            </td>
                                            <td className="td-mono" style={{ color: activeTab === 'high' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                ₹{fmtNum(r.new52WHL)}
                                            </td>
                                            <td className="td-mono">₹{fmtNum(r.prev52WHL)}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.prevHLDate}</td>
                                            <td className="td-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {r.marketCap ? fmtCr(r.marketCap) : '—'}
                                            </td>
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
                                                        opacity: buying === r.symbol ? 0.7 : 1
                                                    }}
                                                >
                                                    {buying === r.symbol ? 'Buying...' : r.ltp > 10000 ? 'Buy 1 Share' : 'Buy ₹10k'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="info-ribbon" style={{ marginTop: 16 }}>
                💡 <strong style={{ color: 'var(--text-primary)' }}>Analysis:</strong>&nbsp;
                {activeTab === 'high'
                    ? "Stocks hitting 52-week highs often show strong momentum and institutional interest."
                    : "Stocks hitting 52-week lows may indicate long-term weakness or potential value opportunities if fundamentals are strong."}
            </div>

            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
