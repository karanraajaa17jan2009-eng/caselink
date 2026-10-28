import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, 
  Layers, Shield, ArrowRight, Sparkles
} from 'lucide-react';

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: "1. AICTE Single-Window Command Centre",
      role: "Public Grievance Redressal Cell (PGRC) & Regulation Bureau",
      description: "Welcome to AICTE CASELINK! For Problem Statement 26264, all 8 AICTE Bureaus and Cells now share one unified view. Notice the top KPI cards showing active complaints across India, overdue regulatory breaches, and automatic cross-bureau overlaps flagged without manual searching.",
      actionLabel: "View Overlap Engine",
      action: () => navigate('/overlaps')
    },
    {
      title: "2. Cross-Bureau Overlap Detection",
      role: "Coordination Engine (RapidFuzz + Semantic Weights)",
      description: "Here in the Overlap Review Centre, the system flagged simultaneous cases opened at PGRC and Regulation Bureau (RB) on the exact same institution with different wording and case numbers. Notice the explainable evidence card: shared keywords, score band, and zero auto-merging.",
      actionLabel: "Compare Case A & B",
      action: () => navigate('/overlaps')
    },
    {
      title: "3. Officer Coordination & Link Confirmation",
      role: "Human-in-the-Loop Governance",
      description: "Clicking 'Confirm Link' validates the relationship. Instantly, an immutable 'Linked' action is registered in both case histories, and a high-priority notification is dispatched to both bureaus to prevent contradictory orders or duplicated inspections.",
      actionLabel: "Explore Institution 360°",
      action: () => navigate('/institutions')
    },
    {
      title: "4. Institution 360° Unified Cross-Bureau Timeline",
      role: "Single Source of Truth",
      description: "Every institution has an 'Institution 360°' profile. The unified timeline merges chronological notices, show-cause orders, regional office inquiries, and grievance replies from RB, PGRC, Approval, and Legal into one consolidated stream.",
      actionLabel: "Test Fuzzy Resolution & Precheck",
      action: () => navigate('/cases/new')
    },
    {
      title: "5. Fuzzy Resolution & Pre-Registration Warning",
      role: "Smart Ingestion Shield",
      description: "When an officer enters a complaint with misspelled institution names (e.g. 'SVIET Nellore') or missing AICTE IDs, CASELINK's fuzzy engine maps it accurately and alerts the officer of existing active cases BEFORE saving, stopping duplicate dockets at the source.",
      actionLabel: "View Regulatory Reports",
      action: () => {
        navigate('/reports');
        onClose();
      }
    }
  ];

  const step = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 tour-overlay">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-navy to-navy-deep px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-saffron" />
            <h3 className="font-bold text-sm tracking-wide">SIH 2026 Presentation Tour</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-saffron uppercase tracking-wider bg-saffron/10 px-2 py-0.5 rounded border border-saffron/20">
              Step {currentStep + 1} of {tourSteps.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">{step.role}</span>
          </div>

          <h4 className="text-lg font-bold text-slate-900">{step.title}</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>

          {/* Progress dots */}
          <div className="flex items-center space-x-1.5 pt-2">
            {tourSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-8 bg-navy' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg ${
              currentStep === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-2">
            {step.action && (
              <button
                onClick={() => {
                  step.action();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-navy bg-navy/10 hover:bg-navy/20 rounded-lg transition-colors"
              >
                {step.actionLabel}
              </button>
            )}

            {currentStep < tourSteps.length - 1 ? (
              <button
                onClick={() => {
                  if (step.action) step.action();
                  setCurrentStep(prev => prev + 1);
                }}
                className="flex items-center space-x-1 px-4 py-1.5 text-xs font-bold text-white bg-navy hover:bg-navy-light rounded-lg shadow-sm transition-all"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center space-x-1 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                <span>Complete Demo</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
