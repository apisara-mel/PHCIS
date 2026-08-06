import React from 'react';
import Routes from '@/routes/Routes';
import ErrorBoundary from '@/components/ErrorBoundary';
import HeaderMorphRoot from '@/components/layout/HeaderMorphRoot';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';

export default function App() {
  return (
    <ErrorBoundary>
      <HeaderMorphRoot />
      {/* App-level so the selected ศูนย์บริการ is shared by the Header chip
          AND consumed by pages (e.g. DepartmentPage scopes its list by it),
          and persists across navigation between admin pages. */}
      <ClinicFilterProvider>
        <Routes />
      </ClinicFilterProvider>
    </ErrorBoundary>
  );
}

