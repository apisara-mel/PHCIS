import React, { useMemo } from 'react';
import FormsLibrary from '@/components/forms/FormsLibrary';
import Icon from '@/components/icons/Icon';
import { getStationTimes } from '@/data/opdScreeningDrafts';

/* ScreeningStep5 — OPD Screening step 5 wrapper (แบบฟอร์ม + audit).
   TOR 1.2.3.4: surfaces the per-station service times of this visit as a
   read-only audit table (สถานี · เวลาเริ่ม · เวลาเสร็จ · ผู้ให้บริการ) on
   the summary step, extending 1.2.2.7's auto-stamp. ScreeningPage stamps
   enter/leave into the sessionStorage store on every step change; this
   table renders whatever has been recorded so far for the patient. */

const cellStyle = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  color: 'var(--text-content-default, #363B3F)',
  paddingTop: 'var(--dim-space-200)',
  paddingBottom: 'var(--dim-space-200)',
  paddingLeft: 'var(--dim-space-300)',
  paddingRight: 'var(--dim-space-300)',
  borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const ScreeningStep5 = ({ onValidityChange, patient = {} }) => {
  const stations = useMemo(() => getStationTimes(patient.hn || ''), [patient.hn]);

  return (
    <div className='flex flex-col'>
      <FormsLibrary onValidityChange={onValidityChange} />

      <section
        className='flex flex-col'
        style={{
          gap: 'var(--dim-space-300)',
          paddingTop: 'var(--dim-space-0, 0px)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
        }}
      >
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <Icon name='schedule' size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
          <h2
            style={{
              marginTop: 'var(--dim-space-0, 0px)',
              marginRight: 'var(--dim-space-0, 0px)',
              marginBottom: 'var(--dim-space-0, 0px)',
              marginLeft: 'var(--dim-space-0, 0px)',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontFamily: 'var(--type-family-heading-content)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              fontSize: 'var(--type-size-base)',
            }}
          >
            เวลารับบริการรายจุด (บันทึกอัตโนมัติ — อ่านอย่างเดียว)
          </h2>
        </div>

        {stations.length === 0 ? (
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            ยังไม่มีการบันทึกเวลารายจุดของการมารับบริการครั้งนี้
          </span>
        ) : (
          <div className='w-full' style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {['สถานี', 'เวลาเริ่ม', 'เวลาเสร็จ', 'ผู้ให้บริการ'].map((h) => (
                    <th
                      key={h}
                      style={{
                        ...cellStyle,
                        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                        color: 'var(--text-content-secondary, #636B72)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stations.map((s, i) => (
                  <tr key={`${s.station}-${i}`}>
                    <td style={{ ...cellStyle, fontWeight: 'var(--type-weight-medium)' }}>{s.station}</td>
                    <td style={cellStyle}>{s.start || '—'} น.</td>
                    <td style={cellStyle}>{s.end ? `${s.end} น.` : 'กำลังให้บริการ'}</td>
                    <td style={cellStyle}>{s.provider || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ScreeningStep5;
