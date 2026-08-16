/* Logged-in PHCIS staff — single mock identity shared by Hub profile cover,
   Sidebar user row, HubSidebar / ScheduleSidebar, and ProfilePopover. */

export const PHCIS_CURRENT_USER = {
  /* Stable session identity. Authorization must resolve this id against the
     active user directory; displayName is presentation only. */
  id: 'u-001',
  role: 'doctor',
  status: 'active',
  displayName: 'พญ.สมหญิง รักษ์ดี',
  displayNameEn: 'Somying Rakdee',
  employeeCode: 'EMP-0001',
  groupPolicy: 'แพทย์',
  subBranch: 'ทันตแพทย์',
  department: 'ทันตกรรม',
  departmentKey: 'dental',
};

/** Figma 43:11139 hub profile-cover chips — derived from PHCIS_CURRENT_USER. */
export const PHCIS_CURRENT_USER_HUB_META = [
  { label: 'Group Policy', value: PHCIS_CURRENT_USER.groupPolicy },
  { label: 'สาขาย่อย', value: PHCIS_CURRENT_USER.subBranch },
  { label: 'แผนก', value: PHCIS_CURRENT_USER.department },
];

export default PHCIS_CURRENT_USER;
