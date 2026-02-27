'use client';
import { Brain, TrendingUp, BarChart2, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { fmtNum } from '@/lib/utils';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, ReferenceLine, Area, ComposedChart
} from 'recharts';

function RatingBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtNum(value)}</span>
            </div>
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
            </div>
        </div>
    );
}

function getVerdict(pe: number, roe: number, priceToBook: number, changePct: number, rangePos: number) {
    let score = 0;
    if (pe > 0 && pe < 25) score += 2;
    else if (pe > 0 && pe < 45) score += 1;
    if (roe > 15) score += 2;
    if (priceToBook > 0 && priceToBook < 4) score += 1;
    if (changePct > 0) score += 1;
    if (rangePos < 70) score += 1;

    if (score >= 5) return { verdict: 'BUY', color: 'badge-green', reason: 'Strong fundamentals — healthy ROE, reasonable valuation, and positive momentum.' };
    if (score >= 3) return { verdict: 'HOLD', color: 'badge-yellow', reason: 'Moderate fundamentals. Valuation is fair, but keep an eye on profitability trends.' };
    return { verdict: 'SELL', color: 'badge-red', reason: 'Rich valuation or weak profitability. Consider booking profits or waiting for a better entry.' };
}

export default function StockAnalysisView({ data }: { data: any }) {
    if (!data) return null;

    const rangePos = data.week52High > data.week52Low
        ? ((data.ltp - data.week52Low) / (data.week52High - data.week52Low)) * 100 : 0;
    const verdict = getVerdict(data.pe, data.roe, data.priceToBook, data.changePct, rangePos);

    return (
        <>
            <div className="metric-grid" style={{ marginBottom: 20 }}>
                {[
                    { label: 'Market Cap', value: data.marketCap ? `₹${fmtNum(data.marketCap / 10000000, 0)} Cr` : '—', icon: DollarSign, color: '#3b82f6' },
                    { label: 'P/E Ratio', value: data.pe ? `${fmtNum(data.pe)}x` : '—', icon: BarChart2, color: '#06b6d4' },
                    { label: 'ROE', value: data.roe ? `${fmtNum(data.roe)}%` : '—', icon: Percent, color: '#10b981' },
                    { label: 'Dividend Yield', value: data.dividendYield ? `${fmtNum(data.dividendYield)}%` : '—', icon: TrendingUp, color: '#8b5cf6' },
                ].map(m => (
                    <div className="metric-card" key={m.label}>
                        <div className="metric-icon" style={{ background: `${m.color}22` }}><m.icon size={18} color={m.color} /></div>
                        <div className="metric-label">{m.label}</div>
                        <div className="metric-value" style={{ fontSize: 20 }}>{m.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-title">📊 Live Data — {data.symbol} ({data.exchange})</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{data.companyName}</div>
                    {data.sector && <div style={{ marginBottom: 10 }}><span className="badge badge-blue">{data.sector}</span> <span className="badge badge-purple" style={{ marginLeft: 4 }}>{data.industry}</span></div>}
                    <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>₹{fmtNum(data.ltp)}</div>
                    <div style={{ fontSize: 14, color: data.changePct >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginBottom: 14 }}>
                        {data.changePct >= 0 ? '▲' : '▼'} {Math.abs(data.changePct).toFixed(2)}% today
                    </div>

                    <div className="card-subtitle" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, marginTop: 20 }}>Price &amp; 23/46 DMA Chart</div>
                    <div style={{ height: 260, width: '100%', marginBottom: 20 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="date" fontSize={10} tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis domain={['auto', 'auto']} fontSize={10} tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} orientation="right" />
                                <Tooltip
                                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                                    itemStyle={{ padding: '0 4px' }}
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                                <ReferenceLine y={data.week52High} label={{ position: 'right', value: '52W High', fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
                                <ReferenceLine y={data.week52Low} label={{ position: 'right', value: '52W Low', fill: '#10b981', fontSize: 10 }} stroke="#10b981" strokeDasharray="3 3" />
                                <Line type="monotone" dataKey="ltp" stroke="var(--primary)" strokeWidth={2} dot={false} name="Price" />
                                <Line type="monotone" dataKey="dma23" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="23 DMA" strokeDasharray="5 5" />
                                <Line type="monotone" dataKey="dma46" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="46 DMA" strokeDasharray="5 5" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="card-subtitle" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, marginTop: 20 }}>Price & Volume Stats</div>
                    {[
                        ['Open', `₹${fmtNum(data.open)}`],
                        ["Today's High", `₹${fmtNum(data.high)}`],
                        ["Today's Low", `₹${fmtNum(data.low)}`],
                        ['Prev Close', `₹${fmtNum(data.prevClose)}`],
                        ['52W High', `₹${fmtNum(data.week52High)}`],
                        ['52W Low', `₹${fmtNum(data.week52Low)}`],
                        ['Volume', data.volume?.toLocaleString('en-IN') || '—'],
                    ].map(([label, val]) => (
                        <div className="stat-row" key={label}>
                            <span className="stat-label">{label}</span>
                            <span className="stat-value">{val}</span>
                        </div>
                    ))}

                    <div className="card-subtitle" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, marginTop: 20 }}>Technical Indicators</div>
                    {[
                        ['VWAP', data.vwap ? `₹${fmtNum(data.vwap)}` : '—'],
                        ['23 DMA', data.dma23 ? `₹${fmtNum(data.dma23)}` : '—'],
                        ['46 DMA', data.dma46 ? `₹${fmtNum(data.dma46)}` : '—'],
                    ].map(([label, val]) => (
                        <div className="stat-row" key={label}>
                            <span className="stat-label">{label}</span>
                            <span className="stat-value" style={{ color: 'var(--primary)', fontWeight: 600 }}>{val}</span>
                        </div>
                    ))}

                    <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                            <span>52W Low ₹{fmtNum(data.week52Low)}</span>
                            <span>52W High ₹{fmtNum(data.week52High)}</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${rangePos}%`, background: rangePos > 80 ? 'var(--success)' : rangePos > 50 ? 'var(--primary)' : 'var(--danger)' }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>LTP at {fmtNum(rangePos, 0)}% of 52W range</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <div className="card-title">📈 Key Ratios</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <RatingBar label={`P/E Ratio (${fmtNum(data.pe ?? 0)}x)`} value={data.pe || 0} max={80} color="#3b82f6" />
                            <RatingBar label={`Price / Book (${fmtNum(data.priceToBook ?? 0)}x)`} value={data.priceToBook || 0} max={10} color="#8b5cf6" />
                            <RatingBar label={`ROE (${fmtNum(data.roe ?? 0)}%)`} value={data.roe || 0} max={40} color="#10b981" />
                            <RatingBar label={`ROCE (Est. ${fmtNum(data.roce ?? 0)}%)`} value={data.roce || 0} max={40} color="#06b6d4" />
                            <RatingBar label={`Dividend Yield (${fmtNum(data.dividendYield ?? 0)}%)`} value={data.dividendYield || 0} max={6} color="#10b981" />
                            <RatingBar label={`Debt to Equity (${fmtNum(data.debtToEquity ?? 0)})`} value={data.debtToEquity || 0} max={200} color="#ef4444" />
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title">👥 Shareholding & Ownership</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="stat-row">
                                <span className="stat-label">Promoter Holding</span>
                                <span className="stat-value" style={{ fontWeight: 700 }}>{fmtNum(data.promoterHolding)}%</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Pledged Shares</span>
                                <span className="stat-value" style={{ color: data.pledgedShares > 0 ? 'var(--danger)' : 'var(--success)' }}>{data.pledgedShares > 0 ? `${fmtNum(data.pledgedShares)}%` : 'None'}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Book Value</span>
                                <span className="stat-value">₹{fmtNum(data.bookValue)}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">EPS (TTM)</span>
                                <span className="stat-value">₹{fmtNum(data.eps)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title">💰 Yearly Net Profit (Cr)</div>
                        <div style={{ height: 200, width: '100%', marginBottom: 10 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.profitHistory}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="year" fontSize={10} tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={10} tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${fmtNum(v / 10000000, 0)}`} orientation="right" />
                                    <Tooltip
                                        formatter={(value: any) => [`₹${fmtNum(value / 10000000, 1)} Cr`, 'Net Profit']}
                                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                                    />
                                    <Bar dataKey="netIncome" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>Values in ₹ Crores. Last 4 fiscal years.</div>
                    </div>

                    <div className="card">
                        <div className="card-title">💡 AI Verdict</div>
                        <div style={{ textAlign: 'center', padding: '12px 0' }}>
                            <span className={`badge ${verdict.color}`} style={{ fontSize: 18, padding: '8px 28px', borderRadius: 10 }}>{verdict.verdict}</span>
                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{verdict.reason}</div>
                            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>Based on P/E, P/B, ROE, momentum, and 52W range</div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title">🔄 Tools</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <a href={`/compare?add=${data.symbol}`} style={{ padding: '8px 14px', background: 'var(--primary)22', color: 'var(--primary)', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--primary)44' }}>
                                📊 Compare
                            </a>
                            <a href={`/arbitrage?symbol=${data.symbol}`} style={{ padding: '8px 14px', background: 'var(--accent)22', color: 'var(--accent)', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--accent)44' }}>
                                ⚖️ Arbitrage
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
