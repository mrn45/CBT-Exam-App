/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrictMode } from 'react';
import { AppProvider, useApp } from './lib/context';
import { ToastContainer, useToastManager } from './components/ui/Toast';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

function AppContent() {
  const { user } = useApp();
  const { toast } = useToastManager();

  return (
    <>
      <ToastContainer currentToast={toast} />
      {user ? <Dashboard /> : <Login />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
