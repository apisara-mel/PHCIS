import React from 'react';
import Routes from '@/routes/Routes';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes />
    </ErrorBoundary>
  );
}
