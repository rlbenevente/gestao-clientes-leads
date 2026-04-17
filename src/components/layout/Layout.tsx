import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[var(--color-ls-bg)]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full max-w-[100vw]">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
