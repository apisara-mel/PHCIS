import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import InputField from '@/components/forms/InputField';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import Icon from '@/components/icons/Icon';
import useSearchHistory from '@/components/search/useSearchHistory';
import { PATIENT_PROFILES } from '@/data/patientProfiles';
import { MR_PATIENTS } from '@/data/mrPatients';
import { HIGHLIGHT_MATCH_MARK_STYLE, highlightMatch } from '@/components/forms/textareaSuggestions';

/* MIH PatientLookupField — ช่องชื่อผู้รับบริการที่ "ค้นจากฐานข้อมูลก็ได้ พิมพ์ใหม่ก็ได้"

   ใช้ที่ป๊อปอัป "เพิ่มคิว" ของระบบงานเวชระเบียน (มติผู้ใช้ 29 ส.ค. 69):
   เจ้าหน้าที่หน้าเคาน์เตอร์เจอสองกรณีสลับกันตลอดวัน — คนไข้เก่าที่มีประวัติ
   อยู่แล้ว (พิมพ์ชื่อ/HN แล้วเลือกจากรายการ คิวจะผูกกับ HN เดิมทันที) กับคน
   ที่ยังไม่เคยมา (พิมพ์ชื่อลงไปตรง ๆ ไม่ต้องเลือกอะไร)

   จึงไม่ใช่ Select (บังคับเลือกจากรายการ) และไม่ใช่ InputField เปล่า ๆ
   (ผูก HN ไม่ได้) แต่เป็น combobox ที่ค่าอิสระเป็นพลเมืองชั้นหนึ่ง:
     • พิมพ์ ≥ 1 ตัวอักษร → ป๊อปอัปรายชื่อที่ตรงกับ ชื่อ / HN / เลขบัตร / โทรศัพท์
     • เลือกแถว → เติมชื่อเต็ม + คืนโปรไฟล์ผ่าน `onSelectPatient`
     • พิมพ์ต่อหลังเลือก → ถือว่าไม่ใช่คนเดิมแล้ว ปลดการผูก HN ให้อัตโนมัติ
     • ไม่มีผลลัพธ์ → บอกว่าจะบันทึกเป็นผู้รับบริการรายใหม่ ไม่ใช่ error

   ค่าที่พิมพ์เองไม่เคยถูกเขียนทับหรือปัดทิ้ง — การพิมพ์คือเส้นทางปกติ ไม่ใช่
   ทางหนีเมื่อค้นไม่เจอ */

const MAX_RESULTS = 8;
const POPOVER_MAX_HEIGHT = 320;

const MR_BY_HN = Object.fromEntries(MR_PATIENTS.map((p) => [p.hn, p]));

const digitsOnly = (v) => String(v ?? '').replace(/\D/g, '');

/* อายุในกองโปรไฟล์เก็บเป็น "42 ปี - 3 เดือน - 8 วัน" — รายการค้นหาต้องการแค่ปี */
const ageYears = (age) => {
  const m = String(age ?? '').match(/^\s*(\d+)\s*ปี/u);
  return m ? `${m[1]} ปี` : '';
};

/** ค้นจากกองโปรไฟล์เดียวกับที่ตารางคิวและหน้าคัดกรองใช้ — สองที่ต้องเห็นคนคนเดียวกัน */
export const searchPatients = (query, limit = MAX_RESULTS) => {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return [];
  const qDigits = digitsOnly(q);
  const rows = [];
  for (const p of PATIENT_PROFILES) {
    if (!p.hn) continue;
    const mr = MR_BY_HN[p.hn];
    const phone = mr?.phone ?? '';
    const hit =
      String(p.fullName ?? '').toLowerCase().includes(q)
      || String(p.shortName ?? '').toLowerCase().includes(q)
      || String(p.englishName ?? '').toLowerCase().includes(q)
      || String(p.hn ?? '').toLowerCase().includes(q)
      /* เลขบัตร/โทรศัพท์ เทียบเฉพาะตัวเลข ผู้ใช้พิมพ์ขีดหรือไม่ก็ได้ */
      || (qDigits.length >= 3 && digitsOnly(p.nationalId).includes(qDigits))
      || (qDigits.length >= 3 && digitsOnly(phone).includes(qDigits));
    if (!hit) continue;
    rows.push({ ...p, phone });
    if (rows.length >= limit) break;
  }
  return rows;
};

const PatientLookupField = ({
  value,
  onChange,
  /** เรียกเมื่อผู้ใช้เลือกคนจากฐานข้อมูล (คืนโปรไฟล์) หรือปลดการผูก (คืน null) */
  onSelectPatient,
  /** โปรไฟล์ที่ผูกอยู่ตอนนี้ — ควบคุมจากภายนอกเพื่อให้ล้างพร้อมฟอร์มได้ */
  selected = null,
  placeholder = 'พิมพ์ชื่อ หรือ HN / เลขบัตร / เบอร์โทร',
  disabled = false,
  ariaLabel = 'ค้นหาผู้รับบริการ',
  /* ป๊อปอัป "เพิ่มคิว" ไม่เอาไอคอนแว่นขยาย — ช่องนี้อยู่ในฟอร์มกรอกข้อมูล
     ไม่ใช่แถบค้นหาของหน้า ไอคอนทำให้อ่านเป็นคนละอย่าง (มติผู้ใช้ 29 ส.ค. 69) */
  showSearchIcon = true,
  /** localStorage key ของ "ค้นหาล่าสุด" — ไม่ส่งมา = ไม่เก็บประวัติ */
  historyKey,
}) => {
  const { history, push: pushHistory, clear: clearHistory } =
    useSearchHistory(historyKey ?? '', { limit: 6 });
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [pos, setPos] = useState(null);
  const boxRef = useRef(null);
  const popoverRef = useRef(null);

  const query = String(value ?? '');
  /* เลือกคนแล้ว = ช่องนี้แสดง "คำตอบ" ไม่ใช่ "คำค้น" จึงไม่ต้องเปิดรายการซ้ำ */
  const results = useMemo(
    () => (selected ? [] : searchPatients(query)),
    [query, selected],
  );
  const hasQuery = query.trim().length > 0;
  /* วางเคอร์เซอร์แล้วยังไม่พิมพ์ → โชว์ "ค้นหาล่าสุด" เจ้าหน้าที่หน้าเคาน์เตอร์
     มักออกคิวให้คนเดิมซ้ำในวันเดียวกัน (พามาหลายแผนก) การพิมพ์ชื่อใหม่ทุกครั้ง
     เป็นงานซ้ำที่ตัดได้ (มติผู้ใช้ 29 ส.ค. 69) */
  const showHistory = open && !disabled && !hasQuery && !selected && history.length > 0;
  const showPopover = (open && !disabled && hasQuery && !selected) || showHistory;

  const updatePos = useCallback(() => {
    const el = boxRef.current;
    if (!el || typeof window === 'undefined') return;
    const r = el.getBoundingClientRect();
    const gutter = 8;
    const below = window.innerHeight - r.bottom - gutter;
    const above = r.top - gutter;
    /* ป๊อปอัปเปิดขึ้นบนเมื่อที่ว่างด้านล่างไม่พอ — ช่องนี้อยู่ในป๊อปอัปอีกที
       บางจอจึงชิดขอบล่างอยู่แล้ว */
    const dropUp = below < 160 && above > below;
    setPos({
      left: r.left,
      width: r.width,
      top: dropUp ? undefined : r.bottom + 4,
      bottom: dropUp ? window.innerHeight - r.top + 4 : undefined,
      maxHeight: Math.min(POPOVER_MAX_HEIGHT, Math.max(120, dropUp ? above : below)),
    });
  }, []);

  useEffect(() => {
    if (!showPopover) return undefined;
    updatePos();
    const onScroll = () => updatePos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [showPopover, updatePos]);

  useEffect(() => { setActiveIdx(-1); }, [query]);

  /* คลิกนอกช่อง+ป๊อปอัป → ปิด แต่ข้อความที่พิมพ์ไว้ยังอยู่ครบ */
  useEffect(() => {
    if (!showPopover) return undefined;
    const onDown = (e) => {
      if (boxRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showPopover]);

  const pick = (p) => {
    onChange?.(p.fullName);
    onSelectPatient?.(p);
    if (historyKey) {
      pushHistory({
        id: p.hn,
        label: p.fullName,
        sublabel: `HN ${p.hn}`,
        value: p.fullName,
        avatarUrl: p.avatarUrl,
      });
    }
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleChange = (next) => {
    onChange?.(next);
    /* แก้ข้อความหลังเลือกแล้ว = ไม่ใช่คนเดิม ปลด HN ทิ้งทันที ไม่ให้คิวไปผูก
       กับคนที่ชื่อบนหน้าจอไม่ตรงกับเขา */
    if (selected) onSelectPatient?.(null);
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!showPopover || results.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      /* Enter เลือกเฉพาะตอนเลื่อนมาไฮไลต์แถวแล้ว — ไม่งั้นคนที่ตั้งใจพิมพ์ชื่อ
         ใหม่แล้วกด Enter จะโดนสลับเป็นคนอื่นโดยไม่ตั้งใจ */
      e.preventDefault();
      pick(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const rowBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--dim-space-300)',
    width: '100%',
    padding: 'var(--dim-space-200) var(--dim-space-300)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
      <div ref={boxRef} className='w-full'>
        <InputField
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          leadingIcon={showSearchIcon ? 'search' : undefined}
          showLeadingIcon={showSearchIcon}
          showFieldName={false}
          showLabel={false}
          showHelperText={false}
          role='combobox'
          aria-expanded={showPopover}
          aria-autocomplete='list'
          aria-label={ariaLabel}
        />
      </div>

      {/* ผูกกับ HN แล้ว — บอกให้เห็นว่าคิวนี้จะเข้าประวัติเดิม ไม่ใช่สร้างคนใหม่ */}
      {selected && (
        <div
          className='inline-flex items-center w-full'
          style={{
            gap: 'var(--dim-space-200)',
            padding: 'var(--dim-space-200) var(--dim-space-300)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            background: 'var(--surface-brandPrimary-quaternary)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        >
          <QueuePatientAvatar
            hn={selected.hn}
            name={selected.shortName ?? selected.fullName}
            avatarUrl={selected.avatarUrl}
            size={24}
          />
          <span style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.5,
          }}>
            {`ผูกกับประวัติเดิม · HN ${selected.hn}`}
          </span>
          <div className='flex-1' />
          <button
            type='button'
            onClick={() => { onSelectPatient?.(null); onChange?.(''); }}
            className='inline-flex items-center shrink-0'
            style={{
              gap: 'var(--dim-space-100)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
            }}
          >
            <Icon name='close' size={14} />
            เปลี่ยน
          </button>
        </div>
      )}

      {showPopover && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          role='listbox'
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            bottom: pos.bottom,
            width: pos.width,
            maxHeight: pos.maxHeight,
            overflowY: 'auto',
            /* เหนือ Popup ของ "เพิ่มคิว" (z 1300) ไม่งั้นรายการจะถูกบัง */
            zIndex: 1400,
            padding: 'var(--dim-space-100)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            background: 'var(--surface-card-100)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            boxShadow: 'var(--shadow-card-strong)',
          }}
        >
          {/* ค้นหาล่าสุด — โผล่ตอนวางเคอร์เซอร์แต่ยังไม่พิมพ์ พอเริ่มพิมพ์
              รายการนี้ถูกแทนที่ด้วยผลค้นหาทันที */}
          {showHistory && (
            <>
              <div
                className='flex items-center'
                style={{ padding: 'var(--dim-space-200) var(--dim-space-300)' }}
              >
                <span style={{
                  color: 'var(--text-content-tertiary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  fontWeight: 'var(--type-weight-medium)',
                }}>
                  ค้นหาล่าสุด
                </span>
                <div className='flex-1' />
                <button
                  type='button'
                  onClick={clearHistory}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-brandPrimary-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                  }}
                >
                  ล้างประวัติ
                </button>
              </div>
              {history.map((h) => {
                const label = typeof h === 'string' ? h : (h.label ?? h.value ?? '');
                const hn = typeof h === 'string' ? '' : (h.id ?? '');
                return (
                  <button
                    key={typeof h === 'string' ? h : (h.id ?? label)}
                    type='button'
                    role='option'
                    aria-selected={false}
                    /* กดแล้วเลือกคนนั้นจริง ไม่ใช่แค่เติมคำค้น — ประวัติเก็บ HN
                       มาด้วย จึงผูกกลับได้ตรงคน */
                    onClick={() => {
                      const hit = hn ? PATIENT_PROFILES.find((x) => x.hn === hn) : null;
                      if (hit) pick({ ...hit, phone: MR_BY_HN[hit.hn]?.phone ?? '' });
                      else { onChange?.(label); setOpen(false); }
                    }}
                    style={{ ...rowBase, borderRadius: 'var(--dim-radius-200, 8px)' }}
                  >
                    <Icon name='history' size={16} color='var(--icon-topic-default)' />
                    <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                      <span
                        className='min-w-0'
                        style={{
                          color: 'var(--text-content-default)',
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-sm)',
                          lineHeight: 1.5,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {label}
                      </span>
                      {hn && (
                        <span style={{
                          color: 'var(--text-content-tertiary)',
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-xs)',
                          lineHeight: 1.5,
                        }}>
                          {`HN ${hn}`}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {hasQuery && results.map((p, i) => (
            <button
              key={p.hn}
              type='button'
              role='option'
              aria-selected={i === activeIdx}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => pick(p)}
              style={{
                ...rowBase,
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: i === activeIdx
                  ? 'var(--surface-brandPrimary-quaternary)'
                  : 'transparent',
              }}
            >
              <QueuePatientAvatar
                hn={p.hn}
                name={p.shortName ?? p.fullName}
                avatarUrl={p.avatarUrl}
                size={32}
              />
              <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                <span
                  className='min-w-0'
                  style={{
                    color: 'var(--text-content-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: 'var(--type-weight-medium)',
                    lineHeight: 1.5,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {highlightMatch(p.fullName, query, `pl-${p.hn}`)}
                </span>
                <span style={{
                  color: 'var(--text-content-tertiary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  lineHeight: 1.5,
                }}>
                  {[`HN ${p.hn}`, ageYears(p.age), p.phone].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          ))}

          {/* ไม่พบ = เรื่องปกติ ไม่ใช่ error — บอกว่าที่พิมพ์ไว้จะถูกใช้ต่อได้เลย */}
          {hasQuery && results.length === 0 && (
            <div
              className='flex items-start'
              style={{
                gap: 'var(--dim-space-200)',
                padding: 'var(--dim-space-300)',
              }}
            >
              <Icon name='person_add' size={16} color='var(--icon-topic-default)' />
              <span style={{
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.5,
              }}>
                ไม่พบในฐานข้อมูล — จะบันทึก
                <span style={HIGHLIGHT_MATCH_MARK_STYLE}>{` ${query.trim()} `}</span>
                เป็นผู้รับบริการรายใหม่ ตัวตนจริงกรอกได้ในฟอร์มลงทะเบียน
              </span>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};

export default PatientLookupField;
