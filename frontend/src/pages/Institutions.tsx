import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building, Search, Filter, MapPin, School, ArrowUpRight,
  AlertTriangle, CheckCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';
import { Institution, Region } from '../lib/types';
import { BureauChip } from '../components/common/ChipsAndBars';

export const Institutions: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [regionId, setRegionId] = useState('');
  const [state, setState] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [hasOpenCases, setHasOpenCases] = useState<boolean | undefined>(undefined);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [total, setTotal] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load regions
  useEffect(() => {
    async function fetchRegions() {
      try {
        const r = await api.get<Region[]>('/regions');
        setRegions(r);
      } catch (err) {
        console.error(err);
      }
    }
    fetchRegions();
  }, []);

  // Fetch institutions
  const fetchInstitutions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (regionId) params.append('region_id', regionId);
      if (state) params.append('state', state);
      if (approvalStatus) params.append('approval_status', approvalStatus);
      if (hasOpenCases !== undefined) params.append('has_open_cases', String(hasOpenCases));
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      const res = await api.get(`/institutions?${params.toString()}`);
      setInstitutions(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, [page, regionId, state, approvalStatus, hasOpenCases]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInstitutions();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-navy">Approved Institutions Directory</h1>
        <p className="text-xs text-slate-500">
          Integrated institution repository with active cross-bureau complaint monitoring and 360° history.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by institution name, AICTE Permanent ID (1-4821...), or district..."
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
          <select
            value={regionId}
            onChange={(e) => { setRegionId(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="">All Regions</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.office_city})</option>
            ))}
          </select>

          <select
            value={approvalStatus}
            onChange={(e) => { setApprovalStatus(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="">All Approval Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Under Scrutiny">Under Scrutiny</option>
            <option value="Withdrawn">Withdrawn</option>
            <option value="Closed">Closed</option>
          </select>

          <button
            type="button"
            onClick={() => { setHasOpenCases(hasOpenCases === true ? undefined : true); setPage(1); }}
            className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
              hasOpenCases === true ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            Active Grievances Only
          </button>
        </div>

      </div>

      {/* Grid of Institution Cards */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading institutions repository...
        </div>
      ) : institutions.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          No institutions match the given criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map((inst) => {
            const hasOverlaps = inst.has_active_overlap;
            const multiBureau = (inst.handling_bureaus?.length || 0) >= 2;

            return (
              <div
                key={inst.id}
                onClick={() => navigate(`/institutions/${inst.id}`)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      AICTE: {inst.permanent_id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      inst.approval_status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {inst.approval_status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-navy group-hover:underline mt-2 line-clamp-2">
                    {inst.name}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{inst.district}, {inst.state} - {inst.pincode}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {inst.institution_type}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {inst.management_type}
                    </span>
                    {inst.is_repeat_offender && (
                      <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-semibold border border-red-200">
                        Repeat Complaints
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  {/* Handling bureaus chips */}
                  {inst.handling_bureaus && inst.handling_bureaus.length > 0 && (
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Bureaus:</span>
                      <div className="flex flex-wrap gap-1">
                        {inst.handling_bureaus.map(b => (
                          <BureauChip key={b} code={b} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3 text-slate-600">
                      <span>Total: <strong>{inst.total_cases_count}</strong></span>
                      <span className="text-amber-700 font-bold">Open: {inst.open_cases_count}</span>
                      {(inst.overdue_cases_count ?? 0) > 0 && (
                        <span className="text-red-600 font-bold">({inst.overdue_cases_count} overdue)</span>
                      )}
                    </div>
                    <span className="text-navy font-bold text-xs flex items-center">
                      360° &rarr;
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing <strong>{institutions.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
          <strong>{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong> institutions
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong></span>
          <button
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
