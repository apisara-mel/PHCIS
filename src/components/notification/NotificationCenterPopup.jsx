import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  NOTIFICATION_CATEGORIES, SEVERITIES,
  getNotifications, subscribeNotifications, markRead, markAllRead,
} from '@/data/userNotifications';

/* ศูนย์รวมการแจ้งเตือน — TOR §1.17.5.5
   ══════════════════════════════════════════════════════════════════════
   เมนู "แจ้งเตือน" ในเมนูข้างเปิดป๊อปอัปนี้ (มติผู้ใช้ 29 ส.ค. 69) เดิมเปิด
   Popover ที่มีแต่ log push ของ Mobile App ซึ่งเป็นการแจ้งเตือนแค่ช่องทางเดียว
   เจ้าหน้าที่จึงต้องไปตามหาการแจ้งเตือนที่เหลือทีละหน้าเอง

   หมวดทั้งหมดมาจากข้อ TOR ที่ระบุการแจ้งเตือนไว้ (ดู NOTIFICATION_CATEGORIES
   ในไฟล์ข้อมูล — แต่ละหมวดพก `tor` ของตัวเองมาด้วย):
     §1.17.5.5  รับส่งตัว · รับผล · ส่งตรวจ · ค่าวิกฤต
     §1.5.4.18–21 / §1.9.2.9–10  ยาและ CDSS
     §4.3.5     คิวและนัดหมาย
     §1.1.1.19  ข้อมูลพึงระวัง (Flag)
     §5.1.16 / §5.1.24.7  คลังยา

   กดรายการ = อ่านแล้ว + พาไปหน้าต้นทาง — การแจ้งเตือนที่กดแล้วไม่พาไปไหน
   บังคับให้ผู้ใช้ไปหาเองอีกที ซึ่งเป็นเหตุผลที่คนเลิกกดการแจ้งเตือน */

const SEVERITY_TONE = Object.fromEntries(SEVERITIES.map((s) => [s.key, s.tone]));
const SEVERITY_LABEL = Object.fromEntries(SEVERITIES.map((s) => [s.key, s.label]));
const CATEGORY_BY_KEY = Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c.key, c]));

const ALL_KEY = 'all';
const UNREAD_KEY = 'unread';

const NotificationCenterPopup = ({ open, onClose, center = null }) => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState(ALL_KEY);

  useEffect(() => subscribeNotifications(() => setTick((t) => t + 1)), []);
  /* เปิดใหม่ = เริ่มที่ภาพรวมเสมอ ไม่ค้างตัวกรองของครั้งก่อนซึ่งอาจทำให้
     เข้าใจผิดว่าไม่มีการแจ้งเตือนใหม่ */
  useEffect(() => { if (open) setFilter(ALL_KEY); }, [open]);

  const all = useMemo(
    () => getNotifications(center),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [center, tick],
  );

  const unreadTotal = all.filter((n) => !n.read).length;

  const counts = useMemo(() => {
    const map = { [ALL_KEY]: all.length, [UNREAD_KEY]: unreadTotal };
    NOTIFICATION_CATEGORIES.forEach((c) => {
      map[c.key] = all.filter((n) => n.category === c.key).length;
    });
    return map;
  }, [all, unreadTotal]);

  const rows = useMemo(() => {
    if (filter === ALL_KEY) return all;
    if (filter === UNREAD_KEY) return all.filter((n) => !n.read);
    return all.filter((n) => n.category === filter);
  }, [all, filter]);

  const openItem = (n) => {
    markRead(n.id, true);
    onClose?.();
    if (n.link) history.push(n.link);
  };

  const chips = [
    { key: ALL_KEY, label: 'ทั้งหมด' },
    { key: UNREAD_KEY, label: 'ยังไม่อ่าน' },
    ...NOTIFICATION_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
  ];

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='การแจ้งเตือน'
      subtitle={unreadTotal > 0
        ? `ยังไม่อ่าน ${unreadTotal} รายการ จากทั้งหมด ${all.length} รายการ`
        : `อ่านครบทุกรายการแล้ว · ทั้งหมด ${all.length} รายการ`}
      /* extraLarge = เต็มจอ ซึ่งใหญ่เกินสำหรับรายการแจ้งเตือน (มติผู้ใช้
         29 ส.ค. 69) · large = 1024px ขอบสูงสุด ซึ่งพอดีกับชิป 10 อันและ
         รายการที่มีสามบรรทัดต่อรายการ */
      size='large'
      showCloseButton
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={{
        label: 'ทำเครื่องหมายว่าอ่านแล้วทั้งหมด',
        onClick: () => markAllRead(center),
        disabled: unreadTotal === 0,
      }}
    >
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        {/* ตัวกรองหมวด — ชิปทรงเดียวกับแท็บของหน้า worklist · 10 ชิปยาวเกิน
            ความกว้างป๊อปอัป ต้องตกบรรทัดใหม่ ไม่ใช่ถูกตัดหายไปทางขวา */}
        <TabBar aria-label='หมวดการแจ้งเตือน' className='flex-wrap'>
          {chips.map((c) => (
            <TabPill
              key={c.key}
              size='small'
              selected={filter === c.key}
              count={counts[c.key] ?? 0}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
            </TabPill>
          ))}
        </TabBar>

        {/* หมวดที่เลือกอยู่บอกที่มาตาม TOR — ผู้ตรวจรับงานต้องเห็นว่าแจ้งเตือน
            นี้มาจากข้อไหน ไม่ใช่หมวดที่คิดขึ้นเอง */}
        {CATEGORY_BY_KEY[filter] && (
          <div
            className='flex items-start w-full'
            style={{
              gap: 'var(--dim-space-200)',
              padding: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-brandPrimary-quaternary)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            }}
          >
            <Icon name='info' size={16} color='var(--icon-topic-default)' />
            <span style={{
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}>
              {`${CATEGORY_BY_KEY[filter].desc} · TOR ข้อ ${CATEGORY_BY_KEY[filter].tor}`}
            </span>
          </div>
        )}

        <div
          className='flex flex-col w-full min-w-0'
          /* สูงตามเนื้อหา แต่ไม่เกินครึ่งจอ — รายการยาวแล้วให้เลื่อนในกล่องตัวเอง
             ไม่ดันป๊อปอัปจนปุ่มท้ายหลุดออกนอกจอ */
          style={{ maxHeight: '52vh', overflowY: 'auto' }}
        >
          {rows.length === 0 && (
            <div
              className='flex flex-col items-center w-full'
              style={{ gap: 'var(--dim-space-200)', padding: 'var(--dim-space-1200, 48px)' }}
            >
              <Icon name='notifications_off' size={24} color='var(--icon-content-tertiary)' />
              <span style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
              }}>
                ไม่มีการแจ้งเตือนในหมวดนี้
              </span>
            </div>
          )}

          {rows.map((n) => {
            const cat = CATEGORY_BY_KEY[n.category];
            return (
              <button
                key={n.id}
                type='button'
                onClick={() => openItem(n)}
                className='flex items-start w-full text-left'
                style={{
                  gap: 'var(--dim-space-300)',
                  padding: 'var(--dim-space-300)',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line, #F4FBF8)',
                  /* ยังไม่อ่าน = พื้นอ่อน ๆ ไม่ใช่แค่จุดเล็ก ๆ ที่มองข้ามได้ */
                  background: n.read ? 'transparent' : 'var(--surface-brandPrimary-quaternary)',
                }}
              >
                <span
                  className='shrink-0 inline-flex items-center justify-center'
                  style={{
                    width: 'var(--dim-size-1000, 32px)',
                    height: 'var(--dim-size-1000, 32px)',
                    borderRadius: 'var(--dim-radius-full)',
                    background: 'var(--surface-card-100)',
                    border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  }}
                >
                  <Icon name={cat?.icon || 'notifications'} size={16} color='var(--icon-topic-default)' />
                </span>

                <span className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-100)' }}>
                  <span className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                    <span
                      className='min-w-0'
                      style={{
                        color: 'var(--text-content-default)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                        fontWeight: n.read ? 'var(--type-weight-regular)' : 'var(--type-weight-medium)',
                        lineHeight: 1.5,
                      }}
                    >
                      {n.title}
                    </span>
                    {n.severity !== 'normal' && (
                      <ColorfulBadge style={SEVERITY_TONE[n.severity]} size='small' hierarchy='secondary' width='hug'>
                        {SEVERITY_LABEL[n.severity]}
                      </ColorfulBadge>
                    )}
                    {cat && (
                      <ColorfulBadge style={cat.tone} size='small' hierarchy='secondary' width='hug'>
                        {cat.label}
                      </ColorfulBadge>
                    )}
                  </span>

                  <span style={{
                    color: 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                    lineHeight: 1.5,
                  }}>
                    {n.body}
                  </span>

                  <span style={{
                    color: 'var(--text-content-tertiary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                    lineHeight: 1.5,
                  }}>
                    {[n.patient ? `${n.patient}${n.hn ? ` · HN ${n.hn}` : ''}` : '', n.source, n.at]
                      .filter(Boolean).join(' · ')}
                  </span>
                </span>

                {!n.read && (
                  <NeutralSubdueButton
                    variant='outline'
                    size='sm'
                    onClick={(e) => { e.stopPropagation(); markRead(n.id, true); }}
                  >
                    อ่านแล้ว
                  </NeutralSubdueButton>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Popup>
  );
};

export default NotificationCenterPopup;
