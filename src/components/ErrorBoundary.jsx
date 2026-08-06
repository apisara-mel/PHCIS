import React from 'react';

/* Catches render errors so the tab is not a blank white screen. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[PHCIS ErrorBoundary]', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { compact = false } = this.props;

    return (
      <div
        role='alert'
        style={{
          minHeight: compact ? 'auto' : '100vh',
          padding: 'var(--dim-space-600, 24px)',
          background: '#FEF2F2',
          color: '#7F1D1D',
          fontFamily: 'var(--type-family-body, Sarabun, sans-serif)',
        }}
      >
        <h1 style={{ margin: '0 0 12px', fontSize: 20 }}>โหลดหน้านี้ไม่สำเร็จ</h1>
        <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.6 }}>
          React หยุดทำงานก่อนแสดง UI — ดูรายละเอียดด้านล่างหรือเปิด Console (F12)
        </p>
        <pre
          style={{
            margin: 'var(--dim-space-0)',
            padding: 'var(--dim-space-400)',
            background: '#fff',
            borderRadius: 'var(--dim-radius-200)',
            border: 'var(--dim-stroke-100) solid #FECACA',
            fontSize: 12,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error?.stack || error?.message || String(error)}
        </pre>
        <p style={{ margin: '16px 0 0', fontSize: 13 }}>
          ลองรัน <code>npm run dev</code> แล้วเปิด{' '}
          <strong>http://127.0.0.1:3000/preview/body-record</strong>
        </p>
      </div>
    );
  }
}
