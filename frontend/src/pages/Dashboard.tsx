import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, Clock, AlertTriangle, CheckCircle, ArrowUpRight, 
  RefreshCw, TrendingUp, Filter, Building, ChevronRight, GitCompare,
  Layers, Users, ShieldAlert, Sparkles, AlertOctagon
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend
} from 'recharts';
import { api } from '../lib/api';
import { DashboardSummary, BureauWorkload, Bureau, Region, CaseLink } from '../lib/types';
import { KpiCard } from '../components/common/KpiCard';
import { StatusChip, BureauChip, ScoreBar } from '../components/common/ChipsAndBars';

const STATUS_COLORS: Record<string, string> = {
  'Received': '#94a3b8',
  'Under Process': '#3b82f6',
  'Pending': '#f59e0b',
  'Transferred': '#a855f7',
  'Escalated': '#ef4444',
  'Disposed': '#10b981',
};

export const Dashboard: React.FC<{ onStartTour?: () => void }> = ({ onStartTour }) => {
  const navigate = useNavigate();

  // Filters
  const [regionId, setRegionId] = useState<string>('');
  const [bureauId, setBureauId] = useState<string>('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);

  // Data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [bureauWorkload, setBureauWorkload] = useState<BureauWorkload[]>([]);
  const [statusDist, setStatusDist] = useState<{ status: string; count: number }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [ageingBuckets, setAgeingBuckets] = useState<{ bucket: string; count: number }[]>([]);
  const [topInstitutions, setTopInstitutions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [topOverlaps, setTopOverlaps] = useState<CaseLink[]>([]);
  const [unmatchedCases, setUnmatchedCases] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Fetch lookups
  useEffect(() => {
    async function fetchLookups() {
      try {
        const [regData, burData] = await Promise.all([
          api.get<Region[]>('/regions'),
          api.get<Bureau[]>('/bureaus')
        ]);
        setRegions(regData);
        setBureaus(burData);
      } catch (err) {
        console.error('Failed to load regions/bureaus', err);
      }
    }
    fetchLookups();
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (regionId) params.append('region_id', regionId);
      if (bureauId) params.append('bureau_id', bureauId);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const [
        sumData, workloadData, statusData, trendData,
        ageingData, topInstData, activityData, overlapsData, casesUnmatched
      ] = await Promise.all([
        api.get<DashboardSummary>(`/dashboard/summary${queryStr}`),
        api.get<BureauWorkload[]>('/dashboard/bureau-workload'),
        api.get<{ status: string; count: number }[]>(`/dashboard/status-distribution${queryStr}`),
        api.get<any[]>('/dashboard/monthly-trend'),
        api.get<{ bucket: string; count: number }[]>(`/dashboard/ageing-buckets${bureauId ? `?bureau_id=${bureauId}` : ''}`),
        api.get<any[]>('/dashboard/top-institutions?limit=5'),
        api.get<any[]>('/dashboard/recent-activity?limit=6'),
        api.get<CaseLink[]>('/overlaps?status=SUGGESTED'),
        api.get<any>('/cases?has_overlap=false&page_size=5')
      ]);

      setSummary(sumData);
      setBureauWorkload(workloadData);
      setStatusDist(statusData);
      setMonthlyTrend(trendData);
      setAgeingBuckets(ageingData);
      setTopInstitutions(topInstData);
      setRecentActivity(activityData);
      setTopOverlaps(overlapsData.slice(0, 5));
      setUnmatchedCases(casesUnmatched.items ? casesUnmatched.items.filter((c: any) => !c.institution_id) : []);
    } catch (err) {
      console.error('Error fetching dashboard', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 20000);
    return () => clearInterval(interval);
  }, [regionId, bureauId]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner & Filter Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-navy">National Complaint Monitoring Dashboard</h1>
            <span className="text-xs bg-navy text-white px-2 py-0.5 rounded font-mono font-medium">
              Single-Window RBAC
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time cross-bureau intelligence, automated overlap alerts, and regulatory SLA tracking.
          </p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="">All 8 Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.office_city})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={bureauId}
              onChange={(e) => setBureauId(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="">All 8 Bureaus/Cells</option>
              {bureaus.map((b) => (
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 text-slate-500 hover:text-navy hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <KpiCard
          title="Total Received"
          value={summary?.total_received ?? 0}
          subtitle="Last 12 months"
          icon={FileText}
          color="navy"
          onClick={() => navigate('/cases')}
        />
        <KpiCard
          title="Under Process"
          value={summary?.under_process ?? 0}
          subtitle="Active investigations"
          icon={RefreshCw}
          color="navy"
          onClick={() => navigate('/cases?status=Under Process')}
        />
        <KpiCard
          title="Regulatory Overdue"
          value={summary?.overdue ?? 0}
          subtitle="SLA breached cases"
          icon={AlertOctagon}
          color="red"
          onClick={() => navigate('/cases?overdue=true')}
        />
        <KpiCard
          title="Due in ≤ 7 Days"
          value={summary?.due_within_7_days ?? 0}
          subtitle="Approaching deadline"
          icon={Clock}
          color="amber"
          onClick={() => navigate('/alerts')}
        />
        <KpiCard
          title="Cross-Bureau Overlaps"
          value={summary?.overlap_open_count ?? 0}
          subtitle="Coordination required"
          icon={GitCompare}
          color="saffron"
          onClick={() => navigate('/overlaps')}
        />
      </div>

      {/* Second KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Disposed Cases</p>
            <p className="text-xl font-bold text-emerald-700">{summary?.disposed ?? 0}</p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
            {summary?.disposal_rate}% rate
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Avg Disposal Time</p>
            <p className="text-xl font-bold text-navy">{summary?.avg_disposal_days ?? 0} <span className="text-xs font-normal text-slate-500">days</span></p>
          </div>
          <Clock className="w-5 h-5 text-slate-300" />
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Transferred Cases</p>
            <p className="text-xl font-bold text-purple-700">{summary?.transferred ?? 0}</p>
          </div>
          <span className="text-[10px] text-slate-500">Jurisdiction shifted</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Escalated to SHC</p>
            <p className="text-xl font-bold text-red-600">{summary?.escalated ?? 0}</p>
          </div>
          <ShieldAlert className="w-5 h-5 text-red-500" />
        </div>
      </div>

      {/* Spotlight: Potential Overlapping Cases – Coordination Required */}
      <div className="bg-white rounded-2xl border-2 border-saffron/40 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-saffron/10 via-amber-50 to-white px-5 py-3.5 border-b border-saffron/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-saffron text-white rounded-lg shadow-sm">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Potential Overlapping Cases – Cross-Bureau Coordination Required
              </h3>
              <p className="text-xs text-slate-500">
                AICTE matching engine identified simultaneous complaints lodged across different bureaus for the same institution.
              </p>
            </div>
          </div>
          <Link
            to="/overlaps"
            className="flex items-center space-x-1 text-xs font-bold text-saffron-hover hover:underline"
          >
            <span>Open Overlap Review Centre ({summary?.overlap_open_count})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {topOverlaps.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No pending unreviewed overlaps. All detected cross-bureau matters have been coordinated.
            </div>
          ) : (
            topOverlaps.map((link) => (
              <div key={link.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-navy text-xs">
                      {link.institution_name || 'Institution Record'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (ID: {link.institution_permanent_id})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="flex items-center space-x-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                      <BureauChip code={link.case_a.bureau_code} />
                      <span className="font-semibold text-slate-800">{link.case_a.case_no}</span>
                      <span className="text-slate-400">· {link.case_a.subject.slice(0, 35)}...</span>
                    </div>

                    <span className="text-slate-400 font-bold">&harr;</span>

                    <div className="flex items-center space-x-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                      <BureauChip code={link.case_b.bureau_code} />
                      <span className="font-semibold text-slate-800">{link.case_b.case_no}</span>
                      <span className="text-slate-400">· {link.case_b.subject.slice(0, 35)}...</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-0.5">
                    <strong>Evidence:</strong> {link.evidence.reasons.slice(0, 2).join(' · ')}
                  </p>
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  <div className="w-32">
                    <ScoreBar score={link.score} band={link.confidence_band} />
                  </div>
                  <Link
                    to="/overlaps"
                    className="px-3 py-1.5 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy-light shadow-sm transition-all"
                  >
                    Review Pair
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Charts Row 1: Status Donut & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Status Distribution Donut */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Complaint Status Breakdown</h3>
            <p className="text-xs text-slate-500">Distribution across active regulatory states</p>
          </div>

          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDist}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {statusDist.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#cbd5e1'} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
            {statusDist.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] }} />
                  <span className="text-slate-600 truncate max-w-[90px]">{s.status}</span>
                </div>
                <span className="font-bold text-slate-800">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">12-Month Inflow vs Disposal Trend</h3>
              <p className="text-xs text-slate-500">Monthly receipt velocity versus resolved complaints</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-navy rounded-sm" />
                <span className="text-slate-600">Received</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
                <span className="text-slate-600">Disposed</span>
              </span>
            </div>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1F3A6E" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#1F3A6E" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDisp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="received" stroke="#1F3A6E" strokeWidth={2} fillOpacity={1} fill="url(#colorRec)" />
                <Area type="monotone" dataKey="disposed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDisp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Charts Row 2: Bureau Workload & Ageing Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bureau Workload Grouped Bar Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bureau & Cell Workload</h3>
              <p className="text-xs text-slate-500">Active vs overdue cases across regulatory divisions</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bureauWorkload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bureau_code" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="open_cases" name="Active Open" fill="#1F3A6E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue_cases" name="Overdue SLA" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ageing Buckets */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Complaint Ageing Profile</h3>
            <p className="text-xs text-slate-500">Days elapsed since formal receipt</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingBuckets} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis dataKey="bucket" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#F28C28" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Top Institutions & Recent Regulatory Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Institutions by Open Complaints */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Institutions with Highest Open Grievances</h3>
              <p className="text-xs text-slate-500">Repeat complaints requiring coordinated scrutiny</p>
            </div>
            <Link to="/institutions" className="text-xs text-navy font-semibold hover:underline">
              View All &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-2.5">Institution</th>
                  <th className="p-2.5">AICTE ID</th>
                  <th className="p-2.5">District / State</th>
                  <th className="p-2.5 text-right">Open Cases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topInstitutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-medium text-slate-900">
                      <Link to={`/institutions/${inst.id}`} className="hover:text-navy hover:underline">
                        {inst.name}
                      </Link>
                    </td>
                    <td className="p-2.5 font-mono text-slate-500">{inst.permanent_id}</td>
                    <td className="p-2.5 text-slate-600">{inst.district}, {inst.state}</td>
                    <td className="p-2.5 text-right">
                      <span className="font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                        {inst.open_cases}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Regulatory Activity Stream */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Inter-Bureau Activity</h3>
              <p className="text-xs text-slate-500">Live feed of notices, hearings, transfers and disposals</p>
            </div>
          </div>

          <div className="space-y-3">
            {recentActivity.map((act) => (
              <div key={act.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-navy">{act.case_no}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-700">{act.action_type}</span>
                    {act.from_bureau && (
                      <span className="text-[10px] text-slate-500">
                        ({act.from_bureau} &rarr; {act.to_bureau})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 line-clamp-1">{act.remarks}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400 shrink-0 ml-3">
                  <p>{act.performed_by}</p>
                  <p>{new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
