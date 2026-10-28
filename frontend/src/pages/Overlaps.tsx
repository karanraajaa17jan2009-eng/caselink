import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  GitCompare, CheckCircle2, XCircle, AlertTriangle, Filter, 
  ArrowRightLeft, Sparkles, RefreshCw, ArrowUpRight, Check, X
} from 'lucide-react';
import { api } from '../lib/api';
import { CaseLink, Bureau, Region } from '../lib/types';
import { BureauChip, ScoreBar } from '../components/common/ChipsAndBars';
import { EvidenceList } from '../components/common/EvidenceAndSla';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const Overlaps: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'SUGGESTED' | 'CONFIRMED' | 'REJECTED'>('SUGGESTED');
  const [bandFilter, setBandFilter] = useState<string>('');
  const [bureauFilter, setBureauFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('');

  const [overlaps, setOverlaps] = useState<CaseLink[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Modal review state
  const [reviewModalLink, setReviewModalLink] = useState<CaseLink | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'CONFIRM' | 'REJECT'>('CONFIRM');
  const [reviewRemark, setReviewRemark] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Fetch stats and lookups
  useEffect(() => {
    async function fetchMeta() {
      try {
        const [statsRes, burRes, regRes] = await Promise.all([
          api.get('/overlaps/stats'),
          api.get<Bureau[]>('/bureaus'),
          api.get<Region[]>('/regions')
        ]);
        setStats(statsRes);
        setBureaus(burRes);
        setRegions(regRes);
      } catch (err) {
        console.error(err);
      }
    }
    fetchMeta();
  }, []);

  // Fetch overlap list
  const fetchOverlaps = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', activeTab);
      if (bandFilter) params.append('band', bandFilter);
      if (bureauFilter) params.append('bureau_id', bureauFilter);
      if (regionFilter) params.append('region_id', regionFilter);

      const res = await api.get<CaseLink[]>(`/overlaps?${params.toString()}`);
      setOverlaps(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverlaps();
  }, [activeTab, bandFilter, bureauFilter, regionFilter]);

  // Handle Review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalLink) return;
    setIsSubmittingReview(true);
    try {
      await api.post(`/overlaps/${reviewModalLink.id}/review`, {
        decision: reviewDecision,
        remark: reviewRemark
      });
      setReviewModalLink(null);
      setReviewRemark('');
      // Refresh list & stats
      fetchOverlaps();
      const updatedStats = await api.get('/overlaps/stats');
      setStats(updatedStats);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      const res = await api.post('/overlaps/scan');
      alert(`Overlap scan complete! New links created: ${res.scan_results.new_links}`);
      fetchOverlaps();
      const updatedStats = await api.get('/overlaps/stats');
      setStats(updatedStats);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-navy">Cross-Bureau Overlap Review Centre</h1>
            <span className="text-xs bg-saffron text-white font-bold px-2 py-0.5 rounded">
              SIH Core Innovation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent RapidFuzz + Semantic Similarity engine. AICTE alerts are recommendations — authorized officers confirm or reject.
          </p>
        </div>

        <button
          onClick={handleTriggerScan}
          disabled={isScanning}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy-light shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning All Cases...' : 'Trigger Full Overlap Scan'}</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Suggested (Pending Review)</span>
          <p className="text-xl font-bold text-saffron mt-0.5">{stats?.suggested ?? 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Confirmed Coordination Links</span>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{stats?.confirmed ?? 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase">High Confidence Band</span>
          <p className="text-xl font-bold text-red-600 mt-0.5">{stats?.high_band ?? 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Possible Confidence Band</span>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{stats?.possible_band ?? 0}</p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          
          {/* Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('SUGGESTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SUGGESTED'
                  ? 'bg-saffron text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Suggested ({stats?.suggested ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('CONFIRMED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'CONFIRMED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Confirmed Links ({stats?.confirmed ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'REJECTED'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Dismissed / Not Related ({stats?.rejected ?? 0})
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 text-xs">
            <select
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
            >
              <option value="">All Confidence Bands</option>
              <option value="HIGH">HIGH (≥ 80%)</option>
              <option value="POSSIBLE">POSSIBLE (60–80%)</option>
            </select>

            <select
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
            >
              <option value="">All Bureaus</option>
              {bureaus.map(b => (
                <option key={b.id} value={b.id}>{b.code}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Overlap Cards List */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Analyzing cross-bureau overlap pairs...
        </div>
      ) : overlaps.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          No overlap items match the selected tab and filters.
        </div>
      ) : (
        <div className="space-y-4">
          {overlaps.map((link) => (
            <div
              key={link.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Institution header */}
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-navy">{link.institution_name}</span>
                  <span className="font-mono text-xs text-slate-500">({link.institution_permanent_id})</span>
                  {link.institution_id && (
                    <Link
                      to={`/institutions/${link.institution_id}`}
                      className="text-xs text-navy font-semibold hover:underline inline-flex items-center space-x-0.5"
                    >
                      <span>360° Profile</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="w-36">
                    <ScoreBar score={link.score} band={link.confidence_band} />
                  </div>

                  {activeTab === 'SUGGESTED' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setReviewModalLink(link);
                          setReviewDecision('CONFIRM');
                        }}
                        className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 shadow-sm flex items-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Link</span>
                      </button>
                      <button
                        onClick={() => {
                          setReviewModalLink(link);
                          setReviewDecision('REJECT');
                        }}
                        className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300 flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Not Related</span>
                      </button>
                    </div>
                  )}

                  {activeTab !== 'SUGGESTED' && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      link.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {link.status} by {link.reviewed_by || 'Officer'}
                    </span>
                  )}
                </div>
              </div>

              {/* Side-by-Side Comparison: Case A vs Case B */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Case A */}
                <div className="md:col-span-5 bg-blue-50/40 p-4 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <BureauChip code={link.case_a.bureau_code} />
                      <Link to={`/cases/${link.case_a.id}`} className="font-bold text-xs text-navy hover:underline">
                        {link.case_a.case_no}
                      </Link>
                    </div>
                    <span className="text-[10px] text-slate-500">Recd: {formatDate(link.case_a.received_date)}</span>
                  </div>

                  <p className="text-xs font-bold text-slate-800">{link.case_a.subject}</p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-blue-100">
                    {link.case_a.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Officer: <strong>{link.case_a.assigned_officer || 'Unassigned'}</strong></span>
                    <span>Status: <strong>{link.case_a.status}</strong></span>
                  </div>
                </div>

                {/* Evidence Middle Column */}
                <div className="md:col-span-2 flex flex-col justify-center space-y-2">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Detection Basis</span>
                    <p className="text-xs font-extrabold text-navy">{Math.round(link.score * 100)}% Match</p>
                    <p className="text-[10px] text-slate-500">{link.evidence.days_apart} days apart</p>
                  </div>
                </div>

                {/* Case B */}
                <div className="md:col-span-5 bg-amber-50/40 p-4 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <BureauChip code={link.case_b.bureau_code} />
                      <Link to={`/cases/${link.case_b.id}`} className="font-bold text-xs text-navy hover:underline">
                        {link.case_b.case_no}
                      </Link>
                    </div>
                    <span className="text-[10px] text-slate-500">Recd: {formatDate(link.case_b.received_date)}</span>
                  </div>

                  <p className="text-xs font-bold text-slate-800">{link.case_b.subject}</p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-amber-100">
                    {link.case_b.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Officer: <strong>{link.case_b.assigned_officer || 'Unassigned'}</strong></span>
                    <span>Status: <strong>{link.case_b.status}</strong></span>
                  </div>
                </div>

              </div>

              {/* Evidence details accordion */}
              <div className="px-5 pb-4">
                <EvidenceList evidence={link.evidence} />
                {link.review_remark && (
                  <p className="text-xs text-slate-600 mt-2 bg-slate-100 p-2 rounded-lg italic">
                    Officer Review Remark: "{link.review_remark}"
                  </p>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {reviewDecision === 'CONFIRM' ? 'Confirm Coordination Link' : 'Dismiss / Mark as Not Related'}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              {reviewDecision === 'CONFIRM'
                ? `Confirming this relationship between ${reviewModalLink.case_a.case_no} and ${reviewModalLink.case_b.case_no} will add an immutable "Linked" action to both case timelines and notify both bureaus.`
                : `Dismissing will remove this pair from the active coordination queue without altering case statuses.`}
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Regulatory Remark / Justification
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                  placeholder="Enter coordination directive or dismissal rationale..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalLink(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className={`px-4 py-1.5 text-white text-xs font-bold rounded-lg shadow ${
                    reviewDecision === 'CONFIRM' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewDecision === 'CONFIRM' ? 'Confirm Coordination' : 'Dismiss Overlap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
