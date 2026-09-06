import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import { HeaderAutoHideProvider } from '@/context/HeaderAutoHideContext';

import DashboardPage from '@/pages/dashboard/DashboardPage';
/* ระบบรายงาน + แพลตฟอร์มวิเคราะห์ข้อมูล (TOR §1.20) — หน้าจอระดับโมดูลของ
   แดชบอร์ด. ทุกหน้าใช้ Sidebar activeKey='dashboard' และเชื่อมกันด้วย
   <DashboardSubNav> (TabUnderline) เหมือน PharmacySubNav. */
import DashboardReportsHubPage from '@/pages/dashboard/DashboardReportsHubPage';
import ServiceReportsPage from '@/pages/dashboard/ServiceReportsPage';
import MyPracticeStatsPage from '@/pages/dashboard/MyPracticeStatsPage';
import PharmacyAnalyticsPage from '@/pages/dashboard/PharmacyAnalyticsPage';
import CheckupAnalyticsPage from '@/pages/dashboard/CheckupAnalyticsPage';
import SpecialClinicDashboardPage from '@/pages/dashboard/SpecialClinicDashboardPage';
import ExecutiveDashboardPage from '@/pages/dashboard/ExecutiveDashboardPage';
import SystemHubPage from '@/pages/hub/SystemHubPage';
import AppointmentPage from '@/pages/appointment/AppointmentPage';
import AppointmentRequestInboxPage from '@/pages/appointment/AppointmentRequestInboxPage';
import AppointmentRecurringPage from '@/pages/appointment/AppointmentRecurringPage';
import AppointmentTypeCatalogPage from '@/pages/appointment/AppointmentTypeCatalogPage';
import AppointmentSettingsPage from '@/pages/appointment/AppointmentSettingsPage';
import SchedulePage from '@/pages/schedule/SchedulePage';
import ScheduleEditorPage from '@/pages/schedule/ScheduleEditorPage';
/* ระบบงานสาธารณสุขและระบบงานควบคุมป้องกันและส่งเสริมสุขภาพในชุมชน (Community)
   — ported from claude/Community's static prototype, one page at a time. */
import CommunityDashboardPage from '@/pages/community-health/CommunityDashboardPage';
import CommunityRegisterPage from '@/pages/community-health/CommunityRegisterPage';
import CommunityAddPage from '@/pages/community-health/CommunityAddPage';
import CommunityDetailPage from '@/pages/community-health/CommunityDetailPage';
import CommunityHouseholdPage from '@/pages/community-health/CommunityHouseholdPage';
import HouseholdAddPage from '@/pages/community-health/HouseholdAddPage';
import HouseholdDetailPage from '@/pages/community-health/HouseholdDetailPage';
import MemberAddPage from '@/pages/community-health/MemberAddPage';
import CommunityChcPage from '@/pages/community-health/CommunityChcPage';
import ChcAddPage from '@/pages/community-health/ChcAddPage';
import ChcDetailPage from '@/pages/community-health/ChcDetailPage';
import CommunityVolunteerPage from '@/pages/community-health/CommunityVolunteerPage';
import VolunteerAddPage from '@/pages/community-health/VolunteerAddPage';
import VolunteerDetailPage from '@/pages/community-health/VolunteerDetailPage';
import CommunityAssessPage from '@/pages/community-health/CommunityAssessPage';
import AssessAddPage from '@/pages/community-health/AssessAddPage';
import CommunityGisPage from '@/pages/community-health/CommunityGisPage';
import CommunityReportPage from '@/pages/community-health/CommunityReportPage';
import ScreeningPage from '@/pages/opd/ScreeningPage';
import QueuePage from '@/pages/opd/QueuePage';
import OpdWalkinRequestPage from '@/pages/opd/OpdWalkinRequestPage';
import OpdRoomConfigPage from '@/pages/opd/OpdRoomConfigPage';
import OpdRg506Page from '@/pages/opd/OpdRg506Page';
import RegistrationQueuePage from '@/pages/registration/RegistrationQueuePage';
import { REGISTRY_SAFE_LOVE, REGISTRY_ADDICTION, REGISTRY_HOME_VISIT } from '@/data/registrationRegistries';
import RegistrationFormPage from '@/pages/registration/RegistrationFormPage';
import RegistrationVisitOpenPage from '@/pages/registration/RegistrationVisitOpenPage';
import RegistrationConsentFillPage from '@/pages/registration/RegistrationConsentFillPage';
import TreatmentQueuePage from '@/pages/treat/TreatmentQueuePage';
import UnassignedWorklistPage from '@/pages/treat/UnassignedWorklistPage';
import ExitNurseQueuePage from '@/pages/exit/ExitNurseQueuePage';
import TreatmentFormPage from '@/pages/treat/TreatmentFormPage';
import ReferralRegisterPage from '@/pages/treat/ReferralRegisterPage';
import TreatmentInterfacesPage from '@/pages/treat/TreatmentInterfacesPage';
import ConsultRegisterPage from '@/pages/treat/ConsultRegisterPage';
import AccessPolicyPage from '@/pages/treat/AccessPolicyPage';
import OrderSetSettingsPage from '@/pages/treat/OrderSetSettingsPage';
import XrayQueuePage from '@/pages/xray/XrayQueuePage';
import XrayOrderPage from '@/pages/xray/XrayOrderPage';
import XrayResultPage from '@/pages/xray/XrayResultPage';
import XraySetupPage from '@/pages/xray/XraySetupPage';
import AncQueuePage from '@/pages/treat/anc/AncQueuePage';
import AncFormPage from '@/pages/treat/anc/AncFormPage';
/* คลินิกเฉพาะทาง (TOR §1.10.1–.6) — แต่ละโมดูลอยู่ใน src/pages/clinic/<slug>
   และเข้าถึงผ่านเมนูย่อยของ "ระบบบันทึกการรักษา" (Sidebar key `treat`). */
import DentalQueuePage from '@/pages/clinic/dental/DentalQueuePage';
import DentalFormPage from '@/pages/clinic/dental/DentalFormPage';
import NcdQueuePage from '@/pages/clinic/ncd/NcdQueuePage';
import NcdFormPage from '@/pages/clinic/ncd/NcdFormPage';
import NcdRegistryPage from '@/pages/clinic/ncd/NcdRegistryPage';
import NcdFollowUpPage from '@/pages/clinic/ncd/NcdFollowUpPage';
import MentalHealthQueuePage from '@/pages/clinic/mental-health/MentalHealthQueuePage';
import MentalHealthFormPage from '@/pages/clinic/mental-health/MentalHealthFormPage';
import MentalHealthRegistryPage from '@/pages/clinic/mental-health/MentalHealthRegistryPage';
import MentalHealthFollowUpPage from '@/pages/clinic/mental-health/MentalHealthFollowUpPage';
import TbQueuePage from '@/pages/clinic/tb/TbQueuePage';
import TbFormPage from '@/pages/clinic/tb/TbFormPage';
import TbRegistryPage from '@/pages/clinic/tb/TbRegistryPage';
import TbFollowUpPage from '@/pages/clinic/tb/TbFollowUpPage';
import TbScreeningPage from '@/pages/clinic/tb/TbScreeningPage';
import AddictionQueuePage from '@/pages/clinic/addiction/AddictionQueuePage';
import AddictionFormPage from '@/pages/clinic/addiction/AddictionFormPage';
import AddictionRegistryPage from '@/pages/clinic/addiction/AddictionRegistryPage';
import AddictionFollowUpPage from '@/pages/clinic/addiction/AddictionFollowUpPage';
import AddictionCommunityPage from '@/pages/clinic/addiction/AddictionCommunityPage';
import HivStiQueuePage from '@/pages/clinic/hiv-sti/HivStiQueuePage';
import HivStiFormPage from '@/pages/clinic/hiv-sti/HivStiFormPage';
import HivStiRegistryPage from '@/pages/clinic/hiv-sti/HivStiRegistryPage';
import HivStiFollowUpPage from '@/pages/clinic/hiv-sti/HivStiFollowUpPage';
/* คลินิกพิเศษชุด 2 (TOR §1.10.8–.11) + เยี่ยมบ้าน (§1.10.12 + §1.18) — Wave 2 */
import FamilyPlanningQueuePage from '@/pages/clinic/family-planning/FamilyPlanningQueuePage';
import FamilyPlanningFormPage from '@/pages/clinic/family-planning/FamilyPlanningFormPage';
import FamilyPlanningRegistryPage from '@/pages/clinic/family-planning/FamilyPlanningRegistryPage';
import ImmunizationQueuePage from '@/pages/clinic/immunization/ImmunizationQueuePage';
import ImmunizationFormPage from '@/pages/clinic/immunization/ImmunizationFormPage';
import ImmunizationRegistryPage from '@/pages/clinic/immunization/ImmunizationRegistryPage';
import ImmunizationFollowUpPage from '@/pages/clinic/immunization/ImmunizationFollowUpPage';
import ImmunizationVaccineBookPage from '@/pages/clinic/immunization/ImmunizationVaccineBookPage';
import VaccineCatalogPage from '@/pages/clinic/immunization/VaccineCatalogPage';
import RehabQueuePage from '@/pages/clinic/rehab/RehabQueuePage';
import RehabFormPage from '@/pages/clinic/rehab/RehabFormPage';
import RehabRegistryPage from '@/pages/clinic/rehab/RehabRegistryPage';
import RehabFollowUpPage from '@/pages/clinic/rehab/RehabFollowUpPage';
import SocialWorkHomePage from '@/pages/clinic/social-work/SocialWorkHomePage';
import SocialWorkQueuePage from '@/pages/clinic/social-work/SocialWorkQueuePage';
import SocialWorkFormPage from '@/pages/clinic/social-work/SocialWorkFormPage';
import SocialWorkRegistryPage from '@/pages/clinic/social-work/SocialWorkRegistryPage';
import SocialWorkRequesterRegistryPage from '@/pages/clinic/social-work/SocialWorkRequesterRegistryPage';
import SocialWorkSupplyPage from '@/pages/clinic/social-work/SocialWorkSupplyPage';
import SocialWorkFollowUpPage from '@/pages/clinic/social-work/SocialWorkFollowUpPage';
import SocialWorkReferralPage from '@/pages/clinic/social-work/SocialWorkReferralPage';
import SocialWorkActivityPage from '@/pages/clinic/social-work/SocialWorkActivityPage';
import SocialWorkReportsPage from '@/pages/clinic/social-work/SocialWorkReportsPage';
import SocialWorkNutritionPage from '@/pages/clinic/social-work/SocialWorkNutritionPage';
import HomeVisitQueuePage from '@/pages/homevisit/HomeVisitQueuePage';
import HomeVisitRecordPage from '@/pages/homevisit/HomeVisitRecordPage';
import HomeVisitRegistryPage from '@/pages/homevisit/HomeVisitRegistryPage';
import HomeVisitFollowUpPage from '@/pages/homevisit/HomeVisitFollowUpPage';
/* งานอนามัยโรงเรียน (TOR §3 — ระบบสุขภาพนักเรียน) — ระบบ top-level ระดับเดียว
   กับ PHCIS บน System Hub (SYSTEM_CATALOG key 'school-health') แต่หน้าจออยู่ใต้
   /clinic/school-health และใช้ Sidebar ของ PHCIS (activeKey='school-health'). */
import SchoolHealthQueuePage from '@/pages/clinic/school-health/SchoolHealthQueuePage';
import SchoolRegistryPage from '@/pages/clinic/school-health/SchoolRegistryPage';
import StudentRegistryPage from '@/pages/clinic/school-health/StudentRegistryPage';
import StudentHealthProfilePage from '@/pages/clinic/school-health/StudentHealthProfilePage';
import SchoolHealthBatchVaccinePage from '@/pages/clinic/school-health/SchoolHealthBatchVaccinePage';
import SchoolHealthDashboardPage from '@/pages/clinic/school-health/SchoolHealthDashboardPage';
import SchoolHealthReportsPage from '@/pages/clinic/school-health/SchoolHealthReportsPage';

/* สถานรับเลี้ยงเด็กกลางวัน (TOR §3.5) — โมดูลพี่น้องของงานอนามัยโรงเรียน
   ตามมติ คทง.5: กลุ่มเป้าหมายคือเด็กปฐมวัย 0–5 ปี เกณฑ์/กิจกรรมคนละชุดกับ
   นักเรียนในโรงเรียน จึงแยกโมดูลแต่ใช้ layout primitive ร่วมกัน */
import DaycareQueuePage from '@/pages/clinic/daycare/DaycareQueuePage';
import DaycareChildRegistryPage from '@/pages/clinic/daycare/DaycareChildRegistryPage';
import DaycareChildPage from '@/pages/clinic/daycare/DaycareChildPage';
import DaycareLessonsPage from '@/pages/clinic/daycare/DaycareLessonsPage';
import DaycareMonitoringPage from '@/pages/clinic/daycare/DaycareMonitoringPage';
import PharmacyQueuePage from '@/pages/pharmacy/PharmacyQueuePage';
import PharmacyDispensePage from '@/pages/pharmacy/PharmacyDispensePage';
import PharmacyRegistryPage from '@/pages/pharmacy/PharmacyRegistryPage';
import PharmacyRegistryEditPage from '@/pages/pharmacy/PharmacyRegistryEditPage';
import PharmacyStockPage from '@/pages/pharmacy/PharmacyStockPage';
import PharmacyRequisitionPage from '@/pages/pharmacy/PharmacyRequisitionPage';
import PharmacyPatientsPage from '@/pages/pharmacy/PharmacyPatientsPage';
import PharmacyReportsPage from '@/pages/pharmacy/PharmacyReportsPage';
import LabQueuePage from '@/pages/lab/LabQueuePage';
import LabOrderPage from '@/pages/lab/LabOrderPage';
import LabSetupPage from '@/pages/lab/LabSetupPage';
import LabResultEntryPage from '@/pages/lab/LabResultEntryPage';
import LabReportPage from '@/pages/lab/LabReportPage';
import LabReceivePage from '@/pages/lab/LabReceivePage';
import LabSendOutPage from '@/pages/lab/LabSendOutPage';
import LabPatientHistoryPage from '@/pages/lab/LabPatientHistoryPage';
import ObservationQueuePage from '@/pages/observation/ObservationQueuePage';
import ObservationDetailPage from '@/pages/observation/ObservationDetailPage';
import ObservationHistoryPage from '@/pages/observation/ObservationHistoryPage';
import CheckupQueuePage from '@/pages/checkup/CheckupQueuePage';
import CheckupOrderPage from '@/pages/checkup/CheckupOrderPage';
import CheckupRecordPage from '@/pages/checkup/CheckupRecordPage';
import CheckupScreeningPage from '@/pages/checkup/CheckupScreeningPage';
import CheckupIndividualReportPage from '@/pages/checkup/CheckupIndividualReportPage';
import CheckupHistoryPage from '@/pages/checkup/CheckupHistoryPage';
import CheckupTargetGroupPage from '@/pages/checkup/CheckupTargetGroupPage';
import CheckupPackagePage from '@/pages/checkup/CheckupPackagePage';
import CheckupReportsPage from '@/pages/checkup/CheckupReportsPage';
import CheckupCommunityPage from '@/pages/checkup/CheckupCommunityPage';
import RightsClaimPage from '@/pages/rights/RightsClaimPage';
import ClaimSubmitDetailPage from '@/pages/rights/ClaimSubmitDetailPage';
import FormsLibraryPage from '@/pages/forms/FormsLibraryPage';
import EdocumentDashboardPage from '@/pages/forms/EdocumentDashboardPage';
import FormsCategoryPage from '@/pages/forms/FormsCategoryPage';
import FormDetailPage from '@/pages/forms/FormDetailPage';
import FormFillPage from '@/pages/forms/FormFillPage';
import UsersAccessPage from '@/pages/users/UsersAccessPage';
import UserEditPage from '@/pages/users/UserEditPage';
import DirectoryServicePage from '@/pages/users/DirectoryServicePage';
import DrugOrderRoutingPage from '@/pages/users/DrugOrderRoutingPage';
import UserUsageReportPage from '@/pages/users/UserUsageReportPage';
import NotificationCenterPage from '@/pages/users/NotificationCenterPage';
import UserSchedulePage from '@/pages/users/UserSchedulePage';
import TabsPreviewPage from '@/pages/preview/TabsPreviewPage';
import CardsPreviewPage from '@/pages/preview/CardsPreviewPage';
import BodyRecordPreviewPage from '@/pages/preview/BodyRecordPreviewPage';
import XraySheetsPreviewPage from '@/pages/preview/XraySheetsPreviewPage';
import ComponentsLibraryPage from '@/pages/components/ComponentsLibraryPage';
import LoginPage from '@/pages/auth/LoginPage';
import LoginVerifyPage from '@/pages/auth/LoginVerifyPage';
import LoginSetPasswordPage from '@/pages/auth/LoginSetPasswordPage';
import LoginSuccessPage from '@/pages/auth/LoginSuccessPage';
import ConsentManagementPage from '@/pages/consent/ConsentManagementPage';
import CreateConsentFormPage from '@/pages/consent/CreateConsentFormPage';
import RequestFormAccessPage from '@/pages/consent/RequestFormAccessPage';
import AccessManagementPage from '@/pages/consent/AccessManagementPage';
import ConsentReportPage from '@/pages/consent/ConsentReportPage';
import ConsentFormsPage from '@/pages/consent/ConsentFormsPage';
import ConsentFormViewPage from '@/pages/consent/ConsentFormViewPage';
import ConsentDashboardPage from '@/pages/consent/ConsentDashboardPage';
import ConsentHistoryPage from '@/pages/consent/ConsentHistoryPage';
import SystemStaffPage from '@/pages/system/SystemStaffPage';
import SystemStaffDetailPage from '@/pages/system/SystemStaffDetailPage';
import SystemStaffAddPage from '@/pages/system/SystemStaffAddPage';
import SystemRolesPage from '@/pages/system/SystemRolesPage';
import SystemRoleCreatePage from '@/pages/system/SystemRoleCreatePage';
import SystemOverviewPage from '@/pages/system/SystemOverviewPage';
import SystemCentersPage from '@/pages/system/SystemCentersPage';
import SystemHolidaysPage from '@/pages/system/SystemHolidaysPage';
import HomeVisitSettingsPage from '@/pages/system/HomeVisitSettingsPage';
import SystemDashboardTemplatesPage from '@/pages/system/SystemDashboardTemplatesPage';
import AddCenterPage from '@/pages/system/AddCenterPage';
import CenterStructurePage from '@/pages/system/CenterStructurePage';
import CenterStructureCreatePage from '@/pages/system/CenterStructureCreatePage';
import SystemConfidentialDataPage from '@/pages/system/SystemConfidentialDataPage';
import SystemOrderSetsPage from '@/pages/system/SystemOrderSetsPage';
import AuditOverviewPage from '@/pages/audit/AuditOverviewPage';
import AuditLogPage from '@/pages/audit/AuditLogPage';
import AuditRecordHistoryPage from '@/pages/audit/AuditRecordHistoryPage';
import AuditPiiAccessLogPage from '@/pages/audit/AuditPiiAccessLogPage';
/* แบบสัมภาษณ์ลูกค้า (BA/SA Questionnaire) — เครื่องมือภายในของทีม BA/SA
   สำหรับบันทึกคำตอบจากสำนักอนามัยระหว่างสัมภาษณ์ ตามไฟล์ต้นทาง
   HCIS_BA_SA_Questionnaire_v1.0.xlsx (ดู src/data/questionnaire.js). */
import QuestionnaireOverviewPage from '@/pages/questionnaire/QuestionnaireOverviewPage';
import QuestionnaireModulePage from '@/pages/questionnaire/QuestionnaireModulePage';
import CreateDocTemplatePage from '@/pages/doc-template/CreateDocTemplatePage';
import ActivityPage from '@/pages/assess/ActivityPage';
import DepartmentPage from '@/pages/assess/DepartmentPage';
import PositionPage from '@/pages/assess/PositionPage';
import AccessControlPage from '@/pages/assess/AccessControlPage';
import AccessControlCreatePage from '@/pages/assess/AccessControlCreatePage';
import AccessControlDetailPage from '@/pages/assess/AccessControlDetailPage';
import SystemConsentAccessRightsPage from '@/pages/assess/SystemConsentAccessRightsPage';
import AssessUserPage from '@/pages/assess/AssessUserPage';
import AssessUserCreatePage from '@/pages/assess/AssessUserCreatePage';
import AssessUserDetailPage from '@/pages/assess/AssessUserDetailPage';
import QueueIssuePage from '@/pages/queue-center/QueueIssuePage';
import QueueIntegrationPage from '@/pages/queue-center/QueueIntegrationPage';
import QueueSettingsPage from '@/pages/queue-center/QueueSettingsPage';
import QueueKioskSettingsPage from '@/pages/queue-center/QueueKioskSettingsPage';
import HallDisplayPage from '@/pages/queue-display/HallDisplayPage';
import StationDisplayPage from '@/pages/queue-display/StationDisplayPage';
import FinanceDisplayPage from '@/pages/queue-display/FinanceDisplayPage';
import QueueAnnouncerConsolePage from '@/pages/queue-display/QueueAnnouncerConsolePage';
import QueueStatusOnlinePage from '@/pages/queue-display/QueueStatusOnlinePage';
import { KioskExternalRedirect, KioskTicketRedirect } from '@/pages/kiosk/KioskRedirects';
import FinancePaymentPage from '@/pages/finance/FinancePaymentPage';
import { TelemedCallProvider, TelemedRouteTrigger } from '@/components/telemed/TelemedCallProvider';
import TelemedWorklistPage from '@/pages/telemed/TelemedWorklistPage';
import TelemedRpmBoardPage from '@/pages/telemed/TelemedRpmBoardPage';
import TelemedConsentPage from '@/pages/telemed/TelemedConsentPage';
import TelemedReportPage from '@/pages/telemed/TelemedReportPage';
import TelemedAssessmentPage from '@/pages/telemed/TelemedAssessmentPage';
import Spotlight from '@/components/util/Spotlight';
import { MobileAppProvider } from '@/components/mobile/MobileShell';
import MobileLoginPage from '@/pages/mobile/MobileLoginPage';
import MobileRegisterPage from '@/pages/mobile/MobileRegisterPage';
import MobileResetPage from '@/pages/mobile/MobileResetPage';
import MobileHomePage from '@/pages/mobile/MobileHomePage';
import MobileNotificationsPage from '@/pages/mobile/MobileNotificationsPage';
import MobileAppointmentsPage from '@/pages/mobile/MobileAppointmentsPage';
import MobileAppointmentDetailPage from '@/pages/mobile/MobileAppointmentDetailPage';
import MobileBookPage from '@/pages/mobile/MobileBookPage';
import MobileTelemedPage from '@/pages/mobile/MobileTelemedPage';
import MobileRecordsPage from '@/pages/mobile/MobileRecordsPage';
import MobileVisitPage from '@/pages/mobile/MobileVisitPage';
import MobileProfilePage from '@/pages/mobile/MobileProfilePage';
import MobileConsentPage from '@/pages/mobile/MobileConsentPage';
import MobileProfileQrPage from '@/pages/mobile/MobileProfileQrPage';
import MobileVitalsPage from '@/pages/mobile/MobileVitalsPage';
import { MobileClinicsPage, MobileClinicDetailPage } from '@/pages/mobile/MobileClinicsPage';
import MobileRequestsPage from '@/pages/mobile/MobileRequestsPage';
import { MobileNewsPage, MobileNewsDetailPage } from '@/pages/mobile/MobileNewsPage';
import MobileMorePage from '@/pages/mobile/MobileMorePage';
import MobileSettingsPage from '@/pages/mobile/MobileSettingsPage';
import { MobilePaymentPage, MobilePaymentDetailPage } from '@/pages/mobile/MobilePaymentPage';
import MobilePharmacyPreparingPage from '@/pages/mobile/MobilePharmacyPreparingPage';
import MobilePharmacyPaymentPage from '@/pages/mobile/MobilePharmacyPaymentPage';
import MobilePharmacySuccessPage from '@/pages/mobile/MobilePharmacySuccessPage';
import MobileComponentsPage from '@/pages/mobile/MobileComponentsPage';
import MobileSplashPage from '@/pages/mobile/MobileSplashPage';

/* boundary ระดับหน้า — key ด้วย pathname เพื่อให้หน้าที่พังไม่ลากทั้งระบบ
   ไปด้วย: พอผู้ใช้กดเมนูอื่น pathname เปลี่ยน boundary ล้าง error แล้ว
   render หน้าใหม่ตามปกติ (boundary ตัวนอกใน App.jsx ยังทำหน้าที่กันพังของ
   provider/chrome เหมือนเดิม) */
function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

export default function Routes() {
  return (
    <Router>
      <HeaderAutoHideProvider>
      {/* Global deep-link highlighter for TOR Compliance Checklist URLs.
          Reads `?spotlight=<key>&label=<TOR-id>` from every page. */}
      <Spotlight />
      {/* Telemedicine call lives ABOVE the Switch so the video call + its live
          media streams survive route changes — the doctor can minimise the
          call and keep recording in ระบบบันทึกการรักษา (TOR 1.13). */}
      <TelemedCallProvider>
      <RouteErrorBoundary>
      <Switch>
        {/* Root = System Selection Hub (PHCIS-ALL · Figma node 2149:104090).
            Shown BEFORE entering any specific subsystem. Each card routes
            into its respective system (PHCIS dashboard, mobile, kiosk, …). */}
        {/* Landing always shows the sign-in screen; the System Hub lives at
            /hub and is reached after a successful login. */}
        <Redirect exact from='/' to='/login' />
        <Route exact path='/hub'             component={SystemHubPage} />
        {/* PHCIS Sign-in (Figma "PHCIS-Signin" 1:1249). Standalone full-screen
            auth surface — NO sidebar/header chrome. /login/verify is the OTP
            step (SMS / Email channel + 6-digit code). */}
        <Route exact path='/login'           component={LoginPage} />
        <Route exact path='/signin'          component={LoginPage} />
        <Route exact path='/login/verify'    component={LoginVerifyPage} />
        <Route exact path='/login/set-password' component={LoginSetPasswordPage} />
        <Route exact path='/login/success'   component={LoginSuccessPage} />
        {/* ระบบจัดการความยินยอม (Consent Management · Figma "PHCIS | Consent" 1:4) */}
        <Route exact path='/consent'              component={ConsentManagementPage} />
        {/* แดชบอร์ดความยินยอม (ด.1.1.12) */}
        <Route exact path='/consent/dashboard' component={ConsentDashboardPage} />
        {/* ตัวสร้างเทมเพลตย้ายไปเป็นป๊อปอัปบนแดชบอร์ดแล้ว — ลิงก์เดิม/แท็บที่ค้าง
            bundle เก่าไว้ต้องไม่เจอจอขาว (25 ส.ค. 69) */}
        <Redirect exact from='/consent/dashboard/templates' to='/consent/dashboard' />
        {/* สร้างแบบฟอร์มใหม่ — 4-step wizard, stays INSIDE the consent system
            (own consent side menu) instead of bouncing to /forms (PHCIS). */}
        {/* แบบฟอร์มความยินยอม — consent-form template registry (Figma 291:113045). */}
        <Route exact path='/consent/forms'        component={ConsentFormsPage} />
        <Route exact path='/consent/forms/new'    component={CreateConsentFormPage} />
        <Route exact path='/consent/forms/request-access' component={RequestFormAccessPage} />
        {/* ดูแบบฟอร์ม — read-only Step-3 preview of an existing form (Figma 336:170901). */}
        <Route exact path='/consent/forms/:id/view' component={ConsentFormViewPage} />
        {/* ประวัติความยินยอม — ค้นหาชื่อ/HN แล้วเปิด Timeline (แท็บใหม่จาก worklist) */}
        <Route exact path='/consent/history' component={ConsentHistoryPage} />
        <Route exact path='/consent/history/:hn' component={ConsentHistoryPage} />
        {/* ด.1.1.18 — ย้ายไปจัดการระบบ · redirect จาก URL เดิม */}
        <Redirect exact from='/consent/access/rights' to='/assess/consent-access-rights' />
        {/* จัดการสิทธิ์การเข้าถึง — access-request registry (Figma 363:122327). */}
        <Route exact path='/consent/access'       component={AccessManagementPage} />
        <Route exact path='/consent/access/my-requests' render={() => <AccessManagementPage mineOnly />} />
        {/* สถิติและรายงาน — consent reports dashboard (Figma 358:113804). */}
        <Route exact path='/consent/report'       component={ConsentReportPage} />
        {/* ระบบจัดการระบบ (System/Org administration · Figma 0EDfjwf1 24:2612) —
            central admin: org structure · staff · roles. Reached from the Hub.
            (The activity history moved to its own system · /audit.) */}
        <Route exact path='/admin'           component={SystemOverviewPage} />
        {/* ศูนย์บริการ — health-center registry + 5-step add wizard (Figma 4D3nTx53 · 1:3273). */}
        <Route exact path='/admin/centers'      component={SystemCentersPage} />
        <Route exact path='/admin/holidays'     component={SystemHolidaysPage} />
        <Route exact path='/admin/homevisit-settings' component={HomeVisitSettingsPage} />
        <Route exact path='/admin/dashboard-templates' component={SystemDashboardTemplatesPage} />
        <Route exact path='/admin/centers/new'  component={AddCenterPage} />
        {/* รูปแบบโครงสร้างศูนย์ — ทะเบียนแม่แบบ แผนก/คลินิก + ห้องตรวจ/เตียง
            ที่นำไปเลือกใช้ตอนเพิ่มศูนย์บริการ (step "แผนกและคลินิก") */}
        <Route exact path='/admin/structures/new'      component={CenterStructureCreatePage} />
        <Route exact path='/admin/structures/:id/edit' component={CenterStructureCreatePage} />
        <Route exact path='/admin/structures'          component={CenterStructurePage} />
        <Route exact path='/admin/staff'        component={SystemStaffPage} />
        <Route exact path='/admin/staff/new'    component={SystemStaffAddPage} />
        <Route exact path='/admin/staff/:id'    component={SystemStaffDetailPage} />
        <Route exact path='/admin/roles'        component={SystemRolesPage} />
        <Route exact path='/admin/roles/new'    component={SystemRoleCreatePage} />
        <Route exact path='/admin/confidential-data'     component={SystemConfidentialDataPage} />
        <Route exact path='/admin/confidential-data/:hn' component={SystemConfidentialDataPage} />
        {/* ชุดคำสั่งการรักษากลาง — ผู้ดูแลระบบกำหนดรายการและกลุ่มผู้มีสิทธิ์ใช้งาน */}
        <Route exact path='/admin/order-sets'             component={SystemOrderSetsPage} />
        {/* Pharmacy master data is maintained from central settings. */}
        {/* ทะเบียนรายการตรวจ (Lab) — master data ของห้องปฏิบัติการ ย้ายมาอยู่ใต้
            จัดการระบบ 28 ส.ค. 69 แบบเดียวกับทะเบียนยา. หน้าเดิมคือ LabSetupPage
            ตัวเดิม เปลี่ยนแค่ breadcrumb/เมนูข้าง — ลิงก์เก่า /lab/setup redirect
            มาที่นี่ (ดูกลุ่ม <Redirect> ท้ายไฟล์). */}
        <Route exact path='/admin/lab/registry'          component={LabSetupPage} />
        <Route exact path='/admin/pharmacy/registry'     component={PharmacyRegistryPage} />
        <Route exact path='/admin/pharmacy/registry/new' component={PharmacyRegistryEditPage} />
        <Route exact path='/admin/pharmacy/registry/:id' component={PharmacyRegistryEditPage} />
        {/* ระบบประวัติการใช้งาน (Audit / Activity log · Figma 0EDfjwf1 12:1624) —
            usage overview + history log. Top-level system, reached from the Hub. */}
        <Route exact path='/audit'           component={AuditOverviewPage} />
        <Route exact path='/audit/log'       component={AuditLogPage} />
        <Route exact path='/audit/record-history'       component={AuditRecordHistoryPage} />
        <Route exact path='/audit/record-history/:hn'   component={AuditRecordHistoryPage} />
        <Route exact path='/audit/pii-access' component={AuditPiiAccessLogPage} />
        {/* แบบสัมภาษณ์ลูกค้า — ภาพรวม + หน้าตอบคำถามรายโมดูล (8 โมดูล / 386 ข้อ).
            คำตอบเก็บใน localStorage แล้วส่งออก CSV กลับเข้าไฟล์ Excel ต้นทาง. */}
        <Route exact path='/questionnaire'             component={QuestionnaireOverviewPage} />
        <Route exact path='/questionnaire/:moduleKey'  component={QuestionnaireModulePage} />
        {/* PHCIS | Assess-control — กิจกรรม (Activity-based Access Control)
            แทน Group Policy เดิม · โครงหน้า Figma 4D3nTx53 · 3:18430. */}
        <Route exact path='/assess/activities' component={ActivityPage} />
        <Redirect exact from='/assess/group-policy' to='/assess/activities' />
        <Route exact path='/assess/departments'   component={DepartmentPage} />
        <Route exact path='/assess/positions'     component={PositionPage} />
        <Route exact path='/assess/access-control/new' component={AccessControlCreatePage} />
        <Route exact path='/assess/access-control/:id/edit' component={AccessControlCreatePage} />
        <Route exact path='/assess/access-control/:id' component={AccessControlDetailPage} />
        <Route exact path='/assess/access-control' component={AccessControlPage} />
        {/* ด.1.1.18 — สิทธิเข้าถึงข้อมูลผู้ป่วยตามระดับความยินยอม (จัดการระบบ) */}
        <Route exact path='/assess/consent-access-rights' component={SystemConsentAccessRightsPage} />
        <Route exact path='/assess/users/new' component={AssessUserCreatePage} />
        <Route exact path='/assess/users/:id/edit' component={AssessUserCreatePage} />
        <Route exact path='/assess/users/:id' component={AssessUserDetailPage} />
        <Route exact path='/assess/users' component={AssessUserPage} />
        {/* ระบบจัดการตารางนัดหมาย (TOR §1.6) — หน้าหลักคือปฏิทิน/ตารางนัด, อีก 4
            หน้าเป็นหน้าจอระดับโมดูลที่เข้าจากเมนูย่อย "ระบบนัดหมาย" ของ Sidebar
            (activeKey='appoint' ทุกหน้า):
              /appointment/requests  = กล่องรับนัดหมาย — คำขอนัดจาก mobile/LINE/
                                       โทรศัพท์/เคาน์เตอร์ + ยืนยัน/ปฏิเสธ/เสนอเวลาใหม่
                                       พร้อมตรวจการชนทรัพยากร (§1.6.1.5 / §1.6.2.3 / §1.6.2.6)
              /appointment/recurring = นัดต่อเนื่อง/นัดกลุ่ม + พิมพ์ใบนัดทั้งชุด (§1.6.3.1)
              /appointment/types     = ทะเบียนรูปแบบการนัดหมายที่ผู้ใช้กำหนดเอง (§1.6.2.5)
              /appointment/settings  = ตั้งค่าระบบนัดหมาย — mount AppointmentSettingsPanel
                                       (รูปแบบตาราง Resource · วันหยุด · โควตาคิวรายวัน ·
                                       ประวัติการยกเลิก · บันทึกการแจ้งเตือน)
                                       §1.6.1.3 / §1.6.1.6 / §1.6.2.1 / §1.6.2.7 / §1.6.4.1–.2
            หมายเหตุ: ก่อน wave นี้ AppointmentSettingsPanel.jsx เป็นไฟล์กำพร้า
            (ไม่มีไฟล์ไหน import) — เจ็ดข้อ TOR ข้างบนจึงไม่มีทางเข้าใน UI จริง.
            ห้ามลบ route /appointment/settings โดยไม่ย้าย panel ไปที่อื่นก่อน. */}
        <Route exact path='/appointment/requests'  component={AppointmentRequestInboxPage} />
        <Route exact path='/appointment/recurring' component={AppointmentRecurringPage} />
        <Route exact path='/appointment/types'     component={AppointmentTypeCatalogPage} />
        <Route exact path='/appointment/settings'  component={AppointmentSettingsPage} />
        <Route exact path='/appointment'     component={AppointmentPage} />
        {/* ระบบจัดการตารางเวร (Schedule Management) — TOP-LEVEL system, sibling of PHCIS.
            Figma PHCIS-ALL · entered from hub card 2149:104214. No PhcisChrome — owns its shell. */}
        <Route exact path='/schedule'        component={SchedulePage} />
        <Route exact path='/schedule/:id'    component={ScheduleEditorPage} />
        {/* ระบบงานสาธารณสุขและระบบงานควบคุมป้องกันและส่งเสริมสุขภาพในชุมชน
            (Community) — TOP-LEVEL system, sibling of PHCIS (SYSTEM_CATALOG key
            'community-health'). Ported from claude/Community's static prototype
            one page at a time (see src/pages/community-health/communityShared.jsx
            for the stub pattern used while a page is still being converted). */}
        <Route exact path='/community-health/dashboard'          component={CommunityDashboardPage} />
        <Route exact path='/community-health/register'           component={CommunityRegisterPage} />
        <Route exact path='/community-health/register/new'       component={CommunityAddPage} />
        <Route exact path='/community-health/register/:id'       component={CommunityDetailPage} />
        <Route exact path='/community-health/household'          component={CommunityHouseholdPage} />
        <Route exact path='/community-health/household/new'      component={HouseholdAddPage} />
        <Route exact path='/community-health/household/:id'      component={HouseholdDetailPage} />
        <Route exact path='/community-health/household/:id/member/new' component={MemberAddPage} />
        <Route exact path='/community-health/chc'                component={CommunityChcPage} />
        <Route exact path='/community-health/chc/new'            component={ChcAddPage} />
        <Route exact path='/community-health/chc/:id'            component={ChcDetailPage} />
        <Route exact path='/community-health/volunteer'          component={CommunityVolunteerPage} />
        <Route exact path='/community-health/volunteer/new'      component={VolunteerAddPage} />
        <Route exact path='/community-health/volunteer/:id'      component={VolunteerDetailPage} />
        <Route exact path='/community-health/assess'             component={CommunityAssessPage} />
        <Route exact path='/community-health/assess/new'         component={AssessAddPage} />
        <Route exact path='/community-health/gis'                component={CommunityGisPage} />
        <Route exact path='/community-health/report'             component={CommunityReportPage} />
        <Redirect exact from='/community-health' to='/community-health/dashboard' />
        {/* ระบบรายงานและแพลตฟอร์มวิเคราะห์ข้อมูล (TOR §1.20) —
              /dashboard                   = ภาพรวมโรงพยาบาล (เดิม)
              /dashboard/reports           = ศูนย์รวมรายงาน + ทะเบียนแม่แบบ/คำขอรายงานใหม่ (§1.20.11)
              /dashboard/reports/service   = รายงานผู้รับบริการ (§1.20.4 / §1.20.5)
              /dashboard/reports/pharmacy  = รายงานเภสัชกรรมข้ามศูนย์ (§1.20.2 / §1.20.6) —
                                             คนละหน้ากับ /pharmacy/reports ซึ่งเป็นรายงาน
                                             เชิงปฏิบัติการรายวันของศูนย์เดียว
              /dashboard/reports/checkup   = รายงานตรวจสุขภาพ + แม่แบบพิมพ์/ส่งออก (§1.20.8)
              /dashboard/clinics           = Dashboard คลินิกพิเศษ 11 แท็บ (§1.20.7)
              /dashboard/executive         = Dashboard ผู้บริหาร + แจ้งเตือนอัตโนมัติ (§1.20.10)
              /dashboard/my-stats          = สถิติการตรวจรักษาของผู้ใช้ที่ล็อกอิน (§1.20.11 +
                                             มติ คทง.3 ครั้งที่ 7 — Dashboard ที่ผู้ใช้งานทุกระดับ
                                             เข้าถึงได้เพื่อนำไปปรับปรุงงานคุณภาพ)
            route ย่อยทั้งหมดต้องอยู่**เหนือ** /dashboard เพื่อความชัดเจน (ทุกตัว exact
            อยู่แล้วจึงไม่ชนกัน แต่คงลำดับ specific → less-specific ตามแบบ /lab, /checkup). */}
        <Route exact path='/dashboard/reports/service'  component={ServiceReportsPage} />
        <Route exact path='/dashboard/reports/pharmacy' component={PharmacyAnalyticsPage} />
        <Route exact path='/dashboard/reports/checkup'  component={CheckupAnalyticsPage} />
        <Route exact path='/dashboard/reports'          component={DashboardReportsHubPage} />
        <Route exact path='/dashboard/clinics'          component={SpecialClinicDashboardPage} />
        <Route exact path='/dashboard/executive'        component={ExecutiveDashboardPage} />
        <Route exact path='/dashboard/my-stats'         component={MyPracticeStatsPage} />
        <Route exact path='/dashboard'       component={DashboardPage} />
        <Route exact path='/finance'          component={FinancePaymentPage} />
        <Route exact path='/opd'             component={QueuePage} />
        <Route exact path='/opd/queue'       component={QueuePage} />
        <Route exact path='/opd/screening'   component={ScreeningPage} />
        {/* ระบบบริหารจัดการก่อนตรวจ + การตั้งค่า (TOR §1.2.1 / §1.2.3.6 / §1.2.7)
            /opd/requests    = รายการ Request Walk-in แยกตามแผนก + ให้ Slot แพทย์
                               + ออกคิวตรวจตาม Slot (1.2.1.4–1.2.1.6)
            /opd/room-config = ตั้งค่าห้องตรวจ/แพทย์ประจำห้อง + โควตารายวัน (1.2.7.1–1.2.7.2)
                               — เมนูอยู่ใน ระบบจัดการระบบ (systemNav); URL เดิม
                               /opd/room-config ยังใช้ได้
            /opd/rg506       = แบบรายงานเฝ้าระวังโรค รง.506 → EPI-NET (1.2.3.6) */}
        <Route exact path='/opd/requests'    component={OpdWalkinRequestPage} />
        <Route exact path='/opd/room-config' component={OpdRoomConfigPage} />
        <Route exact path='/opd/rg506'       component={OpdRg506Page} />
        {/* ระบบบริหารจัดการคิว (TOR §1.3) — ระบบคิวกลางของศูนย์บริการ.
            แหล่งข้อมูลเดียวคือ `src/data/queueCenterStore.js` (คิวของ
            /opd/queue · /registration/queue · /pharmacy/queue · /finance
            ยังเป็น mock ของหน้านั้น ๆ เอง — ตัวเลขจึงไม่ตรงกัน 100%)
              /queue-center             = คอนโซลจัดการ+เรียกคิว (1.3.1 / 1.3.3 / 1.3.5)
              /queue-center/issue       = ออกคิว + บัตรคิว + ประวัติออกคิววันนี้ (1.3.2)
              /queue-center/integration = เชื่อมข้อมูลนัดหมาย / สถานะเตรียมยา (1.3.6)
              /queue-center/settings    = จุดบริการ · ประเภทคิว · SLA · ข้อความบัตร (1.3.7)
            จอแสดงผล (1.3.4) — 4 หน้าแรกเป็น full-screen surface ไม่มี sidebar/header
            เหมือน /kiosk, ส่วน /console เป็นหน้าเจ้าหน้าที่ที่ใช้ PhcisChrome ปกติ:
              /queue-center/display          = ตัวเลือกจอ + เปิด/ทดสอบเสียง + QR หน้าติดตามคิว
              /queue-center/display/hall     = TV1 จอโถงรวม 3 คอลัมน์
              /queue-center/display/station  = TV2 จอประจำจุดบริการ (?room=st-opd|OPD|ชื่อไทย)
              /queue-center/display/finance  = TV3 จอการเงิน + ห้องยา
              /queue-center/display/console  = คอนโซลผู้ประกาศ (เรียกซ้ำ / มาแล้ว / ไม่มา / undo)
              /queue-center/display/online   = หน้าติดตามคิวบนมือถือของผู้รับบริการ (?q=A-042) */}
        <Redirect exact from='/queue-center' to='/queue-center/kiosk-settings' />
        <Route exact path='/queue-center/issue'            component={QueueIssuePage} />
        <Route exact path='/queue-center/integration'      component={QueueIntegrationPage} />
        <Route exact path='/queue-center/settings'         component={QueueSettingsPage} />
        <Route exact path='/queue-center/kiosk-settings'   component={QueueKioskSettingsPage} />
        <Route exact path='/queue-center/ticket-settings'  component={QueueKioskSettingsPage} />
        <Route exact path='/queue-center/displays'         component={QueueKioskSettingsPage} />
        <Route exact path='/queue-center/display'          component={QueueKioskSettingsPage} />
        <Route exact path='/queue-center/display/hall'     component={HallDisplayPage} />
        <Route exact path='/queue-center/display/station'  component={StationDisplayPage} />
        <Route exact path='/queue-center/display/finance'  component={FinanceDisplayPage} />
        <Route exact path='/queue-center/display/console'  component={QueueAnnouncerConsolePage} />
        <Route exact path='/queue-center/display/online'   component={QueueStatusOnlinePage} />
        <Route exact path='/registration'          component={RegistrationQueuePage} />
        <Route exact path='/registration/queue'    component={RegistrationQueuePage} />
        {/* ทะเบียนแยกของคลินิกลับ — หน้าเดียวกับทะเบียนศูนย์ ต่างที่ registryKey
            (หัวข้อ · roster · แถบเตือนทะเบียนลับ) ดู registrationRegistries.js */}
        <Route
          exact
          path='/registration/safe-love'
          render={() => <RegistrationQueuePage registryKey={REGISTRY_SAFE_LOVE} />}
        />
        <Route
          exact
          path='/registration/addiction'
          render={() => <RegistrationQueuePage registryKey={REGISTRY_ADDICTION} />}
        />
        {/* เวชระเบียนเยี่ยมบ้าน — หน้าเดียวกับทะเบียนศูนย์ ต่างที่ registryKey */}
        <Route
          exact
          path='/registration/home-visit'
          render={() => <RegistrationQueuePage registryKey={REGISTRY_HOME_VISIT} />}
        />
        <Route exact path='/registration/register' component={RegistrationFormPage} />
        {/* การบันทึกการมาสถานพยาบาล — เปิด Visit Number (TOR §1.1.2).
            Sub-flow ของงานเวชระเบียน (เข้าจาก row action ของหน้าคิว หรือหลัง
            บันทึกทะเบียนสำเร็จ) จึงไม่มีเมนูของตัวเอง เช่นเดียวกับ /registration/register. */}
        <Route exact path='/registration/visit'    component={RegistrationVisitOpenPage} />
        <Route exact path='/registration/consent/:formId' component={RegistrationConsentFillPage} />
        <Route exact path='/treat'           component={TreatmentQueuePage} />
        <Route exact path='/treat/queue'     component={TreatmentQueuePage} />
        {/* คิวรวมรอรับเคส — ศูนย์ที่พยาบาลไม่ระบุแพทย์ที่จุดคัดกรอง เคสมากอง
            รวมที่นี่ให้แพทย์หยิบเอง ไม่แยกตามคลินิก (มติผู้ใช้ 28 ส.ค. 69) */}
        <Route exact path='/treat/unassigned' component={UnassignedWorklistPage} />
        {/* Exit Nurse — คู่ตรงข้ามของจุดคัดกรอง อยู่ระดับ rail ของตัวเอง
            ไม่ใช่คลินิกใต้บันทึกการรักษา (มติผู้ใช้ 28 ส.ค. 69) */}
        <Route exact path='/exit' component={ExitNurseQueuePage} />
        {/* Key by encounter identity so selecting another queue patient
            remounts every form hook; clinical state can never leak across HN. */}
        <Route
          exact
          path='/treat/record'
          render={(props) => (
            <TreatmentFormPage
              key={`${props.location.state?.hn || 'missing'}:${props.location.state?.vn || props.location.key}`}
              {...props}
            />
          )}
        />
        {/* A CPOE order must always belong to a selected encounter. */}
        <Redirect exact from='/treat/cpoe' to='/treat/queue' />
        {/* แฟ้มเวชระเบียนอิเล็กทรอนิกส์ · หน้าจอระดับโมดูล (TOR §1.4)
            /treat/refer      = ทะเบียนการส่งต่อผู้รับบริการ 2 ทิศทาง (ส่งต่อออก /
                                รับเข้า) + ฟอร์มตามแบบ ศบส. + พิมพ์ใบส่งตัว
                                (§1.4.3.14 / §1.4.11.1 / §1.4.6.1). ปุ่ม
                                "แบบฟอร์มส่งตัว" ในศูนย์เอกสาร Step 7 deep-link มาที่นี่
            /treat/interfaces = สถานะการเชื่อมต่อระบบภายนอก LIS / PACS / เกตเวย์
                                อุปกรณ์ / Telemedicine (§1.4.7.2–.5 / §1.4.3.23).
                                กระดิ่งผลแล็บบนแถบเฝ้าระวังของ /treat/record ชี้มาที่นี่
            ทั้งสองหน้าใช้ Sidebar activeKey='treat' — อยู่ใต้เมนูย่อยของ
            ระบบบันทึกการรักษา ไม่ใช่เมนูระดับบนของตัวเอง. */}
        <Route exact path='/treat/refer'      component={ReferralRegisterPage} />
        <Route exact path='/treat/interfaces' component={TreatmentInterfacesPage} />
        {/* การสั่งการรักษาโดยแพทย์ · หน้าจอระดับโมดูล (TOR §1.5)
            /treat/consult    = ทะเบียนการส่งปรึกษาแพทย์ (§1.5.6.1 / §1.5.6.7) —
                                หัวฟอร์ม auto-fill เลขที่คำขอ/ผู้ขอ/หน่วยงาน +
                                พิมพ์ใบส่งปรึกษา A4 ผ่าน ConsultPrintSheet
            หน้านี้ใช้ Sidebar activeKey='treat' — เป็นเมนูย่อยของระบบบันทึกการรักษา
            เช่นเดียวกับ /treat/refer และ /treat/interfaces. */}
        <Route exact path='/treat/consult'    component={ConsultRegisterPage} />
        {/* ทะเบียนยา/การตรวจ + CDSS เดิมของโมดูลการรักษา. ชุด preset กลางและ
            สิทธิ์ผู้เข้าถึงแยกไปอยู่ที่ /admin/order-sets เพื่อไม่ให้ route นี้
            กลายเป็นทางลัดข้ามสิทธิ์ system.settings. */}
        <Route exact path='/treat/order-sets' component={OrderSetSettingsPage} />
        {/* นโยบายการเข้าถึงข้อมูล (ABAC · §1.4.8.1 / §1.4.2.1) — หน้าผู้ดูแลระบบ
            ของระบบบันทึกการรักษา: กฎ บทบาท × หน่วยงาน × หมวดข้อมูล → ระดับการมองเห็น,
            แท็บทดลองมุมมอง, ข้อมูลลับโดยค่าเริ่มต้น และ audit การแก้กฎ.
            อยู่ในเมนูย่อยของ "ระบบบันทึกการรักษา"
            (activeKey='treat' เหมือน /treat/consult · /treat/interfaces). */}
        <Route exact path='/treat/access-policy' component={AccessPolicyPage} />
        {/* งานรังสีวินิจฉัย — Radiology Information System (TOR §1.12).
            /xray/queue  = ลำดับการตรวจผู้ป่วย (worklist · the department's own
                           screen; รับ/ปฏิเสธ Request → ถ่าย → บันทึกผล → ยืนยันผล)
            /xray/order  = บันทึกส่งตรวจทางรังสีวิทยา (§1.12.5 + นัดหมาย §1.12.3)
            /xray/result = บันทึก/ยืนยันผลการตรวจ (§1.12.6 — accepts ?xn=&mode=verify
                           deep links from the worklist row actions)
            /xray/setup  = ทะเบียนรายการตรวจ + Template ผลตรวจ (§1.12.4, §1.12.6.1/6.7) */}
        <Route exact path='/xray'            component={XrayQueuePage} />
        <Route exact path='/xray/queue'      component={XrayQueuePage} />
        <Route exact path='/xray/order'      component={XrayOrderPage} />
        <Route exact path='/xray/result'     component={XrayResultPage} />
        <Route exact path='/xray/setup'      component={XraySetupPage} />
        {/* แผนกฝากครรภ์ (ANC) — TOR §1.10.7, first-visit MVP. */}
        <Route exact path='/treat/anc/queue'  component={AncQueuePage} />
        <Route exact path='/treat/anc/record' component={AncFormPage} />
        {/* คลินิกเฉพาะทาง (TOR §1.10) — ทุกโมดูลใช้ pattern เดียวกับ ANC:
              /clinic/<slug>            = คิวผู้รับบริการของคลินิก
              /clinic/<slug>/record     = แบบฟอร์มบันทึกการรักษา (deep link
                                          ด้วย location.state { hn, queue })
              /clinic/<slug>/registry   = ทะเบียนผู้รับบริการระดับคลินิก
              /clinic/<slug>/follow-up  = การติดตามการดูแลต่อเนื่อง
            ทุกหน้าใช้ Sidebar activeKey='treat' จึงอยู่ใต้เมนูย่อยของ
            ระบบบันทึกการรักษา ไม่ใช่เมนูระดับบนของตัวเอง.
            ทุกคลินิกมีหน้า record แล้ว. ตัวสะกดของ path ต่างกันตามที่โมดูล
            push จริง — NCD ใช้ `/clinic/ncd/followup` (ไม่มีขีด) ส่วนคลินิก
            อื่นใช้ `/clinic/<slug>/follow-up` (มีขีด) — ห้ามแก้ให้เหมือนกัน
            โดยไม่แก้ปุ่มในหน้าคิว/ทะเบียนของโมดูลนั้นพร้อมกัน ไม่งั้น 404. */}
        <Route exact path='/clinic/dental'              component={DentalQueuePage} />
        <Route exact path='/clinic/dental/record'       component={DentalFormPage} />
        <Route exact path='/clinic/ncd'                 component={NcdQueuePage} />
        <Route exact path='/clinic/ncd/record'          component={NcdFormPage} />
        <Route exact path='/clinic/ncd/registry'        component={NcdRegistryPage} />
        <Route exact path='/clinic/ncd/followup'        component={NcdFollowUpPage} />
        <Route exact path='/clinic/mental-health'           component={MentalHealthQueuePage} />
        <Route exact path='/clinic/mental-health/record'    component={MentalHealthFormPage} />
        <Route exact path='/clinic/mental-health/registry'  component={MentalHealthRegistryPage} />
        <Route exact path='/clinic/mental-health/follow-up' component={MentalHealthFollowUpPage} />
        <Route exact path='/clinic/tb'                  component={TbQueuePage} />
        <Route exact path='/clinic/tb/record'           component={TbFormPage} />
        <Route exact path='/clinic/tb/registry'         component={TbRegistryPage} />
        <Route exact path='/clinic/tb/follow-up'        component={TbFollowUpPage} />
        <Route exact path='/clinic/tb/screening'        component={TbScreeningPage} />
        <Route exact path='/clinic/addiction'           component={AddictionQueuePage} />
        <Route exact path='/clinic/addiction/record'    component={AddictionFormPage} />
        <Route exact path='/clinic/addiction/registry'  component={AddictionRegistryPage} />
        <Route exact path='/clinic/addiction/follow-up' component={AddictionFollowUpPage} />
        <Route exact path='/clinic/addiction/community' component={AddictionCommunityPage} />
        <Route exact path='/clinic/hiv-sti'             component={HivStiQueuePage} />
        <Route exact path='/clinic/hiv-sti/record'      component={HivStiFormPage} />
        <Route exact path='/clinic/hiv-sti/registry'    component={HivStiRegistryPage} />
        <Route exact path='/clinic/hiv-sti/follow-up'   component={HivStiFollowUpPage} />
        {/* คลินิกพิเศษชุด 2 (Wave 2) — ทุกหน้าใช้ query-string (?hn=) ยกเว้น
            social-work record ที่รับ :hn เป็น param เสริม (fallback ใน state) */}
        <Route exact path='/clinic/family-planning'          component={FamilyPlanningQueuePage} />
        <Route exact path='/clinic/family-planning/record'   component={FamilyPlanningFormPage} />
        <Route exact path='/clinic/family-planning/registry' component={FamilyPlanningRegistryPage} />
        <Route exact path='/clinic/immunization'              component={ImmunizationQueuePage} />
        <Route exact path='/clinic/immunization/record'       component={ImmunizationFormPage} />
        <Route exact path='/clinic/immunization/registry'     component={ImmunizationRegistryPage} />
        <Route exact path='/clinic/immunization/follow-up'    component={ImmunizationFollowUpPage} />
        <Route exact path='/clinic/immunization/vaccines'     component={VaccineCatalogPage} />
        <Route exact path='/clinic/immunization/vaccine-book' component={ImmunizationVaccineBookPage} />
        <Route exact path='/clinic/rehab'          component={RehabQueuePage} />
        <Route exact path='/clinic/rehab/record'   component={RehabFormPage} />
        <Route exact path='/clinic/rehab/registry' component={RehabRegistryPage} />
        <Route exact path='/clinic/rehab/followup' component={RehabFollowUpPage} />
        {/* งานสังคมสงเคราะห์ (TOR §1.10.11) — IA ใหม่ตามมติ คทง.10 ครั้งที่ 3:
            base route = หน้าแรก (ค้นหา + เมนูหลัก 5 ปุ่ม + ตรวจข้ามศูนย์) ส่วน
            คิวเดิมย้ายไป /queue — สองบรรทัดนี้ต้องเปลี่ยนพร้อมกันเสมอ มิฉะนั้น
            ปุ่ม "กลับหน้าแรก"/เมนูหลักบน Home จะ 404 */}
        <Route exact path='/clinic/social-work'            component={SocialWorkHomePage} />
        <Route exact path='/clinic/social-work/queue'      component={SocialWorkQueuePage} />
        <Route exact path='/clinic/social-work/record/:hn' component={SocialWorkFormPage} />
        <Route exact path='/clinic/social-work/record'     component={SocialWorkFormPage} />
        <Route exact path='/clinic/social-work/registry'   component={SocialWorkRegistryPage} />
        <Route exact path='/clinic/social-work/requesters' component={SocialWorkRequesterRegistryPage} />
        <Route exact path='/clinic/social-work/supplies'   component={SocialWorkSupplyPage} />
        <Route exact path='/clinic/social-work/follow-up'  component={SocialWorkFollowUpPage} />
        <Route exact path='/clinic/social-work/referral'   component={SocialWorkReferralPage} />
        <Route exact path='/clinic/social-work/activities' component={SocialWorkActivityPage} />
        <Route exact path='/clinic/social-work/reports'    component={SocialWorkReportsPage} />
        <Route exact path='/clinic/social-work/nutrition'  component={SocialWorkNutritionPage} />
        {/* ระบบการเยี่ยมบ้าน (TOR §1.18) — ระบบใหม่ระดับ rail ไม่ใช่คลินิกใน /clinic */}
        <Route exact path='/homevisit'           component={HomeVisitQueuePage} />
        <Route exact path='/homevisit/visit'     component={HomeVisitRecordPage} />
        <Route exact path='/homevisit/registry'  component={HomeVisitRegistryPage} />
        <Route exact path='/homevisit/follow-up' component={HomeVisitFollowUpPage} />
        {/* งานอนามัยโรงเรียน (TOR §3 ระบบสุขภาพนักเรียน) — 7 หน้า: คิว ·
            ทะเบียนโรงเรียน · ทะเบียนนักเรียน · แฟ้มสุขภาพรายคน (Tabs 6 บริการ) ·
            บันทึกบริการรายห้อง (Batch) · Dashboard · รายงาน.
            เหมือนกลุ่ม /lab: route static ทั้งหมดอยู่**เหนือ**
            /clinic/school-health/student/:studentId — <Switch> จับตัวแรกที่ match. */}
        <Route exact path='/clinic/school-health'               component={SchoolHealthQueuePage} />
        <Route exact path='/clinic/school-health/schools'       component={SchoolRegistryPage} />
        <Route exact path='/clinic/school-health/students'      component={StudentRegistryPage} />
        <Route exact path='/clinic/school-health/batch-vaccine' component={SchoolHealthBatchVaccinePage} />
        <Route exact path='/clinic/school-health/dashboard'     component={SchoolHealthDashboardPage} />
        <Route exact path='/clinic/school-health/reports'       component={SchoolHealthReportsPage} />
        <Route exact path='/clinic/school-health/student/:studentId' component={StudentHealthProfilePage} />
        {/* daycare — route static อยู่เหนือ /child/:childId เช่นเดียวกับ school-health */}
        <Route exact path='/clinic/daycare'            component={DaycareQueuePage} />
        <Route exact path='/clinic/daycare/children'   component={DaycareChildRegistryPage} />
        <Route exact path='/clinic/daycare/lessons'    component={DaycareLessonsPage} />
        <Route exact path='/clinic/daycare/monitoring' component={DaycareMonitoringPage} />
        <Route exact path='/clinic/daycare/child/:childId' component={DaycareChildPage} />
        <Route exact path='/pharmacy'          component={PharmacyQueuePage} />
        <Route exact path='/pharmacy/queue'    component={PharmacyQueuePage} />
        <Route exact path='/pharmacy/dispense' component={PharmacyDispensePage} />
        {/* Backward-compatible links from the former pharmacy-local registry. */}
        <Redirect exact from='/lab/setup' to='/admin/lab/registry' />
        <Redirect exact from='/pharmacy/registry' to='/admin/pharmacy/registry' />
        <Redirect exact from='/pharmacy/registry/new' to='/admin/pharmacy/registry/new' />
        <Redirect exact from='/pharmacy/registry/:id' to='/admin/pharmacy/registry/:id' />
        <Route exact path='/pharmacy/stock'        component={PharmacyStockPage} />
        <Route exact path='/pharmacy/requisition'  component={PharmacyRequisitionPage} />
        <Route exact path='/pharmacy/patients'     component={PharmacyPatientsPage} />
        <Route exact path='/pharmacy/reports'      component={PharmacyReportsPage} />

        {/* งานชันสูตรโรค (Lab · TOR ข้อ 1.15). Eight screens, matching the
            flow the team laid out in Lab dicussion with team.pdf:
              /lab/order       — แพทย์/พยาบาลสั่งตรวจ (1.15.4)
              /lab/queue       — Worklist ของห้องปฏิบัติการ 6 ขั้นตอน (1.15.2)
              /lab/receive     — สถานีรับสิ่งส่งตรวจ 3 ขั้น (1.15.4.5)
              /lab/send-out    — ส่งตรวจภายนอก + รับผลกลับ (1.15.6.2)
              /lab/result/:id  — บันทึกผล + ค่าวิกฤต (1.15.6)
              /lab/report/:orderId — ใบผลตรวจรายครั้ง (1.15.6.3)
              /lab/history/:hn — ใบสรุปผลย้อนหลังข้ามครั้ง (1.15.4.3 / 1.15.6.3)
              (/admin/lab/registry — ทะเบียนรายการตรวจ + รหัส TMLT (1.15.3),
               ย้ายไปอยู่ใต้จัดการระบบแล้ว)
            ลำดับสำคัญ: route แบบ static ทั้งหมดต้องอยู่**เหนือ** route ที่มี
            param (`/lab/result/:id`, `/lab/report/:orderId`, `/lab/history/:hn`)
            เพราะ <Switch> จับตัวแรกที่ match — ถ้าสลับที่ /lab/receive จะถูก
            `/lab/result/:id` กลืนไปก่อน. เพิ่ม route ใหม่ให้ต่อท้ายกลุ่ม static. */}
        <Route exact path='/lab'              component={LabQueuePage} />
        <Route exact path='/lab/queue'        component={LabQueuePage} />
        <Route exact path='/lab/order'        component={LabOrderPage} />
        <Route exact path='/lab/receive'      component={LabReceivePage} />
        <Route exact path='/lab/send-out'     component={LabSendOutPage} />
        <Route exact path='/lab/result/:id'   component={LabResultEntryPage} />
        <Route exact path='/lab/report/:orderId' component={LabReportPage} />
        <Route exact path='/lab/history/:hn'  component={LabPatientHistoryPage} />
        <Route exact path='/observation'               component={ObservationQueuePage} />
        <Route exact path='/observation/record/:id'   component={ObservationDetailPage} />
        <Route exact path='/observation/history/:id'  component={ObservationHistoryPage} />
        {/* ระบบงานตรวจสุขภาพ (TOR §1.19) —
              /checkup            — คิวตรวจสุขภาพ (1.19.4)
              /checkup/targets    — กลุ่มเป้าหมาย + import spreadsheet (1.19.2)
              /checkup/packages   — ทะเบียนชุดตรวจสุขภาพ (1.19.1)
              /checkup/reports    — รายงานภาพรวม (1.19.7)
              /checkup/community  — กิจกรรมสุขภาพชุมชน (1.19.8–9)
              /checkup/order|record|screening|report/:visitId + history/:hn
            เหมือนกลุ่ม /lab: route static ทั้งหมดต้องอยู่เหนือ route ที่มี
            param — <Switch> จับตัวแรกที่ match. */}
        <Route exact path='/checkup'                    component={CheckupQueuePage} />
        <Route exact path='/checkup/targets'            component={CheckupTargetGroupPage} />
        <Route exact path='/checkup/packages'           component={CheckupPackagePage} />
        <Route exact path='/checkup/reports'            component={CheckupReportsPage} />
        <Route exact path='/checkup/community'          component={CheckupCommunityPage} />
        <Route exact path='/checkup/order/:visitId'     component={CheckupOrderPage} />
        <Route exact path='/checkup/record/:visitId'    component={CheckupRecordPage} />
        <Route exact path='/checkup/screening/:visitId' component={CheckupScreeningPage} />
        <Route exact path='/checkup/report/:visitId'    component={CheckupIndividualReportPage} />
        <Route exact path='/checkup/history/:hn'        component={CheckupHistoryPage} />
        {/* สิทธิและการเบิกจ่าย (TOR §1.7.3–1.7.5) — ตรวจสอบสิทธิ · ส่งเบิก ·
            Claim · ตั้งค่า รวมใน RightsClaimPage (tab sections);
            รายละเอียดรายการส่งเบิกแยกหน้า /rights/submit/:visitId. */}
        <Route exact path='/rights'                     component={RightsClaimPage} />
        <Route exact path='/rights/submit/:visitId'     component={ClaimSubmitDetailPage} />
        {/* คลังเอกสาร e-document — visual form builder (Figma 0EDfjwf1 · 26:1747). */}
        <Route exact path='/doc-template/new'              component={CreateDocTemplatePage} />
        <Route exact path='/doc-template'                  component={CreateDocTemplatePage} />
        {/* คลังเอกสาร e-document — catalog grouped by category + detail w/ QR share */}
        <Route exact path='/forms/dashboard'                    component={EdocumentDashboardPage} />
        <Route exact path='/forms'                          component={FormsLibraryPage} />
        <Route exact path='/forms/category/:categoryKey'    component={FormsCategoryPage} />
        <Route exact path='/forms/:slug'                    component={FormDetailPage} />
        <Route exact path='/forms/:slug/fill'               component={FormFillPage} />
        {/* ผู้ใช้และสิทธิ์การเข้าถึง — admin manages users + role/sub-role/department/features */}
        <Route exact path='/users'             component={UsersAccessPage} />
        <Route exact path='/users/new'         component={UserEditPage} />
        {/* TOR §1.17 — admin sub-modules. Must precede '/users/:id' so the
            literal segments aren't swallowed by the :id param. */}
        <Route exact path='/users/directory-service' component={DirectoryServicePage} />
        <Route exact path='/users/drug-routing'      component={DrugOrderRoutingPage} />
        <Route exact path='/users/reports'           component={UserUsageReportPage} />
        <Route exact path='/users/notifications'     component={NotificationCenterPage} />
        <Route exact path='/users/:id/schedule' component={UserSchedulePage} />
        <Route exact path='/users/:id'         component={UserEditPage} />
        {/* Standalone component library — separate from PHCIS chrome */}
        <Route exact path='/components'           component={ComponentsLibraryPage} />
        <Route exact path='/components/:slug'     component={ComponentsLibraryPage} />

        {/* Kiosk — canonical app: https://bma-kiosk.mih.co.th/Kiosk/
            Repo: namonlims/bma.kiosk (sibling ../bma.kiosk).
            /kiosk redirects out; legacy QR /kiosk/ticket/:id → live queue status. */}
        <Route exact path='/kiosk'                       component={KioskExternalRedirect} />
        <Route exact path='/kiosk/ticket/:queueId'       component={KioskTicketRedirect} />

        {/* ระบบ Telemedicine / RPM (TOR ข้อ 1.13) — หน้าวิดีโอคอลฝั่งแพทย์.
            เปิดจากปุ่ม Telemedicine (floating) ในระบบบันทึกการรักษา.
            Standalone full-screen surface — ไม่มี PHCIS sidebar chrome. */}
        <Route exact path='/telemed'                     component={TelemedRouteTrigger} />
        {/* หน้าจัดการของโมดูล Telemedicine (worklist / RPM / PDPA consent /
            รายงาน) ต้องอยู่ **เหนือ** /telemed/:visitId ไม่งั้น param route
            จะกลืนทุก path แล้วเปิดสายทันที. /telemed/assessment/:visitId
            เป็น 3 ส่วนจึงไม่ชนกับ :visitId */}
        <Route exact path='/telemed/worklist'            component={TelemedWorklistPage} />
        <Route exact path='/telemed/rpm'                 component={TelemedRpmBoardPage} />
        <Route exact path='/telemed/consent'             component={TelemedConsentPage} />
        <Route exact path='/telemed/reports'             component={TelemedReportPage} />
        <Route exact path='/telemed/assessment/:visitId' component={TelemedAssessmentPage} />
        <Route exact path='/telemed/:visitId'            component={TelemedRouteTrigger} />

        {/* Legacy chrome-free preview sandboxes (kept for reference) */}
        <Route exact path='/preview/tabs'         component={TabsPreviewPage} />
        <Route exact path='/preview/cards'        component={CardsPreviewPage} />
        <Route exact path='/preview/body-record'  component={BodyRecordPreviewPage} />
        {/* เอกสารพิมพ์ของงานรังสีวินิจฉัย — ใบรายงานผล · ใบส่งตรวจ · ใบนัด ·
            ฉลากติดซองฟิล์ม, all four on real mock orders so the paper can be
            reviewed (and ⌘P-tested) without walking the RIS flows. */}
        <Route exact path='/preview/xray-sheets'  component={XraySheetsPreviewPage} />

        {/* PHCIS Mobile app (TOR §4).
            Canonical repo is now namonlims/bma.mobile (sibling app on :3001).
            /m/* remains here temporarily for hub demos + because web badges
            still import `@/components/mobile/figmaIcons`. Do not add new
            mobile features here — land them in bma.mobile. */}
        <Route path='/m'>
          <MobileAppProvider>
            <Switch>
              {/* Splash owns the bare /m entry — the app's first paint is the
                  brand screen, which hands off to /m/home or /m/login on its
                  own (Figma 2042:28039). /m/splash stays addressable so the
                  screen can be linked or reviewed directly. */}
              <Route exact path='/m'                     component={MobileSplashPage} />
              <Route exact path='/m/splash'              component={MobileSplashPage} />
              <Route exact path='/m/components'          component={MobileComponentsPage} />
              <Route exact path='/m/login'               component={MobileLoginPage} />
              <Route exact path='/m/register'            component={MobileRegisterPage} />
              <Route exact path='/m/reset'               component={MobileResetPage} />
              <Route exact path='/m/home'                component={MobileHomePage} />
              <Route exact path='/m/notifications'       component={MobileNotificationsPage} />
              <Route exact path='/m/appointments'        component={MobileAppointmentsPage} />
              <Route exact path='/m/appointments/:id'    component={MobileAppointmentDetailPage} />
              <Route exact path='/m/book'                component={MobileBookPage} />
              <Route exact path='/m/telemed'             component={MobileTelemedPage} />
              <Route exact path='/m/records'             component={MobileRecordsPage} />
              <Route exact path='/m/visit/:id'           component={MobileVisitPage} />
              <Route exact path='/m/profile'             component={MobileProfilePage} />
              <Route exact path='/m/consent'             component={MobileConsentPage} />
              <Route exact path='/m/profile/qr'          component={MobileProfileQrPage} />
              <Route exact path='/m/profile/vitals'      component={MobileVitalsPage} />
              <Route exact path='/m/clinics'             component={MobileClinicsPage} />
              <Route exact path='/m/clinics/:code'       component={MobileClinicDetailPage} />
              <Route exact path='/m/requests'            component={MobileRequestsPage} />
              <Route exact path='/m/news'                component={MobileNewsPage} />
              <Route exact path='/m/news/:id'            component={MobileNewsDetailPage} />
              <Route exact path='/m/more'                component={MobileMorePage} />
              <Route exact path='/m/settings'            component={MobileSettingsPage} />
              <Route exact path='/m/pharmacy/preparing'  component={MobilePharmacyPreparingPage} />
              <Route exact path='/m/pharmacy/payment'    component={MobilePharmacyPaymentPage} />
              <Route exact path='/m/pharmacy/success'    component={MobilePharmacySuccessPage} />
              <Route exact path='/m/payment'             component={MobilePaymentPage} />
              <Route exact path='/m/payment/:id'         component={MobilePaymentDetailPage} />
            </Switch>
          </MobileAppProvider>
        </Route>
      </Switch>
      </RouteErrorBoundary>
      </TelemedCallProvider>
      </HeaderAutoHideProvider>
    </Router>
  );
}
