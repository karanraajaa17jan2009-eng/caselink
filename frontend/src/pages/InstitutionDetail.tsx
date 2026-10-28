import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building, MapPin, Mail, Phone, Calendar, AlertTriangle, 
  Clock, CheckCircle, Shield, ArrowUpRight, History, Layers,
  FileText, ExternalLink
} from 'lucide-react';
import { api } from '../lib/api';
import { Institution, ComplaintCase } from '../lib/types';
import { StatusChip, BureauChip, PriorityDot, ScoreBar } from '../components/common/ChipsAndBars';
import { formatDate, formatDateTime } from '../lib/utils';

export const InstitutionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<'cases' | 'timeline' | 'overlaps' | 'details'>('cases');
  const [profileData, setProfileData] = useState<any | null>(null);
  const [cases, setCases] = useState<ComplaintCase[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const [pRes, cRes, tRes] = await Promise.all([
        api.get(`/institutions/${id}`),
        api.get(`/institutions/${id}/cases`),
        api.get(`/institutions/${id}/timeline`)
      ]);
      setProfileData(pRes);
      setCases(cRes);
      setTimeline(tRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  if (isLoading || !profileData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Generating Institution 360° Consolidated Profile...
      </div>
    );
  }

  const inst: Institution = profileData.institution;
  const kpis = profileData.kpis;
  const activeOverlaps = profileData.active_overlaps || [];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner / Institution 360 Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                AICTE ID: {inst.permanent_id}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                inst.approval_status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                Status: {inst.approval_status}
              </span>
              {kpis.is_repeat_complaints && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                  ⚠ High Repeat Complaint Frequency
                </span>
              )}
              {kpis.multi_bureau_jurisdiction && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  Multi-Bureau Jurisdiction Active
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-navy tracking-tight">{inst.name}</h1>
            
            <p className="text-xs text-slate-500 flex items-center space-x-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{inst.address}, {inst.district}, {inst.state} - {inst.pincode}</span>
            </p>
          </div>

          {/* Bureaus currently handling */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 shrink-0 text-left">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Bureaus Handling Active Open Cases:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {kpis.handling_bureaus.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No active open cases</span>
              ) : (
                kpis.handling_bureaus.map((b: string) => (
                  <BureauChip key={b} code={b} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Overlap Banner if active */}
        {activeOverlaps.length > 0 && (
          <div className="p-3 bg-amber-50 border border-saffron rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-amber-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-saffron shrink-0" />
              <span>
                <strong>{activeOverlaps.length} Cross-Bureau Overlap Link(s)</strong> detected for this institution across different divisions.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('overlaps')}
              className="text-xs font-bold text-saffron-hover hover:underline"
            >
              View Overlaps &rarr;
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block font-semibold uppercase text-[10px]">Total Cases Handled</span>
            <span className="text-xl font-bold text-slate-900">{kpis.total_cases}</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-blue-600 block font-semibold uppercase text-[10px]">Open Under Process</span>
            <span className="text-xl font-bold text-blue-900">{kpis.open_cases}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-emerald-600 block font-semibold uppercase text-[10px]">Formally Disposed</span>
            <span className="text-xl font-bold text-emerald-900">{kpis.disposed_cases}</span>
          </div>
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <span className="text-red-600 block font-semibold uppercase text-[10px]">SLA Overdue</span>
            <span className="text-xl font-bold text-red-700">{kpis.overdue_cases}</span>
          </div>
        </div>

      </div>

      {/* Tabs Header */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('cases')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'cases' ? 'border-navy text-navy' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Complaints Register ({cases.length})
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'timeline' ? 'border-navy text-navy' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Unified Cross-Bureau Timeline ({timeline.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overlaps')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'overlaps' ? 'border-navy text-navy' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-saffron" />
          <span>Overlaps ({activeOverlaps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'details' ? 'border-navy text-navy' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Regulatory Master Details
        </button>
      </div>

      {/* Tab 1: All Complaints */}
      {activeTab === 'cases' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Case No</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Bureau</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Received Date</th>
                  <th className="p-3">SLA Status</th>
                  <th className="p-3 text-right">Docket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-navy font-mono">
                      <Link to={`/cases/${c.id}`} className="hover:underline">
                        {c.case_no}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-700">{c.category}</td>
                    <td className="p-3 text-slate-600 max-w-sm truncate">{c.subject}</td>
                    <td className="p-3"><BureauChip code={c.current_bureau as any} /></td>
                    <td className="p-3"><StatusChip status={c.status} /></td>
                    <td className="p-3 text-slate-500">{formatDate(c.received_date)}</td>
                    <td className="p-3">
                      {c.is_overdue ? (
                        <span className="text-red-600 font-bold">Overdue SLA</span>
                      ) : c.status === 'Disposed' ? (
                        <span className="text-emerald-600 font-semibold">Disposed</span>
                      ) : (
                        <span className="text-slate-600">{c.days_to_due}d left</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Link to={`/cases/${c.id}`} className="text-navy hover:underline font-semibold inline-flex items-center space-x-1">
                        <span>Open</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Unified Cross-Bureau Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Unified Cross-Bureau Regulatory Timeline</h3>
            <p className="text-xs text-slate-500">
              Chronological sequence of all notices, inquiries, hearings, and orders executed by any AICTE Bureau on this institution.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 pt-2">
            {timeline.map((act) => (
              <div key={act.id} className="relative space-y-1">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-white border-2 border-navy" />
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-navy font-mono">{act.case_no}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-bold text-slate-900">{act.action_type}</span>
                    {act.from_bureau && (
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.2 rounded">
                        {act.from_bureau} &rarr; {act.to_bureau}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{formatDateTime(act.created_at)}</span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {act.remarks}
                </p>

                <div className="text-[10px] text-slate-400">
                  Authorized Signatory: <strong>{act.performed_by}</strong> ({act.performed_by_role || 'Officer'})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Overlaps */}
      {activeTab === 'overlaps' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Overlap Links</h3>
            <p className="text-xs text-slate-500">Pairs of cases flagged for potential coordination across bureaus.</p>
          </div>

          <div className="space-y-3">
            {activeOverlaps.map((link: any) => (
              <div key={link.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-navy">{link.case_a_no}</span>
                    <span className="text-slate-400 font-bold">&harr;</span>
                    <span className="font-bold text-navy">{link.case_b_no}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    link.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {link.status}
                  </span>
                </div>

                <div className="w-48">
                  <ScoreBar score={link.score} band={link.confidence_band} />
                </div>

                <ul className="text-xs text-slate-600 list-disc pl-5">
                  {link.reasons.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Details */}
      {activeTab === 'details' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">AICTE Regulatory Registration Master</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Institution Type</span>
              <p className="font-bold text-slate-800">{inst.institution_type}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Management Category</span>
              <p className="font-bold text-slate-800">{inst.management_type}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Established Year</span>
              <p className="font-bold text-slate-800">{inst.established_year || 'N/A'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Regional Office</span>
              <p className="font-bold text-slate-800">{inst.region?.name || 'N/A'} ({inst.region?.office_city})</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Official Email</span>
              <p className="font-mono text-slate-800">{inst.email || 'registrar@aicte-campus.edu.in'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Landline / Helpdesk</span>
              <p className="font-mono text-slate-800">{inst.phone || '+91 11 29581000'}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
