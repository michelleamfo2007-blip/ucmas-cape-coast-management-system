/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Academic from './pages/Academic';
import SchoolsAdmin from './pages/SchoolsAdmin';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes (Wrapped in AppShell) */}
        <Route path="/" element={
          <AppShell>
            <Dashboard />
          </AppShell>
        } />
        
        <Route path="/students" element={
          <AppShell>
            <Students />
          </AppShell>
        } />

        <Route path="/teachers" element={
          <AppShell>
            <Teachers />
          </AppShell>
        } />

        <Route path="/attendance" element={
          <AppShell>
            <Attendance />
          </AppShell>
        } />

        <Route path="/payments" element={
          <AppShell>
            <Payments />
          </AppShell>
        } />

        <Route path="/academic" element={
          <AppShell>
            <Academic />
          </AppShell>
        } />

        <Route path="/admin/schools" element={
          <AppShell>
            <SchoolsAdmin />
          </AppShell>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
