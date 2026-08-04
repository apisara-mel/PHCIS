import { useLocation } from 'react-router-dom';

/* สิทธิ์การใช้งานของงานชันสูตรโรค — mock permission resolver.

   There is no auth layer anywhere in this frontend, so every lab page used to
   hardcode `const canEdit = true`. That made the read-only / "สิทธิ์ไม่พอ"
   state that the playbook §5 requires literally unreachable: every `disabled`
   branch and every explanatory `title` in the lab screens was dead code that
   could never render, and nobody could review whether it read correctly.

   This module does not add authentication — it makes the permission a single
   resolved value instead of a scattered constant, and it makes the
   non-editing state DEMONSTRABLE by reading a role off the URL:

     /lab/interface                 → ผู้ดูแลระบบ (default, everything enabled)
     /lab/interface?role=tech       → นักเทคนิคการแพทย์ (bench work, no LIS password)
     /lab/interface?role=viewer     → ผู้ดูข้อมูล (read-only, every write disabled)

   A viewer sees the whole screen with its actions disabled rather than being
   bounced off it: a hidden screen reads as a broken deployment, a disabled
   one reads as "you need a different role". Every disabled control pairs with
   `title={perm.canEdit ? undefined : perm.denyReason}` so the reason is
   available on hover, not guessed.

   When a real auth layer arrives, only this file changes. */

export const LAB_ROLES = {
  admin: {
    key: 'admin',
    label: 'ผู้ดูแลระบบห้องปฏิบัติการ',
    canEdit: true,
    isAdmin: true,
  },
  tech: {
    key: 'tech',
    label: 'นักเทคนิคการแพทย์',
    canEdit: true,
    /* Bench staff record results and QC, but the LIS database password is an
       administrator's credential — showing or editing it is a different
       permission from doing the day's work. */
    isAdmin: false,
  },
  viewer: {
    key: 'viewer',
    label: 'ผู้ดูข้อมูล (อ่านอย่างเดียว)',
    canEdit: false,
    isAdmin: false,
  },
};

export const DEFAULT_LAB_ROLE = 'admin';

const DENY_EDIT = 'สิทธิ์ไม่พอ — ต้องมีสิทธิ์เจ้าหน้าที่ห้องปฏิบัติการจึงจะบันทึกหรือแก้ไขได้';
const DENY_ADMIN = 'สิทธิ์ไม่พอ — ต้องมีสิทธิ์ผู้ดูแลระบบจึงจะแก้ไขหรือแสดงรหัสผ่านได้';

export const labPermissionsFor = (roleKey) => {
  const role = LAB_ROLES[roleKey] ?? LAB_ROLES[DEFAULT_LAB_ROLE];
  return {
    role: role.key,
    roleLabel: role.label,
    canEdit: role.canEdit,
    isAdmin: role.isAdmin,
    /* Undefined when allowed, so a caller can pass it straight into `title`
       without a ternary of its own. */
    denyReason: role.canEdit ? undefined : DENY_EDIT,
    denyAdminReason: role.isAdmin ? undefined : DENY_ADMIN,
    readOnly: !role.canEdit,
  };
};

export const labRoleFromSearch = (search) => {
  const raw = new URLSearchParams(String(search ?? '')).get('role');
  return LAB_ROLES[raw] ? raw : DEFAULT_LAB_ROLE;
};

/* React 17 — no useSyncExternalStore. useLocation already re-renders on every
   navigation, which is the only thing that can change the role here. */
export const useLabPermissions = () => {
  const { search } = useLocation();
  return labPermissionsFor(labRoleFromSearch(search));
};
