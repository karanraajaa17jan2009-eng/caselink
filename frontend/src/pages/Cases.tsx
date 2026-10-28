import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Filter, Download, PlusCircle, ArrowUpDown, Clock, 
  AlertTriangle, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';
import { ComplaintCase, Bureau, Region } from '../lib/types';
import { StatusChip, BureauChip, PriorityDot } from '../components/common/ChipsAndBars';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const Cases: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canCreateCase } = useAuth();

  // Search and filter states
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [bureauId, setBureauId] = useState(searchParams.get('bureau_id') || '');
  const [regionId, setRegionId] = useState(searchParams.get('region_id') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [overlapOnly, setOverlapOnly] = useState(searchParams.get('has_overlap') === 'true');

  const [sortBy, setSortBy] = useState('received_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Lookups & Data
  const [cases, setCases] = useState<ComplaintCase[]>([]);
  const [total, setTotal] = useState(0);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load lookups
  useEffect(() => {
    async function fetchLookups() {
      try {
        const [burData, regData] = await Promise.all([
          api.get<Bureau[]>('/bureaus'),
          api.get<Region[]>('/regions')
        ]);
        setBureaus(burData);
        setRegions(regData);
      } catch (err) {
        console.error('Error fetching lookups', err);
      }
    }
    fetchLookups();
  }, []);

  // Fetch cases
  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (bureauId) params.append('bureau_id', bureauId);
      if (regionId) params.append('region_id', regionId);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (overdueOnly) params.append('overdue', 'true');
      if (overlapOnly) params.append('has_overlap', 'true');
      params.append('sort_by', sortBy);
      params.append('sort_dir', sortDir);
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      const res = await api.get(`/cases?${params.toString()}`);
      setCases(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Error fetching cases', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, pageSize, sortBy, sortDir, bureauId, regionId, category, status, priority, overdueOnly, overlapOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCases();
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (bureauId) params.append('bureau_id', bureauId);
    if (status) params.append('status', status);
    if (category) params.append('category', category);
    window.open(`/api/cases/export.csv?${params.toString()}`, '_blank');
  };

  const categoriesList = [
    "Unapproved/Unauthorized Courses",
    "Admission Irregularities",
    "Excess/Illegal Fee Collection",
    "Faculty Shortage / Qualification",
    "Infrastructure Deficiency",
    "Fake Affiliation / Approval Claims",
    "Withholding of Certificates / Documents",
    "Harassment / Ragging",
    "Salary/Service Matters of Faculty",
    "Closure of Institution / Student Transfer",
    "Mandatory Disclosure Violation",
    "Other"
  ];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header and New Case button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy">National Complaint Register</h1>
          <p className="text-xs text-slate-500">
            Consolidated record of all institution complaints across AICTE Bureaus, Cells, and Regional Offices.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {canCreateCase && (
            <Link
              to="/cases/new"
              className="flex items-center space-x-1.5 px-4 py-2 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-lg shadow transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Complaint</span>
            </Link>
          )}
        </div>
      </div>

      {/* Advanced Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search case no, subject, institution name, or AICTE ID..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-navy-light transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100 text-xs">
          {/* Bureau Filter */}
          <select
            value={bureauId}
            onChange={(e) => { setBureauId(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="">All Bureaus</option>
            {bureaus.map(b => (
              <option key={b.id} value={b.id}>{b.code} ({b.name})</option>
            ))}
          </select>

          {/* Region Filter */}
          <select
            value={regionId}
            onChange={(e) => { setRegionId(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="">All Regions</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.office_city})</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none max-w-xs truncate"
          >
            <option value="">All Categories</option>
            {categoriesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Under Process">Under Process</option>
            <option value="Pending">Pending</option>
            <option value="Transferred">Transferred</option>
            <option value="Escalated">Escalated</option>
            <option value="Disposed">Disposed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Overdue Toggle Button */}
          <button
            type="button"
            onClick={() => { setOverdueOnly(!overdueOnly); setPage(1); }}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center space-x-1 transition-colors ${
              overdueOnly ? 'bg-red-50 border-red-300 text-red-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Overdue SLA Only</span>
          </button>

          {/* Overlap Toggle Button */}
          <button
            type="button"
            onClick={() => { setOverlapOnly(!overlapOnly); setPage(1); }}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center space-x-1 transition-colors ${
              overlapOnly ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>With Overlaps Only</span>
          </button>

        </div>

      </div>

      {/* Case Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="p-3">Case Details</th>
                <th className="p-3">Institution & AICTE ID</th>
                <th className="p-3">Category</th>
                <th className="p-3">Bureau</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">SLA / Due Date</th>
                <th className="p-3">Assigned Officer</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading complaint records...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No complaints match the specified search and filter criteria.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    {/* Case details & badges */}
                    <td className="p-3 font-medium">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-navy text-xs group-hover:underline">
                          {c.case_no}
                        </span>
                        {/* Overlap badge */}
                        {(c.overlap_count ?? 0) > 0 && (
                          <span
                            title="Cross-Bureau Overlap Flagged"
                            className="bg-saffron/15 text-saffron-hover border border-saffron/30 text-[10px] font-bold px-1.5 py-0.2 rounded"
                          >
                            ⚠ Overlap
                          </span>
                        )}
                        {/* Overdue badge */}
                        {c.is_overdue && (
                          <span
                            title="Regulatory SLA Breached"
                            className="bg-red-100 text-red-700 border border-red-300 text-[10px] font-bold px-1.5 py-0.2 rounded animate-pulse"
                          >
                            ⏰ Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 truncate max-w-xs mt-0.5" title={c.subject}>
                        {c.subject}
                      </p>
                      <span className="text-[10px] text-slate-400">Recd: {formatDate(c.received_date)} ({c.age_days}d ago)</span>
                    </td>

                    {/* Institution */}
                    <td className="p-3">
                      <p className="font-semibold text-slate-800 line-clamp-1">
                        {c.institution?.name || c.raw_institution_name || 'Unmapped Institution'}
                      </p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {c.institution?.permanent_id || c.raw_permanent_id || 'ID Pending'}
                      </p>
                      {c.institution && (
                        <p className="text-[10px] text-slate-500">{c.institution.district}, {c.institution.state}</p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-3">
                      <span className="text-slate-700 font-medium line-clamp-1 max-w-[140px]" title={c.category}>
                        {c.category}
                      </span>
                    </td>

                    {/* Bureau */}
                    <td className="p-3">
                      <BureauChip code={c.current_bureau?.code} />
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <StatusChip status={c.status} />
                    </td>

                    {/* Priority */}
                    <td className="p-3">
                      <PriorityDot priority={c.priority} />
                    </td>

                    {/* Due Date & SLA countdown */}
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span className="text-slate-700">{formatDate(c.due_date)}</span>
                        {c.status !== 'Disposed' && (
                          <p className={`text-[10px] font-semibold ${
                            c.is_overdue ? 'text-red-600' : (c.days_to_due ?? 0) <= 5 ? 'text-amber-600' : 'text-slate-400'
                          }`}>
                            {c.is_overdue
                              ? `${Math.abs(c.days_to_due || 0)}d overdue`
                              : `${c.days_to_due}d remaining`}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Assigned Officer */}
                    <td className="p-3 text-slate-600">
                      {c.assigned_officer?.name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>

                    {/* Action link */}
                    <td className="p-3 text-right">
                      <span className="text-navy group-hover:translate-x-1 inline-block transition-transform">
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong>{cases.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong>{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong> complaints
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong>
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
