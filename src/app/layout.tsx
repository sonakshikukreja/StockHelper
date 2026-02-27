'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Briefcase, Brain, Building2,
  TrendingUp, BarChart3, Truck, Settings, Bell, Activity,
  GitCompare, Filter, ArrowLeftRight, Search, X,
  Sun, Moon, Palette, Crown, Sparkles
} from 'lucide-react';
import { fmtNum, changeSign } from '@/lib/utils';

const NAV = [
  { href: '/virtual-portfolio', label: 'Virtual Portfolio', icon: Briefcase },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio Analyzer', icon: Activity },
  { href: '/fundamental', label: 'AI Fundamentals', icon: Brain },
  { href: '/screener', label: 'Stock Screener', icon: Filter },
  { href: '/compare', label: 'Compare Stocks', icon: GitCompare },
  { href: '/arbitrage', label: 'NSE vs BSE', icon: ArrowLeftRight },
  { href: '/mf-exposure', label: 'MF Exposure', icon: Building2 },
  { href: '/mf-new-buys', label: 'New MF Buys', icon: TrendingUp },
  { href: '/turnover', label: 'Turnover Data', icon: BarChart3 },
  { href: '/delivery', label: 'Most Delivered', icon: Truck },
  { href: '/volume-shockers', label: 'Volume Shockers', icon: Activity },
  { href: '/52-week-high', label: '52W High/Low', icon: TrendingUp },
  { href: '/stumble', label: 'Stumble Stock', icon: Sparkles },
  { href: '/magic-stocks', label: 'Magic Stocks', icon: Crown },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/portfolio': 'Portfolio Analyzer',
  '/fundamental': 'AI Fundamental Analysis',
  '/screener': 'Stock Screener',
  '/compare': 'Stock Comparison',
  '/arbitrage': 'NSE vs BSE Arbitrage',
  '/mf-exposure': 'MF Exposure in Stocks',
  '/mf-new-buys': 'New Stocks Bought by MFs',
  '/turnover': 'Stock Turnover Data',
  '/delivery': 'Most Delivered Stocks',
  '/volume-shockers': 'Volume Shockers (Gainers)',
  '/52-week-high': '52-Week High/Low Stocks',
  '/virtual-portfolio': 'Virtual Paper Trading Portfolio',
  '/stumble': 'Stumble Stock Discovery',
  '/magic-stocks': 'Magic Stocks (Momentum)',
};

function isMarketOpen(): { open: boolean; status: string } {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay(); // 0 = Sun, 6 = Sat
  const h = ist.getHours(), m = ist.getMinutes();
  const mins = h * 60 + m;
  if (day === 0 || day === 6) return { open: false, status: 'Weekend' };
  if (mins >= 555 && mins < 930) return { open: true, status: 'Market Open' };   // 9:15 – 15:30
  if (mins >= 540 && mins < 555) return { open: false, status: 'Pre-Open' };     // 9:00 – 9:15
  if (mins >= 930 && mins < 960) return { open: false, status: 'Closing Session' };
  return { open: false, status: 'Market Closed' };
}

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/yf/search?q=${encodeURIComponent(val)}`);
        const json = await r.json();
        setResults(json.results || []);
        setOpen(true);
      } catch { setResults([]); }
      setLoading(false);
    }, 350);
  };

  const select = (r: any) => {
    setQuery(''); setResults([]); setOpen(false);
    router.push(`/fundamental?symbol=${r.symbol}`);
  };

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search stocks by name or symbol…"
          style={{
            width: '100%', paddingLeft: 30, paddingRight: query ? 28 : 10,
            height: 32, background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 12, color: 'var(--text-primary)',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
            <X size={12} />
          </button>
        )}
      </div>
      {open && (results.length > 0 || loading) && (
        <div style={{
          position: 'absolute', top: 36, left: 0, right: 0, background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 1000, overflow: 'hidden',
        }}>
          {loading && <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>Searching…</div>}
          {results.map(r => (
            <button key={r.ticker} onClick={() => select(r)}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--primary)22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                {r.symbol.slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{r.symbol}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.companyName}</div>
              </div>
              <span className="badge badge-blue" style={{ fontSize: 9 }}>{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">📈</div>
        <div>
          <div className="sidebar-logo-text">StockHelper</div>
          <div className="sidebar-logo-sub">NSE · BSE · AI Analysis</div>
        </div>
      </div>
      <div className="sidebar-section-label">Menu</div>
      <nav className="sidebar-nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-item${path === href ? ' active' : ''}`}>
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div style={{ padding: '12px 8px 16px', borderTop: '1px solid var(--border)' }}>
        <Link href="#" className="nav-item">
          <Settings size={16} /> Settings
        </Link>
      </div>
    </aside>
  );
}

function ThemeSwitcher() {
  const [theme, setTheme] = useState('dark');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyTheme = (t: string) => {
    document.body.classList.remove('theme-light', 'theme-gray', 'theme-golden');
    if (t !== 'dark') document.body.classList.add(`theme-${t}`);
    localStorage.setItem('theme', t);
    setTheme(t);
    setOpen(false);
  };

  const THEMES = [
    { id: 'dark', label: 'Dark Mode', icon: Moon, color: '#3b82f6' },
    { id: 'light', label: 'Light Mode', icon: Sun, color: '#64748b' },
    { id: 'gray', label: 'Gray Pro', icon: Palette, color: '#94a3b8' },
    { id: 'golden', label: 'Golden Rich', icon: Crown, color: '#fbbf24' },
  ];

  const current = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '6px 10px', cursor: 'pointer', color: current.color,
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600
        }}
      >
        <current.icon size={14} />
        <span style={{ color: 'var(--text-secondary)' }}>{current.label.split(' ')[0]}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 38, right: 0, background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 1000, overflow: 'hidden', minWidth: 140
        }}>
          {THEMES.map(t => (
            <button key={t.id} onClick={() => applyTheme(t.id)}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: theme === t.id ? 'var(--primary-glow)' : 'none',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid var(--border)', color: t.color, fontSize: 12, fontWeight: 500
              }}
              onMouseEnter={e => { if (theme !== t.id) e.currentTarget.style.background = 'var(--bg-card)'; }}
              onMouseLeave={e => { if (theme !== t.id) e.currentTarget.style.background = 'none'; }}
            >
              <t.icon size={13} />
              <span style={{ color: 'var(--text-primary)' }}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Topbar() {
  const path = usePathname();
  const title = PAGE_TITLES[path] ?? 'StockHelper';
  const [indices, setIndices] = useState<any[]>([]);
  const [time, setTime] = useState('');
  const [mounted, setMounted] = useState(false);
  const market = isMarketOpen();

  useEffect(() => {
    setMounted(true);
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/nse/indices')
      .then(r => r.json())
      .then(json => { if (!json.error) setIndices(json.indices || []); })
      .catch(() => { });
  }, []);

  if (!mounted) {
    return (
      <header className="topbar">
        <span className="topbar-title">{title}</span>
        <div style={{ flex: 1 }} />
      </header>
    );
  }

  const wantedOrder = ['NIFTY 50', 'SENSEX', 'NIFTY BANK'];
  const tickers = wantedOrder.map(name => indices.find(i => i.name === name)).filter(Boolean);

  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      <GlobalSearch />
      <div className="ticker-strip">
        {tickers.map((t: any) => (
          <div key={t.name} className="ticker-item">
            <span className="ticker-name">{t.name}</span>
            <span className="ticker-value">{fmtNum(t.value)}</span>
            <span className={`ticker-change ${t.change >= 0 ? 'up' : 'down'}`}>
              {changeSign(t.change)}{fmtNum(t.change)} ({changeSign(t.changePct)}{fmtNum(t.changePct)}%)
            </span>
          </div>
        ))}
        {tickers.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.6 }}>Loading…</span>}
      </div>
      <div className="market-time">
        <div className="market-dot" style={{ background: market.open ? 'var(--success)' : '#ef4444' }} />
        {market.status} · {time}
      </div>
      <ThemeSwitcher />
      <button style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
        <Bell size={15} />
      </button>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>StockHelper – Indian Stock Market Analysis</title>
        <meta name="description" content="AI-powered Indian stock market analysis platform for NSE and BSE. Portfolio analysis, MF exposure, fundamental analysis, turnover and delivery data." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-area">
            <Topbar />
            <main className="page-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
