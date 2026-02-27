'use client';
import { useState, useEffect, useMemo } from 'react';
import {
    Briefcase, TrendingUp, TrendingDown, DollarSign,
    Loader2, AlertCircle, ShoppingBag, PieChart, Info,
    CheckCircle2, XCircle, AlertTriangle, RefreshCw, X
} from 'lucide-react';
import { fmtNum, changeSign } from '@/lib/utils';

export default function VirtualPortfolioPage() {
    const [holdings, setHoldings] = useState<any[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [selling, setSelling] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'pnl', direction: 'desc' });
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const fetchData = async () => {
        setLoading(true);
        try {
            const [portRes, balRes] = await Promise.all([
                fetch('/api/paper/portfolio'),
                fetch('/api/paper/balance')
            ]);
            const portJson = await portRes.json();
            const balJson = await balRes.json();

            if (portJson.error) throw new Error(portJson.error);
            setHoldings(portJson.holdings || []);
            setBalance(balJson.balance || 0);

            // Initial price check for all holdings
            if (portJson.holdings?.length > 0) {
                refreshPrices(portJson.holdings);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load portfolio');
        } finally {
            setLoading(false);
        }
    };

    const refreshPrices = async (currentHoldings = holdings) => {
        if (currentHoldings.length === 0) return;
        setRefreshing(true);
        try {
            const symbols = currentHoldings.map(h => h.symbol).join(',');
            const resp = await fetch(`/api/yf/batch?symbols=${symbols}`);
            const json = await resp.json();

            if (json.stocks) {
                const liveMap: Record<string, any> = {};
                json.stocks.forEach((s: any) => { liveMap[s.symbol] = s; });

                setHoldings(prev => prev.map(h => {
                    const live = liveMap[h.symbol];
                    if (!live) return h;
                    return {
                        ...h,
                        currentPrice: live.ltp || h.currentPrice,
                        dayChangePct: live.changePct || 0
                    };
                }));
            }
        } catch (e) {
            console.error('Price refresh failed:', e);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSell = async (holdingId: number, symbol: string, qty: number, currentPrice: number) => {
        if (!confirm(`Are you sure you want to sell ${qty} shares of ${symbol}?`)) return;
        setSelling(true);
        try {
            const resp = await fetch('/api/paper/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, price: currentPrice })
            });
            const json = await resp.json();
            if (json.error) throw new Error(json.error);
            setMessage({ text: `Sold ${qty} shares of ${symbol} for ₹${fmtNum(json.totalProceeds)}`, type: 'success' });
            fetchData();
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setSelling(false);
        }
    };

    const handleBulkSell = async () => {
        const selectedHoldings = holdings.filter(h => selectedIds.has(h.id));
        if (selectedHoldings.length === 0) return;
        if (!confirm(`Are you sure you want to sell ${selectedHoldings.length} selected stocks?`)) return;

        setSelling(true);
        try {
            const trades = selectedHoldings.map(h => ({ symbol: h.symbol, price: h.currentPrice }));
            const resp = await fetch('/api/paper/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trades })
            });
            const json = await resp.json();
            if (json.error) throw new Error(json.error);
            setMessage({ text: `Bulk sell complete! Total proceeds: ₹${fmtNum(json.totalProceeds)}`, type: 'success' });
            setSelectedIds(new Set());
            fetchData();
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setSelling(false);
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === holdings.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(holdings.map(h => h.id)));
    };

    const sortedHoldings = useMemo(() => {
        const list = [...holdings];
        if (!sortConfig) return list;

        return list.sort((a, b) => {
            let valA: any, valB: any;
            const key = sortConfig.key;

            if (key === 'stock') { valA = a.symbol; valB = b.symbol; }
            else if (key === 'qty') { valA = a.quantity; valB = b.quantity; }
            else if (key === 'avg') { valA = a.avgPrice; valB = b.avgPrice; }
            else if (key === 'ltp') { valA = a.currentPrice; valB = b.currentPrice; }
            else if (key === 'invested') { valA = a.avgPrice * a.quantity; valB = b.avgPrice * b.quantity; }
            else if (key === 'value') { valA = a.currentPrice * a.quantity; valB = b.currentPrice * b.quantity; }
            else if (key === 'pnl') { valA = (a.currentPrice - a.avgPrice) * a.quantity; valB = (b.currentPrice - b.avgPrice) * b.quantity; }
            else if (key === 'pnlPct') { valA = (a.currentPrice / a.avgPrice); valB = (b.currentPrice / b.avgPrice); }
            else if (key === 'verdict') { valA = a.aiVerdict; valB = b.aiVerdict; }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [holdings, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            return { key, direction: 'desc' };
        });
    };

    const stats = useMemo(() => {
        const invested = holdings.reduce((sum, h) => sum + (h.avgPrice * h.quantity), 0);
        const current = holdings.reduce((sum, h) => sum + (h.currentPrice * h.quantity), 0);
        const pnl = current - invested;
        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
        return { invested, current, pnl, pnlPct };
    }, [holdings]);

    const SortIcon = ({ k }: { k: string }) => {
        if (sortConfig?.key !== k) return <span style={{ opacity: 0.2, marginLeft: 4 }}>↕</span>;
        return <span style={{ marginLeft: 4, color: 'var(--primary)' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
            <Loader2 size={40} className="spin" style={{ marginBottom: 16 }} />
            <p>Loading your virtual portfolio…</p>
        </div>
    );

    return (
        <>
            <div className="page-header">
                <h1>Virtual Paper Trading</h1>
                <p>Manage your paper trades with live execution prices and real-time P&amp;L tracking.</p>
            </div>

            {message && (
                <div style={{
                    background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                    borderRadius: 12, padding: '12px 16px', color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {message.text}
                    </div>
                    <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="metric-grid">
                {[
                    { label: 'Available Cash', value: `₹${fmtNum(balance)}`, sub: 'Buying power', icon: DollarSign, color: '#3b82f6' },
                    { label: 'Portfolio Value', value: `₹${fmtNum(stats.current)}`, sub: `Invested: ₹${fmtNum(stats.invested)}`, icon: PieChart, color: '#8b5cf6' },
                    { label: 'Total P&L', value: `${changeSign(stats.pnl)}₹${fmtNum(Math.abs(stats.pnl))}`, sub: `${changeSign(stats.pnlPct)}${fmtNum(stats.pnlPct)}%`, icon: TrendingUp, color: stats.pnl >= 0 ? '#10b981' : '#ef4444' },
                    { label: 'Holdings', value: String(holdings.length), sub: 'Active positions', icon: Briefcase, color: '#06b6d4' },
                ].map(m => (
                    <div className="metric-card" key={m.label}>
                        <div className="metric-icon" style={{ background: `${m.color}22` }}><m.icon size={18} color={m.color} /></div>
                        <div className="metric-label">{m.label}</div>
                        <div className="metric-value">{m.value}</div>
                        <div className={`metric-sub ${m.label === 'Total P&L' ? (stats.pnl >= 0 ? 'up' : 'down') : 'neutral'}`}>{m.sub}</div>
                    </div>
                ))}
            </div>

            <div className="card">
                <div className="section-header">
                    <h2>Active Positions</h2>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {selectedIds.size > 0 && (
                            <button onClick={handleBulkSell} disabled={selling}
                                className="btn btn-danger"
                                style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ShoppingBag size={13} /> Bulk Sell {selectedIds.size} {selectedIds.size === 1 ? 'Position' : 'Positions'}
                            </button>
                        )}
                        <button onClick={() => refreshPrices()} disabled={refreshing || holdings.length === 0}
                            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <RefreshCw size={13} className={refreshing ? 'spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh Prices'}
                        </button>
                    </div>
                </div>

                {holdings.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px 20px' }}>
                        <Info size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
                        <h3>Your portfolio is empty</h3>
                        <p>Go to Volume Shockers or 52W High pages to start paper trading.</p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 40, textAlign: 'center' }}>
                                        <input type="checkbox" checked={selectedIds.size === holdings.length && holdings.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                                    </th>
                                    <th onClick={() => handleSort('stock')} style={{ cursor: 'pointer' }}>Stock <SortIcon k="stock" /></th>
                                    <th onClick={() => handleSort('qty')} style={{ cursor: 'pointer' }}>Qty <SortIcon k="qty" /></th>
                                    <th onClick={() => handleSort('avg')} style={{ cursor: 'pointer' }}>Avg. Price <SortIcon k="avg" /></th>
                                    <th onClick={() => handleSort('ltp')} style={{ cursor: 'pointer' }}>LTP <SortIcon k="ltp" /></th>
                                    <th onClick={() => handleSort('invested')} style={{ cursor: 'pointer' }}>Invested <SortIcon k="invested" /></th>
                                    <th onClick={() => handleSort('value')} style={{ cursor: 'pointer' }}>Value <SortIcon k="value" /></th>
                                    <th onClick={() => handleSort('pnl')} style={{ cursor: 'pointer' }}>P&L <SortIcon k="pnl" /></th>
                                    <th onClick={() => handleSort('verdict')} style={{ cursor: 'pointer', textAlign: 'center' }}>AI Verdict <SortIcon k="verdict" /></th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedHoldings.map(h => {
                                    const hPnl = (h.currentPrice - h.avgPrice) * h.quantity;
                                    const hPnlPct = (hPnl / (h.avgPrice * h.quantity)) * 100;
                                    const isSelected = selectedIds.has(h.id);
                                    return (
                                        <tr key={h.id} style={{ background: isSelected ? 'var(--primary)08' : 'transparent' }}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(h.id)} style={{ cursor: 'pointer' }} />
                                            </td>
                                            <td style={{ fontWeight: 700 }}>{h.symbol}</td>
                                            <td className="td-mono">{h.quantity}</td>
                                            <td className="td-mono">₹{fmtNum(h.avgPrice)}</td>
                                            <td className="td-mono">
                                                ₹{fmtNum(h.currentPrice)}
                                                <div style={{ fontSize: 10, color: (h.dayChangePct || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                    {changeSign(h.dayChangePct || 0)}{fmtNum(h.dayChangePct || 0)}%
                                                </div>
                                            </td>
                                            <td className="td-mono">₹{fmtNum(h.avgPrice * h.quantity)}</td>
                                            <td className="td-mono">₹{fmtNum(h.currentPrice * h.quantity)}</td>
                                            <td>
                                                <div className="td-mono" style={{ color: hPnl >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                                                    {changeSign(hPnl)}₹{fmtNum(Math.abs(hPnl))}
                                                </div>
                                                <div style={{ fontSize: 11, color: hPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                    {changeSign(hPnlPct)}{fmtNum(hPnlPct)}%
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`badge badge-${(h.aiVerdict === 'BUY' ? 'green' : h.aiVerdict === 'SELL' ? 'red' : 'yellow')}`}>
                                                    {h.aiVerdict}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleSell(h.id, h.symbol, h.quantity, h.currentPrice)}
                                                    className="btn btn-ghost"
                                                    disabled={selling}
                                                    style={{ padding: '4px 8px', fontSize: 11, color: 'var(--danger)' }}
                                                >
                                                    Sell
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="info-ribbon" style={{ marginTop: 20 }}>
                <AlertTriangle size={14} color="var(--warning)" />
                <strong style={{ color: 'var(--text-primary)' }}>Paper Trading:</strong>&nbsp;
                This is a virtual portfolio using simulated funds. Execution prices are based on live market data from Yahoo Finance.
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; } 
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .selected-row td { background: var(--primary)08; border-bottom-color: var(--primary)44 !important; }
            `}</style>
        </>
    );
}
