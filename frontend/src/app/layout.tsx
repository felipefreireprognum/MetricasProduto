import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Métricas AG31 — SCCI/FCVS',
  description: 'Dashboard de métricas do relatório AG31',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-[#F8F9FC] font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
