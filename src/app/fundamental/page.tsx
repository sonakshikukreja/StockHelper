'use client';
import { useState, useEffect } from 'react';
import { Brain, Loader2, Search, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import StockAnalysisView from '@/components/StockAnalysisView';

const POPULAR = ['RELIANCE', 'INFY', 'HDFCBANK', 'TCS', 'WIPRO', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'ITC', 'LT'];

export default function FundamentalPage() {
    const searchParams = useSearchParams();
    const [ticker, setTicker] = useState(searchParams.get('symbol') || '');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const analyze = async (t: string) => {
        const sym = t.trim().toUpperCase();
        if (!sym) return;
        setError(''); setData(null); setLoading(true);
        try {
            const resp = await fetch(`/api/yf/quote?symbol=${encodeURIComponent(sym)}`);
            const json = await resp.json();
            if (json.error) throw new Error(`"${sym}" not found. Check the ticker and try again.`);
            setData(json);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-analyze if symbol in URL
    useEffect(() => {
        const sym = searchParams.get('symbol');
        if (sym) { setTicker(sym); analyze(sym); }
    }, []);

    return (
        <>
            <div className="page-header">
                <h1>AI Fundamental Analysis</h1>
                <p>Live data from Yahoo Finance — P/E, book value, dividend yield, EPS, sector &amp; AI verdict for any NSE/BSE stock.</p>
            </div>

            <div className="info-ribbon">
                <Brain size={14} color="var(--primary)" />
                Data sourced from Yahoo Finance. Includes fields NSE API doesn't expose: <strong style={{ color: 'var(--text-primary)' }}>dividend yield, book value, P/B ratio, sector &amp; industry</strong>. Click any stock below or use the global search bar.
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">🔍 Enter Stock Symbol (NSE or BSE)</div>
                <div className="input-group">
                    <input
                        className="input-field"
                        placeholder="e.g. RELIANCE, INFY, TCS, ITC.BO"
                        value={ticker}
                        onChange={e => setTicker(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && analyze(ticker)}
                        style={{ minWidth: 260 }}
                    />
                    <button className="btn btn-primary" onClick={() => analyze(ticker)} disabled={loading}>
                        {loading ? <><Loader2 size={14} className="spin" /> Fetching…</> : <><Search size={14} /> Analyze</>}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {POPULAR.map(t => <button key={t} className="chip" onClick={() => { setTicker(t); analyze(t); }}>{t}</button>)}
                </div>
            </div>

            {loading && (
                <div className="ai-panel">
                    <div className="ai-loading">
                        <div className="ai-spinner" />
                        Fetching live data for <strong style={{ color: 'var(--text-primary)' }}>{ticker}</strong> from Yahoo Finance…
                    </div>
                </div>
            )}

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 18px', color: 'var(--danger)', fontSize: 13, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {data && !loading && (
                <StockAnalysisView data={data} />
            )}

            {!data && !loading && !error && (
                <div className="empty-state">
                    <Brain size={48} />
                    <p>Enter a stock ticker above — or search using the global search bar in the top nav</p>
                </div>
            )}
            <style>{`.spin { animation: spin 0.8s linear infinite; }`}</style>
        </>
    );
}
