'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiltersProvider } from '@/contexts/FiltersContext';
import { CacheProvider } from '@/contexts/CacheContext';
import Sidebar from '@/components/layout/Sidebar';
import { ROUTES } from '@/constants/routes';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, tokens } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace(ROUTES.LOGIN);
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <FiltersProvider>
      <CacheProvider>
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: tokens.bg.base }}>
          <Sidebar />
          <main className="flex-1 overflow-hidden" style={{ backgroundColor: tokens.bg.base }}>
            {children}
          </main>
        </div>
      </CacheProvider>
    </FiltersProvider>
  );
}
