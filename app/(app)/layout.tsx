'use client';

import { useState, useEffect } from 'react';
import { StoreProvider } from "../lib/context/StoreContext";
import { AuthProvider } from "../lib/context/AuthContext";
import Sidebar from "../components/ui/Sidebar";
import NotificationBell from "../components/ui/NotificationBell";
import { Menu } from "lucide-react";
import { Toaster } from "react-hot-toast";
import Tooltip from "../components/ui/Tooltip";
import ProtectedRoute from "../components/ProtectedRoute";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
            {collapsed && !isMobile && (
              <Tooltip label="Expand Sidebar">
                <button
                  onClick={() => setCollapsed(false)}
                  aria-label="Expand Sidebar"
                  style={{
                    position: 'fixed',
                    top: '14px',
                    left: '14px',
                    zIndex: 1060,
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#0f172a',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <Menu size={20} color="#fff" />
                </button>
              </Tooltip>
            )}
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
            <main className="main-content" style={{ marginLeft: collapsed && !isMobile ? 0 : undefined }}>
              <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0 0', pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto' }}>
                  <NotificationBell />
                </div>
              </div>
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
