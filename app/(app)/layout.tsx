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
          position="top-right" 
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
