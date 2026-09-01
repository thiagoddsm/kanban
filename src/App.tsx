import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { AccessProvider } from './context/AccessContext';
import { DataProvider } from './context/DataContext';
import { NotificationProvider } from './context/NotificationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <TenantProvider>
            <AccessProvider>
              <DataProvider>
                <Routes>
                  {/* Páginas Públicas / Institucionais & Autenticação */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<RegisterPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Painel Interno da Organização / Igreja */}
                  <Route path="/:orgSlug/:tab" element={<Layout />} />
                  <Route path="/:orgSlug" element={<Navigate to="dashboard" replace />} />

                  {/* Fallback de rotas desconhecidas */}
                  <Route path="*" element={<Navigate to="/" replace />} />
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
