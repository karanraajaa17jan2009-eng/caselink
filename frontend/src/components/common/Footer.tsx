import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-3 px-6 text-xs text-slate-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">AICTE CASELINK</span>
          <span>·</span>
          <span>Regulation Bureau, All India Council for Technical Education</span>
        </div>

        {/* Demo Ribbon */}
        <div className="flex items-center space-x-2">
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300 tracking-wider">
            SAMPLE DATA – DEMO ENVIRONMENT
          </span>
          <span className="text-[11px] text-slate-400">
            SIH 2026 · PS 26264 · Team Tech Spartans
          </span>
        </div>
      </div>
    </footer>
  );
};
