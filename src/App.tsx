import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
                <Routes>
                  {/* Rota principal com slug da organização e tab ativa */}
                  <Route path="/:orgSlug/:tab" element={<Layout />} />
                  <Route path="/:orgSlug" element={<Navigate to="dashboard" replace />} />

                  {/* Fallback: redireciona para o slug padrão */}
                  <Route path="*" element={<Navigate to="/minha-igreja/dashboard" replace />} />
                </Routes>
              </DataProvider>
            </AccessProvider>
          </TenantProvider>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
