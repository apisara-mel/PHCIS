import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import DashboardPage from '@/pages/dashboard/DashboardPage';
import SystemHubPage from '@/pages/hub/SystemHubPage';
import AppointmentPage from '@/pages/appointment/AppointmentPage';
import SchedulePage from '@/pages/schedule/SchedulePage';
import ScheduleEditorPage from '@/pages/schedule/ScheduleEditorPage';
import ScreeningPage from '@/pages/opd/ScreeningPage';
import QueuePage from '@/pages/opd/QueuePage';
import RegistrationQueuePage from '@/pages/registration/RegistrationQueuePage';
import RegistrationFormPage from '@/pages/registration/RegistrationFormPage';
import TreatmentQueuePage from '@/pages/treat/TreatmentQueuePage';
import TreatmentFormPage from '@/pages/treat/TreatmentFormPage';
import FormsLibraryPage from '@/pages/forms/FormsLibraryPage';
import FormsCategoryPage from '@/pages/forms/FormsCategoryPage';
import FormDetailPage from '@/pages/forms/FormDetailPage';
import FormFillPage from '@/pages/forms/FormFillPage';
import UsersAccessPage from '@/pages/users/UsersAccessPage';
import UserEditPage from '@/pages/users/UserEditPage';
import TabsPreviewPage from '@/pages/preview/TabsPreviewPage';
import CardsPreviewPage from '@/pages/preview/CardsPreviewPage';
import BodyRecordPreviewPage from '@/pages/preview/BodyRecordPreviewPage';
import ComponentsLibraryPage from '@/pages/components/ComponentsLibraryPage';
import KioskPage from '@/pages/kiosk/KioskPage';
import MobileTicketPage from '@/pages/kiosk/MobileTicketPage';
import Spotlight from '@/components/util/Spotlight';
import { MobileAppProvider } from '@/components/mobile/MobileShell';
import MobileLoginPage from '@/pages/mobile/MobileLoginPage';
import MobileRegisterPage from '@/pages/mobile/MobileRegisterPage';
import MobileResetPage from '@/pages/mobile/MobileResetPage';
import MobileHomePage from '@/pages/mobile/MobileHomePage';
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
import MobileComponentsPage from '@/pages/mobile/MobileComponentsPage';

export default function Routes() {
  return (
    <Router>
      {/* Global deep-link highlighter for TOR Compliance Checklist URLs.
          Reads `?spotlight=<key>&label=<TOR-id>` from every page. */}
      <Spotlight />
      <Switch>
        {/* Root = System Selection Hub (PHCIS-ALL · Figma node 2149:104090).
            Shown BEFORE entering any specific subsystem. Each card routes
            into its respective system (PHCIS dashboard, mobile, kiosk, …). */}
        <Route exact path='/'                component={SystemHubPage} />
        <Route exact path='/hub'             component={SystemHubPage} />
        <Route exact path='/appointment'     component={AppointmentPage} />
        {/* ระบบจัดการตารางเวร (Schedule Management) — TOP-LEVEL system, sibling of PHCIS.
            Figma PHCIS-ALL · entered from hub card 2149:104214. No PhcisChrome — owns its shell. */}
        <Route exact path='/schedule'        component={SchedulePage} />
        <Route exact path='/schedule/:id'    component={ScheduleEditorPage} />
        <Route exact path='/dashboard'       component={DashboardPage} />
        <Route exact path='/opd'             component={QueuePage} />
        <Route exact path='/opd/queue'       component={QueuePage} />
        <Route exact path='/opd/screening'   component={ScreeningPage} />
        <Route exact path='/registration'          component={RegistrationQueuePage} />
        <Route exact path='/registration/queue'    component={RegistrationQueuePage} />
        <Route exact path='/registration/register' component={RegistrationFormPage} />
        <Route exact path='/treat'           component={TreatmentQueuePage} />
        <Route exact path='/treat/queue'     component={TreatmentQueuePage} />
        <Route exact path='/treat/record'    component={TreatmentFormPage} />
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

        {/* Kiosk landing — Step 0 of OPD flow (กดบัตรคิว). Standalone
            1440×1462 touchscreen surface; NO sidebar/header chrome.
            Mobile ticket page is the QR scan target — opens on visitor's
            phone after kiosk shows the QR. Supports image download. */}
        <Route exact path='/kiosk'                       component={KioskPage} />
        <Route exact path='/kiosk/ticket/:queueId'       component={MobileTicketPage} />

        {/* Legacy chrome-free preview sandboxes (kept for reference) */}
        <Route exact path='/preview/tabs'         component={TabsPreviewPage} />
        <Route exact path='/preview/cards'        component={CardsPreviewPage} />
        <Route exact path='/preview/body-record'  component={BodyRecordPreviewPage} />

        {/* PHCIS Mobile app (TOR §4). Citizen-facing companion app rendered
            inside a 390×844 phone frame for desktop demo. All /m/* routes
            share the same MobileAppProvider so auth + language state
            survives navigation between screens.                            */}
        <Route path='/m'>
          <MobileAppProvider>
            <Switch>
              <Route exact path='/m'                     component={MobileHomePage} />
              <Route exact path='/m/components'          component={MobileComponentsPage} />
              <Route exact path='/m/login'               component={MobileLoginPage} />
              <Route exact path='/m/register'            component={MobileRegisterPage} />
              <Route exact path='/m/reset'               component={MobileResetPage} />
              <Route exact path='/m/home'                component={MobileHomePage} />
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
              <Route exact path='/m/payment'             component={MobilePaymentPage} />
              <Route exact path='/m/payment/:id'         component={MobilePaymentDetailPage} />
            </Switch>
          </MobileAppProvider>
        </Route>
      </Switch>
    </Router>
  );
}
