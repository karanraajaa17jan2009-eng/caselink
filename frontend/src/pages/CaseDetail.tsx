import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Building, Clock, FileText, User, ArrowLeft, Send, AlertTriangle, 
  ArrowRightLeft, ShieldAlert, CheckCircle, RotateCcw, Download,
  Paperclip, Plus, Calendar, MapPin
} from 'lucide-react';
import { api } from '../lib/api';
import { ComplaintCase, Bureau, CaseAction } from '../lib/types';
import { StatusChip, BureauChip, PriorityDot, ScoreBar } from '../components/common/ChipsAndBars';
import { SlaRing, EvidenceList } from '../components/common/EvidenceAndSla';
import { formatDate, formatDateTime } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<any | null>(null);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showActionModal, setShowActionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showDisposeModal, setShowDisposeModal] = useState(false);

  // Form states for modals
  const [actionType, setActionType] = useState('Inquiry Initiated');
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionNext, setActionNext] = useState('');
  const [actionFile, setActionFile] = useState<File | null>(null);

  const [transferBureauId, setTransferBureauId] = useState<string>('');
  const [transferRemarks, setTransferRemarks] = useState('');

  const [escalateReason, setEscalateReason] = useState('');
  const [disposeRemark, setDisposeRemark] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/cases/${id}`);
      setData(res);
      const bRes = await api.get<Bureau[]>('/bureaus');
      setBureaus(bRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (isLoading || !data) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading case docket and cross-bureau timeline...
      </div>
    );
  }

  const c: ComplaintCase = data.case;
  const actions: CaseAction[] = data.actions || [];
  const overlaps = data.overlaps || [];

  // Handlers for action modals
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('action_type', actionType);
      formData.append('remarks', actionRemarks);
      if (actionNext) formData.append('next_action', actionNext);
      if (actionFile) formData.append('file', actionFile);

      await api.post(`/cases/${c.id}/actions`, formData);
      setShowActionModal(false);
      setActionRemarks('');
      setActionFile(null);
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferBureauId) return;
    setIsSubmitting(true);
    try {
      await api.post(`/cases/${c.id}/transfer`, {
        to_bureau_id: Number(transferBureauId),
        remarks: transferRemarks
      });
      setShowTransferModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/cases/${c.id}/escalate`, {
        reason: escalateReason
      });
      setShowEscalateModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/cases/${c.id}/dispose`, {
        remark: disposeRemark
      });
      setShowDisposeModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!confirm('Reopen this complaint case for further inquiry?')) return;
    try {
      await api.post(`/cases/${c.id}/reopen`);
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xl font-extrabold text-navy">{c.case_no}</span>
                <StatusChip status={c.status} />
                <PriorityDot priority={c.priority} />
                <BureauChip code={c.current_bureau?.code} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Received via {c.source} on {formatDate(c.received_date)} ({c.age_days} days elapsed)
              </p>
            </div>
          </div>

          {/* Right SLA countdown */}
          <div className="flex items-center space-x-3">
            <SlaRing daysToDue={c.days_to_due || 0} isOverdue={c.is_overdue || false} />
          </div>
        </div>

        {/* Action Bar (Authorized Officers Only) */}
        {c.can_modify && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Case Operations:
            </span>
            <button
              onClick={() => setShowActionModal(true)}
              className="px-3 py-1.5 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy-light shadow-sm flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Action / Notice</span>
            </button>

            {c.status !== 'Disposed' ? (
              <>
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg hover:bg-purple-100 flex items-center space-x-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer Bureau</span>
                </button>
                <button
                  onClick={() => setShowEscalateModal(true)}
                  className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-100 flex items-center space-x-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Escalate to Hearing</span>
                </button>
                <button
                  onClick={() => setShowDisposeModal(true)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg hover:bg-emerald-100 flex items-center space-x-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Dispose Complaint</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleReopen}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-lg hover:bg-amber-100 flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Case</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3-Column Layout: Left Summary | Center Timeline | Right Overlaps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (4 cols): Institution profile & Complainant details */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Institution Summary Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Target Institution</span>
              {c.institution && (
                <Link
                  to={`/institutions/${c.institution.id}`}
                  className="text-xs text-navy font-bold hover:underline"
                >
                  Institution 360° &rarr;
                </Link>
              )}
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-800">
                {c.institution?.name || c.raw_institution_name || 'Unresolved Name'}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                AICTE Permanent ID: {c.institution?.permanent_id || c.raw_permanent_id || 'Not specified'}
              </p>
              {c.institution && (
                <p className="text-xs text-slate-600 mt-1 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.institution.district}, {c.institution.state}</span>
                </p>
              )}
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Resolver Confidence:</span>
                <span className="font-bold text-slate-800">{Math.round(c.match_confidence * 100)}%</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Approval Status:</span>
                <span className="font-semibold text-emerald-700">{c.institution?.approval_status || 'Under Scrutiny'}</span>
              </div>
            </div>
          </div>

          {/* Grievance Narrative Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block border-b border-slate-100 pb-2">
              Grievance Narrative
            </span>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Category:</span>
              <p className="text-xs font-bold text-navy mt-0.5">{c.category}</p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Subject:</span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">{c.subject}</p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Complainant Statement:</span>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                {c.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs space-y-1 text-slate-500">
              <p>Complainant: <strong>{c.complainant_name || 'Anonymous'}</strong> ({c.complainant_type})</p>
              {c.complainant_email && <p>Email: {c.complainant_email}</p>}
            </div>
          </div>

        </div>

        {/* Center Column (5 cols): Action Timeline */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-navy" />
                <h3 className="text-sm font-bold text-slate-900">Regulatory Action History ({actions.length})</h3>
              </div>
              <span className="text-[11px] text-slate-400">Chronological Audit Log</span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {actions.map((act) => (
                <div key={act.id} className="relative space-y-1">
                  {/* Dot */}
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-white border-2 border-navy" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{act.action_type}</span>
                    <span className="text-[10px] text-slate-400">{formatDateTime(act.created_at)}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {act.remarks}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>By: {act.performed_by}</span>
                    {act.from_bureau && (
                      <span>Bureau: {act.from_bureau} &rarr; {act.to_bureau}</span>
                    )}
                  </div>

                  {act.document_name && (
                    <div className="mt-1">
                      <a
                        href={act.document_path || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-[11px] text-navy font-semibold hover:underline"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span>{act.document_name}</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (3 cols): Overlaps & Linked Cases */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <AlertTriangle className="w-4 h-4 text-saffron" />
              <h3 className="text-sm font-bold text-slate-900">Linked Overlaps ({overlaps.length})</h3>
            </div>

            {overlaps.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No overlapping complaints identified for this docket.
              </p>
            ) : (
              <div className="space-y-3">
                {overlaps.map((ov: any) => (
                  <div key={ov.link_id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-navy">{ov.other_case.case_no}</span>
                      <BureauChip code={ov.other_case.bureau} />
                    </div>

                    <ScoreBar score={ov.score} band={ov.confidence_band} />

                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {ov.other_case.subject}
                    </p>

                    <EvidenceList evidence={ov.evidence} />

                    <Link
                      to={`/cases/${ov.other_case.id}`}
                      className="block text-center text-xs text-navy font-bold hover:underline pt-1"
                    >
                      Inspect Counterpart Case &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal 1: Add Action */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Record Regulatory Action / Show-Cause</h3>
            
            <form onSubmit={handleAddAction} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="Inquiry Initiated">Inquiry Initiated</option>
                  <option value="Notice Issued">Notice Issued (Show-Cause)</option>
                  <option value="Reply Received">Reply Received from Principal</option>
                  <option value="Inspection Ordered">Inspection Ordered (Regional Office)</option>
                  <option value="Remark Added">Remark / Internal Observation Added</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Official Remarks</label>
                <textarea
                  required
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Enter detailed action remarks or direction given..."
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Next Expected Action</label>
                <input
                  type="text"
                  value={actionNext}
                  onChange={(e) => setActionNext(e.target.value)}
                  placeholder="e.g. Awaiting reply within 15 days"
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Upload Document (PDF/JPG/PNG)</label>
                <input
                  type="file"
                  onChange={(e) => setActionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-navy text-white text-xs font-semibold rounded-lg"
                >
                  Save Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Transfer Bureau */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Transfer Complaint Jurisdiction</h3>
            <p className="text-xs text-slate-500">
              Shift jurisdiction to another bureau or cell. An alert will be triggered immediately for the target division.
            </p>

            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Bureau/Cell</label>
                <select
                  required
                  value={transferBureauId}
                  onChange={(e) => setTransferBureauId(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="">Select Destination Bureau</option>
                  {bureaus.filter(b => b.id !== c.current_bureau_id).map(b => (
                    <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Transfer Grounds</label>
                <textarea
                  required
                  rows={3}
                  value={transferRemarks}
                  onChange={(e) => setTransferRemarks(e.target.value)}
                  placeholder="State reason for inter-bureau transfer..."
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-purple-700 text-white text-xs font-semibold rounded-lg"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Escalate */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Escalate to Senior Hearing Authority</h3>
            <p className="text-xs text-slate-500">
              Escalates priority to Critical and notifies the Member Secretary & Standing Hearing Committee.
            </p>

            <form onSubmit={handleEscalate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Escalation Justification</label>
                <textarea
                  required
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Specify non-compliance severity, repeat offense, or urgent regulatory breach..."
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg"
                >
                  Confirm Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Dispose */}
      {showDisposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Mark Complaint as Formally Disposed</h3>

            <form onSubmit={handleDispose} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Disposal Order / Final Remark</label>
                <textarea
                  required
                  rows={3}
                  value={disposeRemark}
                  onChange={(e) => setDisposeRemark(e.target.value)}
                  placeholder="Enter resolution summary, committee decision, compliance report date..."
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisposeModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
                >
                  Finalize Disposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
