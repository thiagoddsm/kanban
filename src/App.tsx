import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { AccessProvider } from './context/AccessContext';
import { DataProvider } from './context/DataContext';
import { NotificationProvider } from './context/NotificationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Layout } from './components/layout/Layout';

export function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <TenantProvider>
            <AccessProvider>
              <DataProvider>
                <Layout />
              </DataProvider>
            </AccessProvider>
          </TenantProvider>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
