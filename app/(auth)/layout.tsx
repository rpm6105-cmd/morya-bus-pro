import { AuthProvider } from "../lib/context/AuthContext";
import { Toaster } from "react-hot-toast";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
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
    </AuthProvider>
  );
}
