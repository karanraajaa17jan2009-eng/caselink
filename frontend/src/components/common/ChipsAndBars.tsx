import React from 'react';
import { getStatusBadgeStyle, getBureauBadgeStyle, getPriorityStyle } from '../../lib/utils';

export const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeStyle(status)}`}>
      {status}
    </span>
  );
};

export const BureauChip: React.FC<{ code?: string }> = ({ code }) => {
  if (!code) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getBureauBadgeStyle(code)}`}>
      {code}
    </span>
  );
};

export const PriorityDot: React.FC<{ priority: string }> = ({ priority }) => {
  const style = getPriorityStyle(priority);
  return (
    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span>{priority}</span>
    </span>
  );
};

export const ScoreBar: React.FC<{ score: number; band: 'HIGH' | 'POSSIBLE' | 'LOW' }> = ({ score, band }) => {
  const percentage = Math.round(score * 100);
  const isHigh = band === 'HIGH';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold ${isHigh ? 'text-saffron' : 'text-amber-600'}`}>
          {isHigh ? 'HIGH (Coordination Required)' : 'POSSIBLE (Review)'}
        </span>
        <span className="font-bold text-slate-800">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isHigh ? 'bg-gradient-to-r from-saffron to-red-500' : 'bg-gradient-to-r from-amber-400 to-saffron'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
