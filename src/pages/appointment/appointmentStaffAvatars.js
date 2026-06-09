/* Hospital staff portrait assets — generated mock profiles under `public/images/staff/`. */

export const STAFF_AVATAR = {
  doctorGeneral: '/images/staff/staff-doctor-male-01.png',
  doctorDental: '/images/staff/staff-doctor-male-02.png',
  nurseOpd: '/images/staff/staff-nurse-female-01.png',
  nurseRecords: '/images/staff/staff-nurse-female-02.png',
  registrarSenior: '/images/staff/staff-registrar-female-02.png',
  registrar: '/images/staff/staff-registrar-female-01.png',
  reception: '/images/staff/staff-reception-female-01.png',
  admin: '/images/staff/staff-admin-male-01.png',
  /** Legacy Figma DoctorG asset — kept for collage variant fallback. */
  doctorLegacy: '/images/staff/doctor-g.png',
};

/** Ordered pool — cycled when `buildStaffRoster` expands beyond seed count. */
export const STAFF_AVATAR_POOL = [
  STAFF_AVATAR.doctorGeneral,
  STAFF_AVATAR.doctorDental,
  STAFF_AVATAR.nurseOpd,
  STAFF_AVATAR.nurseRecords,
  STAFF_AVATAR.registrar,
  STAFF_AVATAR.registrarSenior,
  STAFF_AVATAR.reception,
  STAFF_AVATAR.admin,
];
