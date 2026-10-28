import React from 'react';
import { 
  Shield, GitCompare, Sparkles, Layers, CheckCircle2, 
  ArrowRight, Clock, AlertTriangle, FileText, Database
} from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-navy to-navy-deep text-white p-8 rounded-2xl shadow-lg space-y-3">
        <div className="inline-flex items-center space-x-2 bg-saffron/20 border border-saffron/40 px-3 py-1 rounded-full text-xs font-bold text-saffron">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Smart India Hackathon 2026 · Problem Statement 26264</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">AICTE CASELINK</h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Integrated Institution Complaint Monitoring, Cross-Bureau Overlap Detection & Consolidated History Dashboard for the Regulation Bureau, All India Council for Technical Education.
        </p>
      </div>

      {/* The Core Challenge & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>The Regulatory Challenge</span>
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            AICTE receives thousands of grievances from students, parents, faculty, and stakeholders. Grievances about the exact same institution arrive through disparate channels (CPGRAMS, web portals, physical letters) and land in disconnected bureaus—Regulation Bureau (RB), Public Grievance Redressal Cell (PGRC), Approval Bureau (AB), and Legal Cell.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
            Without a unified window, institutions received conflicting inquiries, bureaus duplicated costly inspections, and regulatory response timelines suffered severe delays.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wide flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>The CASELINK Solution</span>
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            CASELINK delivers a single-window dashboard where authorized officials across all bureaus see all institution-related complaints in one place, observe which division is handling each, track complete cross-bureau movement, and automatically detect overlapping complaints.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-navy font-semibold">
            "Alert is a recommendation — an authorized officer confirms the relationship. Never auto-merge legal dockets."
          </div>
        </div>
      </div>

      {/* 4-Step Operational Flow */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-navy">The 4-Step CASELINK Architecture</h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div className="w-7 h-7 bg-navy text-white rounded-lg flex items-center justify-center font-bold">1</div>
            <h4 className="font-bold text-slate-900">Unify Inputs</h4>
            <p className="text-slate-500 leading-relaxed">
              Standardize complaint ingestion across portal, letters, email, and CPGRAMS with automated AICTE ID resolution.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div className="w-7 h-7 bg-navy text-white rounded-lg flex items-center justify-center font-bold">2</div>
            <h4 className="font-bold text-slate-900">Link Cases</h4>
            <p className="text-slate-500 leading-relaxed">
              Map complaints to the Institution 360° master database using fuzzy abbreviation expansion and geographic validation.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div className="w-7 h-7 bg-saffron text-white rounded-lg flex items-center justify-center font-bold">3</div>
            <h4 className="font-bold text-slate-900">Flag Overlaps</h4>
            <p className="text-slate-500 leading-relaxed">
              Explainable multi-attribute scoring highlights parallel investigations between PGRC, RB, and cells.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold">4</div>
            <h4 className="font-bold text-slate-900">Coordinate</h4>
            <p className="text-slate-500 leading-relaxed">
              Officers review evidence, confirm links, prevent conflicting orders, and track SLA timelines to resolution.
            </p>
          </div>
        </div>
      </div>

      {/* How Matching Engine Works */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-navy flex items-center space-x-2">
          <GitCompare className="w-5 h-5 text-saffron" />
          <span>How the Overlap Engine Computes Scores</span>
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Built using Python's high-speed <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-navy font-bold">rapidfuzz</code> library, the scoring engine operates without expensive GPU models or external paid AI APIs. Each pair is evaluated across 5 weighted dimensions:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">40% Weight</span>
            <p className="font-bold text-navy text-sm mt-1">Institution</p>
            <p className="text-[10px] text-slate-500">AICTE ID & Name match</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">30% Weight</span>
            <p className="font-bold text-navy text-sm mt-1">Text Similarity</p>
            <p className="text-[10px] text-slate-500">Subject + narrative tokens</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">15% Weight</span>
            <p className="font-bold text-navy text-sm mt-1">Category</p>
            <p className="text-[10px] text-slate-500">Identical or related issues</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">10% Weight</span>
            <p className="font-bold text-navy text-sm mt-1">Proximity</p>
            <p className="text-[10px] text-slate-500">Time received closeness</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">5% Weight</span>
            <p className="font-bold text-navy text-sm mt-1">Complainant</p>
            <p className="text-[10px] text-slate-500">Identity overlap match</p>
          </div>
        </div>
      </div>

    </div>
  );
};
