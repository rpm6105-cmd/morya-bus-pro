'use client';

import { useState, useEffect } from 'react';
import { StoreProvider } from "../lib/context/StoreContext";
import { AuthProvider } from "../lib/context/AuthContext";
import Sidebar from "../components/ui/Sidebar";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "../components/ProtectedRoute";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <AuthProvider>
      <StoreProvider>
        <ProtectedRoute>
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
          </div>
        </ProtectedRoute>
        <Toaster 
          position={isMobile ? "top-center" : "top-right"} 
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#fff',
              fontSize: '0.875rem',
            },
          }}
        />
      </StoreProvider>
    </AuthProvider>
  );
}
