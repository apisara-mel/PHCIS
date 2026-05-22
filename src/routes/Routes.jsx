import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import DashboardPage from '@/pages/dashboard/DashboardPage';
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

export default function Routes() {
  return (
    <Router>
      <Switch>
        <Route exact path='/'                component={DashboardPage} />
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

        {/* Legacy chrome-free preview sandboxes (kept for reference) */}
        <Route exact path='/preview/tabs'         component={TabsPreviewPage} />
        <Route exact path='/preview/cards'        component={CardsPreviewPage} />
        <Route exact path='/preview/body-record'  component={BodyRecordPreviewPage} />
      </Switch>
    </Router>
  );
}
