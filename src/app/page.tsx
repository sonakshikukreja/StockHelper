'use client';
import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  TrendingUp, TrendingDown, Activity, DollarSign,
  BarChart2, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle
} from 'lucide-react';
import { fmtNum, changeSign, changeClass } from '@/lib/utils';

const ICON_MAP: Record<string, any> = {
  'NIFTY 50': Activity,
  'SENSEX': TrendingUp,
  'NIFTY BANK': DollarSign,
  'INDIA VIX': BarChart2,
};
const COLOR_MAP: Record<string, string> = {
  'NIFTY 50': '#3b82f6',
  'SENSEX': '#06b6d4',
  'NIFTY BANK': '#8b5cf6',
  'INDIA VIX': '#f59e0b',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', fontSize: 12 }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{fmtNum(payload[0].value)}</div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');
  const [indices, setIndices] = useState<any[]>([]);
  const [gainers, setGainers] = useState<any[]>([]);
  const [losers, setLosers] = useState<any[]>([]);
  const [sectorData, setSectorData] = useState<any[]>([]);
  const [niftyChart, setNiftyChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [indRes, glRes] = await Promise.all([
          fetch('/api/nse/indices').then(r => r.json()),
          fetch('/api/nse/gainers-losers').then(r => r.json()),
        ]);
        if (!indRes.error) setIndices(indRes.indices || []);
        if (!glRes.error) {
          setGainers(glRes.gainers || []);
          setLosers(glRes.losers || []);
          setSectorData(glRes.sectorData || []);
          // Build a 30-day chart from today's NIFTY index value for visual
          // We only have today's value from the API; show it as a single point with trend from nifty change
          const niftyIdx = (indRes.indices || []).find((i: any) => i.name === 'NIFTY 50');
          if (niftyIdx) {
            const ltp = niftyIdx.value;
            const chg = niftyIdx.change;
            // Simulate a minimal 5-point trend using known day range
            const chart = [
              { date: 'Open', value: niftyIdx.open },
              { date: 'Low', value: niftyIdx.low },
              { date: 'High', value: niftyIdx.high },
              { date: 'Current', value: ltp },
            ].filter(p => p.value > 0);
            setNiftyChart(chart);
          }
        }
      } catch (e: any) {
        setError('Failed to load live market data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const wantedIndices = ['NIFTY 50', 'SENSEX', 'NIFTY BANK', 'INDIA VIX'];
  const displayIndices = wantedIndices.map(name => indices.find(i => i.name === name)).filter(Boolean);

  const list = activeTab === 'gainers' ? gainers : losers;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

  return (
    <>
      <div className="page-header">
        <h1>Market Overview</h1>
        <p>Indian equity markets — NSE &amp; BSE — real-time snapshot · {dateStr}</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 12, padding: '12px 16px', color: 'var(--danger)', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Index cards */}
      <div className="metric-grid">
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Loader2 size={28} className="spin" style={{ marginBottom: 8 }} />
            <div>Fetching live market data…</div>
          </div>
        ) : displayIndices.map((idx: any) => {
          const up = idx.change >= 0;
          const Icon = ICON_MAP[idx.name] || Activity;
          const color = COLOR_MAP[idx.name] || '#3b82f6';
          return (
            <div className="metric-card" key={idx.name}>
              <div className="metric-icon" style={{ background: `${color}22` }}>
                <Icon size={18} color={color} />
              </div>
              <div className="metric-label">{idx.name}</div>
              <div className="metric-value">{fmtNum(idx.value)}</div>
              <div className={`metric-sub ${changeClass(idx.change)}`}>
                {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {changeSign(idx.change)}{fmtNum(idx.change)} ({changeSign(idx.changePct)}{fmtNum(idx.changePct)}%)
              </div>
            </div>
          );
        })}
      </div>

      {niftyChart.length > 0 && (
        <div className="grid-2">
          <div className="card col-span-2">
            <div className="section-header">
              <h2>NIFTY 50 – Today's Range</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateStr}</div>
            </div>
            <div className="chart-container" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={niftyChart} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v, 0)} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#niftyGrad)" dot={{ r: 4, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Top Movers */}
        <div className="card">
          <div className="section-header">
            <h2>Top Movers (NIFTY 100)</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`chip${activeTab === 'gainers' ? ' active' : ''}`} onClick={() => setActiveTab('gainers')}>Gainers</button>
              <button className={`chip${activeTab === 'losers' ? ' active' : ''}`} onClick={() => setActiveTab('losers')}>Losers</button>
            </div>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}><Loader2 size={20} className="spin" /></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Stock</th><th>Sector</th><th>LTP</th><th>Chg%</th>
                </tr></thead>
                <tbody>
                  {list.map((s: any) => (
                    <tr key={s.ticker}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.ticker}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.name?.slice(0, 24)}</div>
                      </td>
                      <td><span className="badge badge-blue">{s.sector?.slice(0, 12) || '—'}</span></td>
                      <td className="td-mono">₹{fmtNum(s.ltp)}</td>
                      <td>
                        <span className={`badge ${s.changePct >= 0 ? 'badge-green' : 'badge-red'}`}>
                          {changeSign(s.changePct)}{fmtNum(s.changePct)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sector Heatmap */}
        <div className="card">
          <div className="section-header"><h2>Sector Allocation (NIFTY 100)</h2></div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}><Loader2 size={20} className="spin" /></div>
          ) : sectorData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Sector data unavailable</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sectorData.map((s: any) => (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${s.value * 2.5}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: '12px 0 0', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {sectorData.map((s: any) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                    {s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="info-ribbon">
        <Activity size={14} color="var(--primary)" />
        <strong style={{ color: 'var(--text-primary)' }}>Live Data:</strong>&nbsp;
        All figures sourced live from NSE India. Gainers &amp; losers from NIFTY 100 universe.
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
