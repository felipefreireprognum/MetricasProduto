import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Métricas SCCI — FCVS',
  description: 'Dashboard de métricas de originação SCCI/FCVS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="h-full bg-[#F8F9FC] font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
