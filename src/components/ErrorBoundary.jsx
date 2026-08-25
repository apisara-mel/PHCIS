import React from 'react';

/* Catches render errors so the tab is not a blank white screen.

   `resetKey` — เปลี่ยนค่าเมื่อไหร่ก็ล้าง error state (Routes.jsx ส่ง
   pathname เข้ามา) เดิม boundary จับ error แล้ว **ค้างถาวร**: ผู้ใช้กด
   เมนูอื่นก็ยังเห็นหน้า error เพราะ state ไม่เคยถูกล้าง ต้อง reload ทั้ง
   แท็บถึงจะกลับมาใช้งานได้ — หน้าเดียวพังจึงทำให้ทั้งระบบใช้ไม่ได้
   (เจอตอนกวาด route ทั้งหมด 25 ส.ค. 69) */
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

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      /* eslint-disable-next-line react/no-did-update-set-state */
      this.setState({ error: null });
    }
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
        {/* ทางออกให้ผู้ใช้จริง — เดิมมีแต่คำแนะนำสำหรับนักพัฒนา
            (`npm run dev`) ซึ่งเจ้าหน้าที่ที่หน้างานทำตามไม่ได้ */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            type='button'
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--dim-radius-200, 8px)',
              border: 'var(--dim-stroke-100, 1px) solid #FECACA',
              background: '#fff',
              color: '#7F1D1D',
              fontFamily: 'inherit',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            โหลดหน้านี้ใหม่
          </button>
          <button
            type='button'
            onClick={() => { window.location.href = '/'; }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--dim-radius-200, 8px)',
              border: 'none',
              background: '#7F1D1D',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            กลับหน้าแรก
          </button>
        </div>
      </div>
    );
  }
}
