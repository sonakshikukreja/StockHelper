'use client';
import { AlertCircle, Database, ExternalLink } from 'lucide-react';

export default function MFExposurePage() {
    return (
        <>
            <div className="page-header">
                <h1>Mutual Fund Exposure in Stocks</h1>
                <p>See which mutual funds hold a given stock — from AMFI monthly portfolio disclosures.</p>
            </div>

            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 16, padding: '32px', textAlign: 'center', marginBottom: 24 }}>
                <Database size={48} style={{ color: 'var(--primary)', opacity: 0.6, marginBottom: 16 }} />
                <h2 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Live AMFI Data Not Available</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto 20px', lineHeight: 1.7, fontSize: 14 }}>
                    Mutual fund portfolio disclosures are published <strong>monthly</strong> by AMFI (Association of Mutual Funds in India)
                    as PDF/Excel files. There is no public real-time API available for this data.
                    To access current MF holdings data, please visit:
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="https://www.amfiindia.com/modules/MonthlyPortfolio" target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--primary)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink size={14} /> AMFI Monthly Portfolio
                    </a>
                    <a href="https://www.valueresearchonline.com/" target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink size={14} /> Value Research Online
                    </a>
                    <a href="https://mfapi.in/" target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink size={14} /> MFAPI.in (Free API)
                    </a>
                </div>
            </div>

            <div className="info-ribbon">
                <AlertCircle size={14} color="var(--primary)" />
                <strong style={{ color: 'var(--text-primary)' }}>Note:</strong>&nbsp;
                AMFI publishes fund portfolios on the 10th of each month for the previous month. Integration with MFAPI.in or direct AMFI parsing can enable this feature.
            </div>
        </>
    );
}
