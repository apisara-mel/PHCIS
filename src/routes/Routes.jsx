import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

import DashboardPage from '@/pages/dashboard/DashboardPage';
import SystemHubPage from '@/pages/hub/SystemHubPage';
import AppointmentPage from '@/pages/appointment/AppointmentPage';
import SchedulePage from '@/pages/schedule/SchedulePage';
import ScheduleEditorPage from '@/pages/schedule/ScheduleEditorPage';
import ScreeningPage from '@/pages/opd/ScreeningPage';
import QueuePage from '@/pages/opd/QueuePage';
import OpdWalkinRequestPage from '@/pages/opd/OpdWalkinRequestPage';
import OpdRoomConfigPage from '@/pages/opd/OpdRoomConfigPage';
import OpdRg506Page from '@/pages/opd/OpdRg506Page';
import RegistrationQueuePage from '@/pages/registration/RegistrationQueuePage';
import RegistrationFormPage from '@/pages/registration/RegistrationFormPage';
import RegistrationVisitOpenPage from '@/pages/registration/RegistrationVisitOpenPage';
import RegistrationConsentFillPage from '@/pages/registration/RegistrationConsentFillPage';
import TreatmentQueuePage from '@/pages/treat/TreatmentQueuePage';
import TreatmentFormPage from '@/pages/treat/TreatmentFormPage';
import ReferralRegisterPage from '@/pages/treat/ReferralRegisterPage';
import TreatmentInterfacesPage from '@/pages/treat/TreatmentInterfacesPage';
import XrayQueuePage from '@/pages/xray/XrayQueuePage';
import XrayOrderPage from '@/pages/xray/XrayOrderPage';
import XrayResultPage from '@/pages/xray/XrayResultPage';
import XraySetupPage from '@/pages/xray/XraySetupPage';
import AncQueuePage from '@/pages/treat/anc/AncQueuePage';
import AncFormPage from '@/pages/treat/anc/AncFormPage';
/* คลินิกเฉพาะทาง (TOR §1.10.1–.6) — แต่ละโมดูลอยู่ใน src/pages/clinic/<slug>
   และเข้าถึงผ่านเมนูย่อยของ "ระบบบันทึกการรักษา" (Sidebar key `treat`). */
import DentalQueuePage from '@/pages/clinic/dental/DentalQueuePage';
import NcdQueuePage from '@/pages/clinic/ncd/NcdQueuePage';
import NcdFormPage from '@/pages/clinic/ncd/NcdFormPage';
import NcdRegistryPage from '@/pages/clinic/ncd/NcdRegistryPage';
import NcdFollowUpPage from '@/pages/clinic/ncd/NcdFollowUpPage';
import MentalHealthQueuePage from '@/pages/clinic/mental-health/MentalHealthQueuePage';
import MentalHealthFormPage from '@/pages/clinic/mental-health/MentalHealthFormPage';
import MentalHealthRegistryPage from '@/pages/clinic/mental-health/MentalHealthRegistryPage';
import MentalHealthFollowUpPage from '@/pages/clinic/mental-health/MentalHealthFollowUpPage';
import TbQueuePage from '@/pages/clinic/tb/TbQueuePage';
import AddictionQueuePage from '@/pages/clinic/addiction/AddictionQueuePage';
import AddictionFormPage from '@/pages/clinic/addiction/AddictionFormPage';
import HivStiQueuePage from '@/pages/clinic/hiv-sti/HivStiQueuePage';
import HivStiFormPage from '@/pages/clinic/hiv-sti/HivStiFormPage';
import HivStiRegistryPage from '@/pages/clinic/hiv-sti/HivStiRegistryPage';
import PharmacyQueuePage from '@/pages/pharmacy/PharmacyQueuePage';
import PharmacyDispensePage from '@/pages/pharmacy/PharmacyDispensePage';
import PharmacyRegistryPage from '@/pages/pharmacy/PharmacyRegistryPage';
import PharmacyRegistryEditPage from '@/pages/pharmacy/PharmacyRegistryEditPage';
import PharmacyStockPage from '@/pages/pharmacy/PharmacyStockPage';
import PharmacyRequisitionPage from '@/pages/pharmacy/PharmacyRequisitionPage';
import PharmacyHistoryPage from '@/pages/pharmacy/PharmacyHistoryPage';
import PharmacyReportsPage from '@/pages/pharmacy/PharmacyReportsPage';
import LabQueuePage from '@/pages/lab/LabQueuePage';
import LabOrderPage from '@/pages/lab/LabOrderPage';
import LabSetupPage from '@/pages/lab/LabSetupPage';
import LabResultEntryPage from '@/pages/lab/LabResultEntryPage';
import LabReportPage from '@/pages/lab/LabReportPage';
import ObservationQueuePage from '@/pages/observation/ObservationQueuePage';
import ObservationDetailPage from '@/pages/observation/ObservationDetailPage';
import ObservationHistoryPage from '@/pages/observation/ObservationHistoryPage';
import FormsLibraryPage from '@/pages/forms/FormsLibraryPage';
import FormsCategoryPage from '@/pages/forms/FormsCategoryPage';
import FormDetailPage from '@/pages/forms/FormDetailPage';
import FormFillPage from '@/pages/forms/FormFillPage';
import UsersAccessPage from '@/pages/users/UsersAccessPage';
import UserEditPage from '@/pages/users/UserEditPage';
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
import AddCenterPage from '@/pages/system/AddCenterPage';
import AuditOverviewPage from '@/pages/audit/AuditOverviewPage';
import AuditLogPage from '@/pages/audit/AuditLogPage';
import AuditPiiAccessLogPage from '@/pages/audit/AuditPiiAccessLogPage';
import CreateDocTemplatePage from '@/pages/doc-template/CreateDocTemplatePage';
import GroupPolicyPage from '@/pages/assess/GroupPolicyPage';
import DepartmentPage from '@/pages/assess/DepartmentPage';
import PositionPage from '@/pages/assess/PositionPage';
import AccessControlPage from '@/pages/assess/AccessControlPage';
import AccessControlCreatePage from '@/pages/assess/AccessControlCreatePage';
import AccessControlDetailPage from '@/pages/assess/AccessControlDetailPage';
import SystemConsentAccessRightsPage from '@/pages/assess/SystemConsentAccessRightsPage';
import AssessUserPage from '@/pages/assess/AssessUserPage';
import AssessUserCreatePage from '@/pages/assess/AssessUserCreatePage';
import AssessUserDetailPage from '@/pages/assess/AssessUserDetailPage';
import QueueCenterConsolePage from '@/pages/queue-center/QueueCenterConsolePage';
import QueueIssuePage from '@/pages/queue-center/QueueIssuePage';
import QueueIntegrationPage from '@/pages/queue-center/QueueIntegrationPage';
import QueueSettingsPage from '@/pages/queue-center/QueueSettingsPage';
import QueueDisplayLauncherPage from '@/pages/queue-display/QueueDisplayLauncherPage';
import HallDisplayPage from '@/pages/queue-display/HallDisplayPage';
import StationDisplayPage from '@/pages/queue-display/StationDisplayPage';
import FinanceDisplayPage from '@/pages/queue-display/FinanceDisplayPage';
import QueueAnnouncerConsolePage from '@/pages/queue-display/QueueAnnouncerConsolePage';
import QueueStatusOnlinePage from '@/pages/queue-display/QueueStatusOnlinePage';
import KioskPage from '@/pages/kiosk/KioskPage';
import MobileTicketPage from '@/pages/kiosk/MobileTicketPage';
import FinancePaymentPage from '@/pages/finance/FinancePaymentPage';
import { TelemedCallProvider, TelemedRouteTrigger } from '@/components/telemed/TelemedCallProvider';
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

export default function Routes() {
  return (
    <Router>
      {/* Global deep-link highlighter for TOR Compliance Checklist URLs.
          Reads `?spotlight=<key>&label=<TOR-id>` from every page. */}
      <Spotlight />
      {/* Telemedicine call lives ABOVE the Switch so the video call + its live
          media streams survive route changes — the doctor can minimise the
          call and keep recording in ระบบบันทึกการรักษา (TOR 1.13). */}
      <TelemedCallProvider>
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
        {/* สร้างแบบฟอร์มใหม่ — 3-step wizard, stays INSIDE the consent system
            (own consent side menu) instead of bouncing to /forms (PHCIS). */}
        {/* แบบฟอร์มความยินยอม — consent-form template registry (Figma 291:113045). */}
        <Route exact path='/consent/forms'        component={ConsentFormsPage} />
        <Route exact path='/consent/forms/new'    component={CreateConsentFormPage} />
        {/* ดูแบบฟอร์ม — read-only Step-3 preview of an existing form (Figma 336:170901). */}
        <Route exact path='/consent/forms/:id/view' component={ConsentFormViewPage} />
        {/* ประวัติความยินยอม — ค้นหาชื่อ/HN แล้วเปิด Timeline (แท็บใหม่จาก worklist) */}
        <Route exact path='/consent/history' component={ConsentHistoryPage} />
        <Route exact path='/consent/history/:hn' component={ConsentHistoryPage} />
        {/* ด.1.1.18 — ย้ายไปจัดการระบบ · redirect จาก URL เดิม */}
        <Redirect exact from='/consent/access/rights' to='/assess/consent-access-rights' />
        {/* จัดการสิทธิ์การเข้าถึง — access-request registry (Figma 363:122327). */}
        <Route exact path='/consent/access'       component={AccessManagementPage} />
        {/* สถิติและรายงาน — consent reports dashboard (Figma 358:113804). */}
        <Route exact path='/consent/report'       component={ConsentReportPage} />
        {/* ระบบจัดการระบบ (System/Org administration · Figma 0EDfjwf1 24:2612) —
            central admin: org structure · staff · roles. Reached from the Hub.
            (The activity history moved to its own system · /audit.) */}
        <Route exact path='/admin'           component={SystemOverviewPage} />
        {/* ศูนย์บริการ — health-center registry + 5-step add wizard (Figma 4D3nTx53 · 1:3273). */}
        <Route exact path='/admin/centers'      component={SystemCentersPage} />
        <Route exact path='/admin/centers/new'  component={AddCenterPage} />
        <Route exact path='/admin/staff'        component={SystemStaffPage} />
        <Route exact path='/admin/staff/new'    component={SystemStaffAddPage} />
        <Route exact path='/admin/staff/:id'    component={SystemStaffDetailPage} />
        <Route exact path='/admin/roles'        component={SystemRolesPage} />
        <Route exact path='/admin/roles/new'    component={SystemRoleCreatePage} />
        {/* ระบบประวัติการใช้งาน (Audit / Activity log · Figma 0EDfjwf1 12:1624) —
            usage overview + history log. Top-level system, reached from the Hub. */}
        <Route exact path='/audit'           component={AuditOverviewPage} />
        <Route exact path='/audit/log'       component={AuditLogPage} />
        <Route exact path='/audit/pii-access' component={AuditPiiAccessLogPage} />
        {/* PHCIS | Assess-control — Group Policy (Figma 4D3nTx53 · 3:18430). */}
        <Route exact path='/assess/group-policy' component={GroupPolicyPage} />
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
        <Route exact path='/appointment'     component={AppointmentPage} />
        {/* ระบบจัดการตารางเวร (Schedule Management) — TOP-LEVEL system, sibling of PHCIS.
            Figma PHCIS-ALL · entered from hub card 2149:104214. No PhcisChrome — owns its shell. */}
        <Route exact path='/schedule'        component={SchedulePage} />
        <Route exact path='/schedule/:id'    component={ScheduleEditorPage} />
        <Route exact path='/dashboard'       component={DashboardPage} />
        <Route exact path='/finance'          component={FinancePaymentPage} />
        <Route exact path='/opd'             component={QueuePage} />
        <Route exact path='/opd/queue'       component={QueuePage} />
        <Route exact path='/opd/screening'   component={ScreeningPage} />
        {/* ระบบบริหารจัดการก่อนตรวจ + การตั้งค่า (TOR §1.2.1 / §1.2.3.6 / §1.2.7)
            /opd/requests    = รายการ Request Walk-in แยกตามแผนก + ให้ Slot แพทย์
                               + ออกคิวตรวจตาม Slot (1.2.1.4–1.2.1.6)
            /opd/room-config = ตั้งค่าห้องตรวจ/แพทย์ประจำห้อง + โควตารับผู้รับบริการ
                               ต่อหน่วยบริการ (1.2.7.1–1.2.7.2) — ป้อนโควตาให้หน้า
                               /opd/requests ใช้กั้นการให้ Slot
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
        <Route exact path='/queue-center'                  component={QueueCenterConsolePage} />
        <Route exact path='/queue-center/issue'            component={QueueIssuePage} />
        <Route exact path='/queue-center/integration'      component={QueueIntegrationPage} />
        <Route exact path='/queue-center/settings'         component={QueueSettingsPage} />
        <Route exact path='/queue-center/display'          component={QueueDisplayLauncherPage} />
        <Route exact path='/queue-center/display/hall'     component={HallDisplayPage} />
        <Route exact path='/queue-center/display/station'  component={StationDisplayPage} />
        <Route exact path='/queue-center/display/finance'  component={FinanceDisplayPage} />
        <Route exact path='/queue-center/display/console'  component={QueueAnnouncerConsolePage} />
        <Route exact path='/queue-center/display/online'   component={QueueStatusOnlinePage} />
        <Route exact path='/registration'          component={RegistrationQueuePage} />
        <Route exact path='/registration/queue'    component={RegistrationQueuePage} />
        <Route exact path='/registration/register' component={RegistrationFormPage} />
        {/* การบันทึกการมาสถานพยาบาล — เปิด Visit Number (TOR §1.1.2).
            Sub-flow ของงานเวชระเบียน (เข้าจาก row action ของหน้าคิว หรือหลัง
            บันทึกทะเบียนสำเร็จ) จึงไม่มีเมนูของตัวเอง เช่นเดียวกับ /registration/register. */}
        <Route exact path='/registration/visit'    component={RegistrationVisitOpenPage} />
        <Route exact path='/registration/consent/:formId' component={RegistrationConsentFillPage} />
        <Route exact path='/treat'           component={TreatmentQueuePage} />
        <Route exact path='/treat/queue'     component={TreatmentQueuePage} />
        <Route exact path='/treat/record'    component={TreatmentFormPage} />
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
            หน้าที่ยังไม่มีในโมดูล (เช่น /clinic/tb/record · /clinic/dental/record)
            ยังไม่ผูก route — โมดูลนั้นต้องส่งไฟล์หน้าจอมาก่อน. */}
        <Route exact path='/clinic/dental'              component={DentalQueuePage} />
        <Route exact path='/clinic/ncd'                 component={NcdQueuePage} />
        <Route exact path='/clinic/ncd/record'          component={NcdFormPage} />
        <Route exact path='/clinic/ncd/registry'        component={NcdRegistryPage} />
        <Route exact path='/clinic/ncd/followup'        component={NcdFollowUpPage} />
        <Route exact path='/clinic/mental-health'           component={MentalHealthQueuePage} />
        <Route exact path='/clinic/mental-health/record'    component={MentalHealthFormPage} />
        <Route exact path='/clinic/mental-health/registry'  component={MentalHealthRegistryPage} />
        <Route exact path='/clinic/mental-health/follow-up' component={MentalHealthFollowUpPage} />
        <Route exact path='/clinic/tb'                  component={TbQueuePage} />
        <Route exact path='/clinic/addiction'           component={AddictionQueuePage} />
        <Route exact path='/clinic/addiction/record'    component={AddictionFormPage} />
        <Route exact path='/clinic/hiv-sti'             component={HivStiQueuePage} />
        <Route exact path='/clinic/hiv-sti/record'      component={HivStiFormPage} />
        <Route exact path='/clinic/hiv-sti/registry'    component={HivStiRegistryPage} />
        <Route exact path='/pharmacy'          component={PharmacyQueuePage} />
        <Route exact path='/pharmacy/queue'    component={PharmacyQueuePage} />
        <Route exact path='/pharmacy/dispense' component={PharmacyDispensePage} />
        <Route exact path='/pharmacy/registry'     component={PharmacyRegistryPage} />
        <Route exact path='/pharmacy/registry/new' component={PharmacyRegistryEditPage} />
        <Route exact path='/pharmacy/registry/:id' component={PharmacyRegistryEditPage} />
        <Route exact path='/pharmacy/stock'        component={PharmacyStockPage} />
        <Route exact path='/pharmacy/requisition'  component={PharmacyRequisitionPage} />
        <Route exact path='/pharmacy/history'      component={PharmacyHistoryPage} />
        <Route exact path='/pharmacy/reports'      component={PharmacyReportsPage} />

        {/* งานชันสูตรโรค (Lab · TOR ข้อ 1.15). Four screens, matching the
            flow the team laid out in Lab dicussion with team.pdf:
              /lab/order       — แพทย์/พยาบาลสั่งตรวจ (1.15.4)
              /lab/queue       — Worklist ของห้องปฏิบัติการ 6 ขั้นตอน (1.15.2)
              /lab/result/:id  — บันทึกผล + ค่าวิกฤต (1.15.6)
              /lab/setup       — ทะเบียนรายการตรวจ + รหัส TMLT (1.15.3) */}
        <Route exact path='/lab'              component={LabQueuePage} />
        <Route exact path='/lab/queue'        component={LabQueuePage} />
        <Route exact path='/lab/order'        component={LabOrderPage} />
        <Route exact path='/lab/setup'        component={LabSetupPage} />
        <Route exact path='/lab/result/:id'   component={LabResultEntryPage} />
        <Route exact path='/lab/report/:orderId' component={LabReportPage} />
        <Route exact path='/observation'               component={ObservationQueuePage} />
        <Route exact path='/observation/record/:id'   component={ObservationDetailPage} />
        <Route exact path='/observation/history/:id'  component={ObservationHistoryPage} />
        {/* แม่แบบเอกสาร — visual form builder (Figma 0EDfjwf1 · 26:1747). */}
        <Route exact path='/doc-template/new'              component={CreateDocTemplatePage} />
        <Route exact path='/doc-template'                  component={CreateDocTemplatePage} />
        {/* คลังแบบฟอร์ม — catalog grouped by category + detail w/ QR share */}
        <Route exact path='/forms'                          component={FormsLibraryPage} />
        <Route exact path='/forms/category/:categoryKey'    component={FormsCategoryPage} />
        <Route exact path='/forms/:slug'                    component={FormDetailPage} />
        <Route exact path='/forms/:slug/fill'               component={FormFillPage} />
        {/* ผู้ใช้และสิทธิ์การเข้าถึง — admin manages users + role/sub-role/department/features */}
        <Route exact path='/users'             component={UsersAccessPage} />
        <Route exact path='/users/new'         component={UserEditPage} />
        <Route exact path='/users/:id'         component={UserEditPage} />
        {/* Standalone component library — separate from PHCIS chrome */}
        <Route exact path='/components'           component={ComponentsLibraryPage} />
        <Route exact path='/components/:slug'     component={ComponentsLibraryPage} />

        {/* Kiosk landing — Step 0 of OPD flow (กดบัตรคิว).
            Canonical repo: namonlims/bma.kiosk (sibling app; open /Kiosk).
            /kiosk remains here temporarily for hub demos. New kiosk work
            lands in bma.kiosk.
            Mobile ticket page is the QR scan target — opens on visitor's
            phone after kiosk shows the QR. Supports image download. */}
        <Route exact path='/kiosk'                       component={KioskPage} />
        <Route exact path='/kiosk/ticket/:queueId'       component={MobileTicketPage} />

        {/* ระบบ Telemedicine / RPM (TOR ข้อ 1.13) — หน้าวิดีโอคอลฝั่งแพทย์.
            เปิดจากปุ่ม Telemedicine (floating) ในระบบบันทึกการรักษา.
            Standalone full-screen surface — ไม่มี PHCIS sidebar chrome. */}
        <Route exact path='/telemed'                     component={TelemedRouteTrigger} />
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
      </TelemedCallProvider>
    </Router>
  );
}
