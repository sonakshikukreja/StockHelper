// ── Shared utility functions ──────────────────────────────────────────────

export function fmtNum(n: any, dec = 2) {
    if (n === null || n === undefined || isNaN(Number(n))) return '0';
    return Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtCr(n: any) {
    if (n === null || n === undefined || isNaN(Number(n))) return '₹0 Cr';
    const num = Number(n);
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L Cr`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(2)}K Cr`;
    return `₹${num.toFixed(2)} Cr`;
}

export function changeClass(n: number) { return n >= 0 ? 'up' : 'down'; }
export function changeSign(n: number) { return n >= 0 ? '+' : ''; }
