'use client';
import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { fmtNum } from '@/lib/utils';

const POPULAR = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ITC', 'WIPRO', 'SBIN', 'TATAMOTORS'];

export default function ArbitragePage() {
    const [symbol, setSymbol] = useState('');
    const [nse, setNse] = useState<any>(null);
    const [bse, setBse] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const search = async (sym: string) => {
        const s = sym.trim().toUpperCase();
        if (!s) return;
        setLoading(true); setError(''); setNse(null); setBse(null);
        try {
            const [nseRes, bseRes] = await Promise.all([
                fetch(`/api/yf/quote?symbol=${s}.NS`).then(r => r.json()),
                fetch(`/api/yf/quote?symbol=${s}.BO`).then(r => r.json()),
            ]);
            if (nseRes.error && bseRes.error) throw new Error(`${s} not found on NSE or BSE`);
            if (!nseRes.error) setNse(nseRes);
            if (!bseRes.error) setBse(bseRes);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const spread = nse && bse ? Math.abs(nse.ltp - bse.ltp) : 0;
    const spreadPct = nse && bse && nse.ltp ? (spread / nse.ltp) * 100 : 0;
    const nseHigher = nse && bse ? nse.ltp > bse.ltp : false;

    const Stat = ({ label, val }: { label: string; val: string }) => (
        <div className="stat-row">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{val}</span>
        </div>
    );

    return (
        <>
            <div className="page-header">
                <h1>NSE vs BSE Arbitrage</h1>
                <p>Compare the same stock's live price on NSE and BSE — spot any price spread or arbitrage opportunity.</p>
            </div>

            <div className="info-ribbon">
                <TrendingUp size={14} color="var(--accent)" />
                <strong style={{ color: 'var(--text-primary)' }}>Note:</strong>&nbsp;
                Prices sourced from Yahoo Finance (NSE = .NS, BSE = .BO). Spreads &gt; 0.5% may indicate a brief arbitrage window, though execution costs typically make them non-actionable for retail traders.
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">🔍 Enter Stock Symbol</div>
                <div className="input-group">
                    <input
                        className="input-field"
                        placeholder="e.g. RELIANCE, TCS, INFY"
                        value={symbol}
                        onChange={e => setSymbol(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && search(symbol)}
                        style={{ minWidth: 220 }}
                    />
                    <button className="btn btn-primary" onClick={() => search(symbol)} disabled={loading}>
                        {loading ? <><Loader2 size={14} className="spin" /> Fetching…</> : <><Search size={14} /> Compare</>}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {POPULAR.map(s => <button key={s} className="chip" onClick={() => { setSymbol(s); search(s); }}>{s}</button>)}
                </div>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: 16, color: 'var(--danger)', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {nse && bse && (
                <>
                    {/* Spread summary */}
                    <div className="metric-grid" style={{ marginBottom: 20 }}>
                        {[
                            { label: 'NSE Price', value: `₹${fmtNum(nse.ltp)}`, sub: `${nse.changePct >= 0 ? '+' : ''}${fmtNum(nse.changePct)}% today`, subClass: nse.changePct >= 0 ? 'up' : 'down' },
                            { label: 'BSE Price', value: `₹${fmtNum(bse.ltp)}`, sub: `${bse.changePct >= 0 ? '+' : ''}${fmtNum(bse.changePct)}% today`, subClass: bse.changePct >= 0 ? 'up' : 'down' },
                            { label: 'Price Spread', value: `₹${fmtNum(spread)}`, sub: `${fmtNum(spreadPct)}% difference`, subClass: spreadPct > 0.5 ? 'up' : 'neutral' },
                            { label: 'Higher on', value: nseHigher ? 'NSE' : 'BSE', sub: `Buy ${nseHigher ? 'BSE' : 'NSE'}, notional sell ${nseHigher ? 'NSE' : 'BSE'}`, subClass: 'neutral' },
                        ].map(m => (
                            <div className="metric-card" key={m.label}>
                                <div className="metric-label">{m.label}</div>
                                <div className="metric-value" style={{ fontSize: 20 }}>{m.value}</div>
                                <div className={`metric-sub ${m.subClass}`}>{m.sub}</div>
                            </div>
                        ))}
                    </div>

                    {spreadPct > 0.5 && (
                        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                            <TrendingUp size={16} color="var(--success)" />
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--success)' }}>Notable spread detected ({fmtNum(spreadPct)}%)!</strong>&nbsp;
                                {nse.companyName} is ₹{fmtNum(spread)} cheaper on {nseHigher ? 'BSE' : 'NSE'}.
                                Retail execution costs (brokerage + STT) typically exceed this.
                            </span>
                        </div>
                    )}

                    {/* Side-by-side comparison */}
                    <div className="grid-2">
                        {[{ label: 'NSE', data: nse, color: '#3b82f6' }, { label: 'BSE', data: bse, color: '#8b5cf6' }].map(({ label, data: d, color }) => (
                            <div className="card" key={label}>
                                <div className="card-title" style={{ color }}>
                                    {d.companyName} — {label} ({d.ticker})
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>₹{fmtNum(d.ltp)}</span>
                                    <span style={{ marginLeft: 10, fontSize: 14, color: d.changePct >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                        {d.changePct >= 0 ? '▲' : '▼'} {Math.abs(d.changePct).toFixed(2)}%
                                    </span>
                                </div>
                                <Stat label="Open" val={`₹${fmtNum(d.open)}`} />
                                <Stat label="High" val={`₹${fmtNum(d.high)}`} />
                                <Stat label="Low" val={`₹${fmtNum(d.low)}`} />
                                <Stat label="Prev Close" val={`₹${fmtNum(d.prevClose)}`} />
                                <Stat label="52W High" val={`₹${fmtNum(d.week52High)}`} />
                                <Stat label="52W Low" val={`₹${fmtNum(d.week52Low)}`} />
                                <Stat label="P/E" val={d.pe ? `${fmtNum(d.pe)}x` : '—'} />
                                <Stat label="Div Yield" val={d.dividendYield ? `${fmtNum(d.dividendYield)}%` : '—'} />
                                <Stat label="Volume" val={d.volume?.toLocaleString('en-IN') || '—'} />
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!loading && !nse && !error && (
                <div className="empty-state">
                    <ArrowRight size={40} />
                    <p>Enter a stock symbol above to compare its NSE and BSE prices</p>
                </div>
            )}
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}
