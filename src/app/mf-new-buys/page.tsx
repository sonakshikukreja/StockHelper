'use client';
import { AlertCircle, Database, ExternalLink, Calendar } from 'lucide-react';

export default function NewMFBuysPage() {
    return (
        <>
            <div className="page-header">
                <h1>New Stocks Bought by Mutual Funds</h1>
                <p>Fresh positions initiated by Indian mutual funds — from AMFI monthly portfolio disclosures.</p>
            </div>

            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 16, padding: '32px', textAlign: 'center', marginBottom: 24 }}>
                <Calendar size={48} style={{ color: 'var(--primary)', opacity: 0.6, marginBottom: 16 }} />
                <h2 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>AMFI Monthly Data Not Available</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 20px', lineHeight: 1.7, fontSize: 14 }}>
                    New MF buys (fresh positions) can only be determined by comparing consecutive monthly portfolio disclosures from AMFI.
                    This data is published around the <strong>10th of each month</strong> and requires parsing AMFI files to compute delta positions.
                    Please use these reliable sources:
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="https://www.amfiindia.com/modules/MonthlyPortfolio" target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--primary)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink size={14} /> AMFI Monthly Portfolio
                    </a>
                    <a href="https://mfapi.in/" target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink size={14} /> MFAPI.in
                    </a>
                    <a href="https://www.valueresearchonline.com/funds/findafund/" target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink size={14} /> Value Research
                    </a>
                </div>
            </div>

            <div className="info-ribbon">
                <AlertCircle size={14} color="var(--primary)" />
                <strong style={{ color: 'var(--text-primary)' }}>How to enable this:</strong>&nbsp;
                Integrate AMFI's monthly portfolio TXT files (available free at amfiindia.com) or use a service like mfapi.in to compute delta positions between months.
            </div>
        </>
    );
}
