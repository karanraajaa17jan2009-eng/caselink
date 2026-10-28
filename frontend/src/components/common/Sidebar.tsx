import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, PlusCircle, GitCompare, School,
  Bell, BarChart3, UploadCloud, ShieldCheck, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, isAdmin, canCreateCase } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Cases Register', path: '/cases', icon: FileText },
    ...(canCreateCase ? [{ name: 'New Complaint', path: '/cases/new', icon: PlusCircle }] : []),
    { name: 'Overlap Review Centre', path: '/overlaps', icon: GitCompare, highlight: true },
    { name: 'Institutions 360°', path: '/institutions', icon: School },
    { name: 'SLA & Alerts', path: '/alerts', icon: Bell },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { name: 'Data Importer', path: '/import', icon: UploadCloud },
    ...(isAdmin ? [{ name: 'Admin Console', path: '/admin', icon: ShieldCheck }] : []),
    { name: 'System Architecture', path: '/about', icon: Info },
  ];

  return (
    <aside className="w-64 bg-navy-deep text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-navy/40">
      
      {/* Bureau Badge Section */}
      <div className="p-4 border-b border-white/10">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-saffron">
            Single-Window Cell
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-bold text-white tracking-tight">
              {user?.bureau ? `${user.bureau.name} (${user.bureau.code})` : 'AICTE Central Headquarters'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {user?.designation || 'All Bureau View Active'}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-navy text-white shadow-sm font-semibold border-l-4 border-saffron'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                item.highlight ? 'text-saffron' : 'text-slate-400 group-hover:text-white'
              }`} />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Role Principle Reminder */}
      <div className="p-4 border-t border-white/10 bg-black/20 text-[11px] text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300">Coordination Principle:</p>
        <p className="leading-relaxed">
          AICTE single-window view allows all bureaus to see case history. Overlap flags require officer confirmation.
        </p>
      </div>

    </aside>
  );
};
