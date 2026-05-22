/* Local portrait paths under `public/avatars/`.
   Replaces root-level scratch downloads (`tmp-*.jpg`, `us-photo-*.jpg`)
   and external demo URLs (Unsplash / randomuser) for offline-stable mocks. */

export const PATIENT_AVATAR_POOL = [
  '/avatars/somchai-mock.png',
  '/avatars/patient-mock-01.png',
  '/avatars/patient-mock-02.png',
  '/avatars/patient-mock-03.png',
  '/avatars/patient-mock-04.png',
  '/avatars/patient-mock-05.png',
  '/avatars/patient-mock-06.png',
  '/avatars/patient-mock-07.png',
  '/avatars/patient-mock-08.png',
  '/avatars/patient-mock-09.png',
  '/avatars/patient-mock-10.png',
  '/avatars/mock-male-asian-a.png',
  '/avatars/mock-male-asian-b.png',
  '/avatars/mock-male-asian-c.png',
  '/avatars/patient-female-a.png',
  '/avatars/patient-female-b.png',
  '/avatars/patient-female-c.png',
  '/avatars/patient-female-d.png',
  '/avatars/patient-female-e.png',
  '/avatars/patient-female-f.png',
  '/avatars/patient-male-d.png',
  '/avatars/patient-male-e.png',
];

/** PrimarySearch recent-search avatar pile (was Unsplash `us-photo-*` downloads). */
export const DEFAULT_SEARCH_AVATARS = [
  { src: '/avatars/patient-female-a.png' },
  { src: '/avatars/patient-female-c.png' },
  { src: '/avatars/mock-male-asian-a.png' },
];

/** Staff roster portraits — replaces randomuser.me in usersAccess mock data. */
export const STAFF_AVATARS = [
  '/avatars/patient-female-e.png',
  '/avatars/mock-male-asian-b.png',
  '/avatars/patient-female-d.png',
  '/avatars/patient-female-b.png',
  '/avatars/patient-mock-09.png',
  '/avatars/patient-mock-05.png',
  '/avatars/patient-female-c.png',
  '/avatars/mock-male-asian-c.png',
  '/avatars/patient-mock-02.png',
  '/avatars/mock-male-asian-a.png',
  '/avatars/patient-mock-07.png',
  '/avatars/patient-mock-04.png',
];
