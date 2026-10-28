import React from 'react';
import { Check, AlertCircle, FileText, Calendar, Building, User } from 'lucide-react';
import { CaseLinkEvidence } from '../../lib/types';

export const EvidenceList: React.FC<{ evidence: CaseLinkEvidence }> = ({ evidence }) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
      <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
        <AlertCircle className="w-4 h-4 text-saffron shrink-0" />
        <span>Detection Evidence & Explanations:</span>
      </div>

      <ul className="space-y-1 text-slate-600 pl-5 list-disc">
        {evidence.reasons.map((reason, idx) => (
          <li key={idx} className="leading-relaxed">{reason}</li>
        ))}
      </ul>

      {evidence.shared_keywords && evidence.shared_keywords.length > 0 && (
        <div className="pt-2 border-t border-slate-200">
          <span className="font-medium text-slate-500">Shared Key Tokens: </span>
          <div className="inline-flex flex-wrap gap-1 mt-1">
            {evidence.shared_keywords.map((kw, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-navy">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SlaRing: React.FC<{ daysToDue: number; isOverdue: boolean }> = ({ daysToDue, isOverdue }) => {
  if (isOverdue) {
    return (
      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Overdue ({Math.abs(daysToDue)}d breach)
        </span>
      </div>
    );
  }

  if (daysToDue <= 5) {
    return (
      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Due Soon ({daysToDue}d left)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-xs font-medium">
        Within SLA ({daysToDue}d left)
      </span>
    </div>
  );
};

export const EmptyState: React.FC<{ title: string; description: string; action?: React.ReactNode }> = ({
  title,
  description,
  action
}) => {
  return (
    <div className="text-center py-12 px-4 bg-white border border-dashed border-slate-300 rounded-xl">
      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">{description}</p>
      {action}
    </div>
  );
};
