import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pa = searchParams.get('pa');
  const pn = searchParams.get('pn') || 'Payee';
  const am = searchParams.get('am') || '0';
  const tn = searchParams.get('tn') || 'SplitWise Settlement';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (!pa) {
    return NextResponse.redirect(new URL('/dashboard', baseUrl));
  }

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${encodeURIComponent(am)}&cu=INR&tn=${encodeURIComponent(tn)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening UPI Payment...</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #0f172a;
      color: #f8fafc;
      text-align: center;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .icon {
      width: 56px;
      height: 56px;
      background: rgba(16,185,129,0.15);
      color: #10b981;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 700; }
    p { margin: 0 0 20px; font-size: 14px; color: #94a3b8; line-height: 1.6; }
    .amount { font-size: 28px; font-weight: 800; color: #10b981; margin: 12px 0 20px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 14px 24px;
      background: #10b981;
      color: #ffffff;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 4px 14px rgba(16,185,129,0.35);
      transition: background 0.2s;
    }
    .btn:hover { background: #059669; }
    .fallback { margin-top: 16px; font-size: 12px; color: #64748b; }
    .fallback a { color: #818cf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    </div>
    <h2>Opening UPI App</h2>
    <p>Transferring ₹${Number(am).toFixed(2)} to <strong>${pn}</strong> (${pa})</p>
    <div class="amount">₹${Number(am).toFixed(2)}</div>
    <a href="${upiDeepLink}" class="btn">Open UPI App (GPay / PhonePe / Paytm)</a>
    <div class="fallback">
      Already paid? <a href="${baseUrl}/dashboard">Return to Splitwise</a>
    </div>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "${upiDeepLink}";
    }, 300);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
