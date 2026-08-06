/* Logged-in PHCIS staff — single mock identity shared by Hub profile cover,
   Sidebar user row, HubSidebar / ScheduleSidebar, and ProfilePopover. */

export const PHCIS_CURRENT_USER = {
  displayName: 'พญ.สมหญิง รักษ์ดี',
  displayNameEn: 'Somying Rakdee',
  groupPolicy: 'แพทย์',
  subBranch: 'ทันตแพทย์',
  department: 'ทันตกรรม',
};

/** Figma 43:11139 hub profile-cover chips — derived from PHCIS_CURRENT_USER. */
export const PHCIS_CURRENT_USER_HUB_META = [
  { label: 'Group Policy', value: PHCIS_CURRENT_USER.groupPolicy },
  { label: 'สาขาย่อย', value: PHCIS_CURRENT_USER.subBranch },
  { label: 'แผนก', value: PHCIS_CURRENT_USER.department },
];

export default PHCIS_CURRENT_USER;
