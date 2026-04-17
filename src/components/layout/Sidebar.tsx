import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/clients/new', icon: UserPlus, label: 'Novo Cliente' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-black border-b border-white/5">
        <img src="/logo.png" alt="Leads Solution" className="h-8 object-contain" />
        <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>
      </div>

      <nav className={cn(
        "bg-[#111111] md:w-64 min-w-[16rem] border-r border-white/5 flex flex-col transition-all duration-300 z-50",
        "fixed md:static inset-y-0 left-0 transform",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:flex justify-center items-center h-24 border-b border-white/5">
          <img src="/logo.png" alt="Leads Solution IA" className="h-full max-h-12 object-contain" />
        </div>

        <div className="flex-1 py-8 px-4 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
                isActive 
                  ? "bg-[var(--color-ls-accent)]/10 text-[var(--color-ls-accent)]" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
