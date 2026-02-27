'use client';
import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart2, Loader2, RefreshCw } from 'lucide-react';
import { fmtNum, changeSign, changeClass } from '@/lib/utils';

interface PortfolioStock {
    ticker: string;
    name: string;
    sector: string;
    qty: number;
    avgPrice: number;
    ltp: number;
    dayChange: number;
    dayChangePct: number;
}

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
        return (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{payload[0].name}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{payload[0].value}%</div>
            </div>
        );
    }
    return null;
};

export default function PortfolioPage() {
    const [stocks, setStocks] = useState<PortfolioStock[]>([]);
    const [newTicker, setNewTicker] = useState('');
    const [newQty, setNewQty] = useState('');
    const [newAvg, setNewAvg] = useState('');
    const [newSector, setNewSector] = useState('');
    const [addingStock, setAddingStock] = useState(false);
    const [refreshingLtp, setRefreshingLtp] = useState(false);

    const totalInvested = useMemo(() => stocks.reduce((s, r) => s + r.qty * r.avgPrice, 0), [stocks]);
    const totalCurrent = useMemo(() => stocks.reduce((s, r) => s + r.qty * r.ltp, 0), [stocks]);
    const totalPnl = totalCurrent - totalInvested;
    const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const dayPnl = useMemo(() => stocks.reduce((s, r) => s + r.qty * r.dayChange, 0), [stocks]);

    const sectorBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        stocks.forEach(s => { map[s.sector] = (map[s.sector] || 0) + s.qty * s.ltp; });
        const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
        return Object.entries(map).map(([name, value], i) => ({
            name, value: Math.round((value / total) * 100), color: COLORS[i % COLORS.length]
        }));
    }, [stocks]);

    const fetchStockData = async (sym: string): Promise<{ ltp: number; dayChange: number; dayChangePct: number; name: string; sector: string }> => {
        try {
            // Using YF quote for more reliable data including sector
            const resp = await fetch(`/api/yf/quote?symbol=${encodeURIComponent(sym)}`);
            const json = await resp.json();
            if (json.error) throw new Error(json.error);
            return {
                ltp: json.ltp ?? 0,
                dayChange: json.change ?? 0,
                dayChangePct: json.changePct ?? 0,
                name: json.companyName || sym,
                sector: json.sector || 'Other',
            };
        } catch {
            return { ltp: 0, dayChange: 0, dayChangePct: 0, name: sym, sector: 'Other' };
        }
    };

    const addStock = async () => {
        if (!newTicker || !newQty || !newAvg) return;
        const sym = newTicker.trim().toUpperCase();
        setAddingStock(true);
        const live = await fetchStockData(sym);
        setStocks(prev => [...prev, {
            ticker: sym,
            name: live.name,
            sector: newSector.trim() || live.sector, // Use manual sector if provided, else auto-fetched
            qty: parseInt(newQty),
            avgPrice: parseFloat(newAvg),
            ltp: live.ltp || parseFloat(newAvg), // Fallback to avg price if LTP fetch fails
            dayChange: live.dayChange,
            dayChangePct: live.dayChangePct,
        }]);
        setAddingStock(false);
        setNewTicker(''); setNewQty(''); setNewAvg(''); setNewSector('');
    };

    const refreshPrices = async () => {
        if (stocks.length === 0) return;
        setRefreshingLtp(true);
        try {
            const symbols = stocks.map(s => s.ticker).join(',');
            const resp = await fetch(`/api/yf/batch?symbols=${symbols}`);
            const json = await resp.json();
            if (json.error) throw new Error(json.error);

            const liveMap: Record<string, any> = {};
            (json.stocks || []).forEach((s: any) => { liveMap[s.symbol] = s; });

            setStocks(prev => prev.map(s => {
                const live = liveMap[s.ticker];
                if (!live) return s;
                return {
                    ...s,
                    ltp: live.ltp || s.ltp,
                    dayChange: live.change || 0,
                    dayChangePct: live.changePct || 0,
                    name: live.companyName || s.name,
                    sector: s.sector === 'Other' ? (live.sector || 'Other') : s.sector
                };
            }));
        } catch (e) {
            console.error('Refresh failed:', e);
        } finally {
            setRefreshingLtp(false);
        }
    };

    const removeStock = (ticker: string) => setStocks(prev => prev.filter(s => s.ticker !== ticker));

    return (
        <>
            <div className="page-header">
                <h1>Portfolio Analyzer</h1>
                <p>Track your holdings with live data from Yahoo Finance. Auto-fetches sectors and real-time P&amp;L.</p>
            </div>

            <div className="metric-grid">
                {[
                    { label: 'Total Invested', value: `₹${fmtNum(totalInvested)}`, sub: 'Cost basis', subClass: 'neutral', icon: DollarSign, color: '#3b82f6' },
                    { label: 'Current Value', value: `₹${fmtNum(totalCurrent)}`, sub: 'Market value', subClass: 'neutral', icon: BarChart2, color: '#06b6d4' },
                    { label: 'Total P&L', value: `${changeSign(totalPnl)}₹${fmtNum(Math.abs(totalPnl))}`, sub: `${changeSign(pnlPct)}${fmtNum(pnlPct)}% overall`, subClass: changeClass(totalPnl), icon: TrendingUp, color: totalPnl >= 0 ? '#10b981' : '#ef4444' },
                    { label: "Today's P&L", value: `${changeSign(dayPnl)}₹${fmtNum(Math.abs(dayPnl))}`, sub: 'Intraday change', subClass: changeClass(dayPnl), icon: TrendingDown, color: dayPnl >= 0 ? '#10b981' : '#ef4444' },
                ].map(m => (
                    <div className="metric-card" key={m.label}>
                        <div className="metric-icon" style={{ background: `${m.color}22` }}>
                            <m.icon size={18} color={m.color} />
                        </div>
                        <div className="metric-label">{m.label}</div>
                        <div className="metric-value" style={{ fontSize: 20 }}>{m.value}</div>
                        <div className={`metric-sub ${m.subClass}`}>{m.sub}</div>
                    </div>
                ))}
            </div>

            {/* Add stock row */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">➕ Add Stock to Portfolio</div>
                <div className="portfolio-row-add">
                    <input className="input-field" placeholder="Ticker (e.g. TATASTEEL)" value={newTicker} onChange={e => setNewTicker(e.target.value)} style={{ minWidth: 160 }} />
                    <input className="input-field" placeholder="Quantity" type="number" value={newQty} onChange={e => setNewQty(e.target.value)} style={{ minWidth: 110 }} />
                    <input className="input-field" placeholder="Avg. Buy Price ₹" type="number" value={newAvg} onChange={e => setNewAvg(e.target.value)} style={{ minWidth: 140 }} />
                    <input className="input-field" placeholder="Sector (autofilled if empty)" value={newSector} onChange={e => setNewSector(e.target.value)} style={{ minWidth: 140 }} />
                    <button className="btn btn-primary" onClick={addStock} disabled={addingStock}>
                        {addingStock ? <><Loader2 size={14} className="spin" /> Fetching Stock…</> : <><Plus size={15} /> Add Stock</>}
                    </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    💡 Live LTP and <strong>Sector</strong> are fetched automatically from Yahoo Finance when you add a stock.
                </div>
            </div>

            <div className="grid-2">
                {/* Holdings table */}
                <div className="card col-span-2">
                    <div className="section-header">
                        <h2>Holdings ({stocks.length} stocks)</h2>
                        <button onClick={refreshPrices} disabled={refreshingLtp || stocks.length === 0} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <RefreshCw size={13} className={refreshingLtp ? 'spin' : ''} /> Refresh All Prices
                        </button>
                    </div>
                    {stocks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                            <BarChart2 size={40} style={{ opacity: 0.15, marginBottom: 12 }} />
                            <p>No stocks added yet. Use the form above to add your holdings.</p>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead><tr>
                                    <th>Stock</th><th>Sector</th><th>Qty</th><th>Avg Price</th>
                                    <th>LTP</th><th>Invested</th><th>Current</th><th>P&L</th><th>Day Chg</th><th></th>
                                </tr></thead>
                                <tbody>
                                    {stocks.map(s => {
                                        const invested = s.qty * s.avgPrice;
                                        const current = s.qty * s.ltp;
                                        const pnl = current - invested;
                                        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                                        return (
                                            <tr key={s.ticker}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="stock-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{s.ticker.slice(0, 2)}</div>
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{s.ticker}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.name.slice(0, 22)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className="badge badge-blue">{s.sector}</span></td>
                                                <td className="td-mono">{s.qty}</td>
                                                <td className="td-mono">₹{fmtNum(s.avgPrice)}</td>
                                                <td className="td-mono">₹{fmtNum(s.ltp)}</td>
                                                <td className="td-mono">₹{fmtNum(invested)}</td>
                                                <td className="td-mono">₹{fmtNum(current)}</td>
                                                <td>
                                                    <div className="td-mono" style={{ color: pnl >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                        {changeSign(pnl)}₹{fmtNum(Math.abs(pnl))}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: pnlPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                        {changeSign(pnlPct)}{fmtNum(pnlPct)}%
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${s.dayChangePct >= 0 ? 'badge-green' : 'badge-red'}`}>
                                                        {changeSign(s.dayChangePct)}{fmtNum(s.dayChangePct)}%
                                                    </span>
                                                </td>
                                                <td>
                                                    <button onClick={() => removeStock(s.ticker)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}>
                                                        <Trash2 size={14} />
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
            </div>

            {sectorBreakdown.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="section-header"><h2>Sector Breakdown</h2></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ height: 180, width: 180, flexShrink: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={sectorBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                                        {sectorBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip content={<CustomPieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {sectorBreakdown.map(s => (
                                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{s.name}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
