import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { Footer } from './components/common/Footer';
import { GuidedTour } from './components/common/GuidedTour';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Cases } from './pages/Cases';
import { NewCase } from './pages/NewCase';
import { CaseDetail } from './pages/CaseDetail';
import { Institutions } from './pages/Institutions';
import { InstitutionDetail } from './pages/InstitutionDetail';
import { Overlaps } from './pages/Overlaps';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { ImportWizard } from './pages/ImportWizard';
import { Admin } from './pages/Admin';
import { About } from './pages/About';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedLayout: React.FC<{ children: React.ReactNode; onStartTour: () => void }> = ({ 
  children, onStartTour 
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-govbg text-slate-500">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-navy border-t-saffron rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold uppercase tracking-wider text-navy">
            Connecting to AICTE CASELINK...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-govbg">
      <Navbar onStartTour={onStartTour} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  const [isTourOpen, setIsTourOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <GuidedTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <Dashboard onStartTour={() => setIsTourOpen(true)} />
                </ProtectedLayout>
              }
            />

            <Route
              path="/cases"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <Cases />
                </ProtectedLayout>
              }
            />

            <Route
              path="/cases/new"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <NewCase />
                </ProtectedLayout>
              }
            />

            <Route
              path="/cases/:id"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <CaseDetail />
                </ProtectedLayout>
              }
            />

            <Route
              path="/institutions"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <Institutions />
                </ProtectedLayout>
              }
            />

            <Route
              path="/institutions/:id"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <InstitutionDetail />
                </ProtectedLayout>
              }
            />

            <Route
              path="/overlaps"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <Overlaps />
                </ProtectedLayout>
              }
            />

            <Route
              path="/alerts"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <Alerts />
                </ProtectedLayout>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <Reports />
                </ProtectedLayout>
              }
            />

            <Route
              path="/import"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <ImportWizard />
                </ProtectedLayout>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <Admin />
                </ProtectedLayout>
              }
            />

            <Route
              path="/about"
              element={
                <ProtectedLayout onStartTour={() => setIsTourOpen(true)}>
                  <About />
                </ProtectedLayout>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
