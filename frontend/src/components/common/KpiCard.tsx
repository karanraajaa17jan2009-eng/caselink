import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'navy' | 'saffron' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'navy',
  onClick
}) => {
  const colorMap = {
    navy: 'border-l-navy text-navy bg-navy/5',
    saffron: 'border-l-saffron text-saffron bg-saffron/10',
    green: 'border-l-emerald-600 text-emerald-600 bg-emerald-50',
    amber: 'border-l-amber-500 text-amber-600 bg-amber-50',
    red: 'border-l-red-600 text-red-600 bg-red-50',
    purple: 'border-l-purple-600 text-purple-600 bg-purple-50',
    slate: 'border-l-slate-400 text-slate-600 bg-slate-50',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 border-l-4 p-4 shadow-sm hover:shadow-md transition-shadow ${colorMap[color]} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
