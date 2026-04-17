import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useEffect } from 'react';
import { useStore } from '../../store/useStore';

export default function Layout() {
  const fetchData = useStore((state) => state.fetchData);
  const isLoading = useStore((state) => state.isLoading);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[var(--color-ls-bg)] relative">
      {isLoading && (
        <div className="absolute top-0 left-0 w-full h-1 bg-white/10 z-50 overflow-hidden">
          <div className="h-full bg-[var(--color-ls-accent)] origin-left animate-[pulse_1s_infinite] w-full max-w-[50%] animate-ping" />
        </div>
      )}
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full max-w-[100vw]">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
