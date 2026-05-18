import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import API from './api';

import { Navigation } from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import NewInvoice from './pages/NewInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import Reports from './pages/Reports';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('vidhim_billing_token');
    if (!token) {
      setAuthenticated(false);
      setChecking(false);
      return;
    }
    // Set global bearer header
    API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      await API.get('/auth/verify');
      setAuthenticated(true);
    } catch {
      localStorage.removeItem('vidhim_billing_token');
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vidhim_billing_token');
    setAuthenticated(false);
  };

  if (checking) return <div className="spinner" />;

  if (!authenticated) {
    return (
      <>
        <Login onLoginSuccess={checkAuth} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navigation onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/new" element={<NewInvoice />} />
            <Route path="/invoices/edit/:id" element={<NewInvoice />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '13px',
          },
        }}
      />
    </BrowserRouter>
  );
}
