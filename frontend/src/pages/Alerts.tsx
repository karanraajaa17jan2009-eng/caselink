import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, Clock, AlertTriangle, ShieldAlert, CheckCircle2, 
  ArrowUpRight, CheckCheck, Filter
} from 'lucide-react';
import { api } from '../lib/api';
import { AlertItem, Bureau } from '../lib/types';
import { BureauChip } from '../components/common/ChipsAndBars';
import { formatDateTime } from '../lib/utils';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [bureauFilter, setBureauFilter] = useState('');
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBureaus() {
      try {
        const b = await api.get<Bureau[]>('/bureaus');
        setBureaus(b);
      } catch (err) {
        console.error(err);
      }
    }
    fetchBureaus();
  }, []);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (unreadOnly) params.append('unread', 'true');
      if (bureauFilter) params.append('bureau_id', bureauFilter);
      params.append('limit', '100');

      const res = await api.get<AlertItem[]>(`/alerts?${params.toString()}`);
      setAlerts(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [typeFilter, unreadOnly, bureauFilter]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/alerts/${id}/read`);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/alerts/read-all');
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'OVERLAP':
        return <AlertTriangle className="w-4 h-4 text-saffron" />;
      case 'SLA_BREACH':
        return <Clock className="w-4 h-4 text-red-600" />;
      case 'SLA_DUE_SOON':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'ESCALATION':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-navy" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy">Regulatory Alerts & Notifications Centre</h1>
          <p className="text-xs text-slate-500">
            Real-time feed of SLA breaches, approaching deadlines, pending inaction reminders, and detected overlaps.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm"
        >
          <CheckCheck className="w-3.5 h-3.5 text-navy" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter strip */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2.5 text-xs">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
        >
          <option value="">All Alert Types</option>
          <option value="OVERLAP">Cross-Bureau Overlap</option>
          <option value="SLA_BREACH">SLA Breach (Overdue)</option>
          <option value="SLA_DUE_SOON">SLA Due Soon (≤ 5 Days)</option>
          <option value="PENDING_REMINDER">Pending Reminder (&gt; 15 Days Inaction)</option>
          <option value="ESCALATION">Escalation Notice</option>
        </select>

        <select
          value={bureauFilter}
          onChange={(e) => setBureauFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
        >
          <option value="">All Target Bureaus</option>
          {bureaus.map(b => (
            <option key={b.id} value={b.id}>{b.code} ({b.name})</option>
          ))}
        </select>

        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            unreadOnly ? 'bg-navy text-white border-navy font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          Unread Only
        </button>
      </div>

      {/* Alert items list */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading notifications...
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          No notifications match the filter parameters.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                !alert.is_read ? 'bg-amber-50/30' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0 mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {alert.type.replace('_', ' ')}
                    </span>
                    {alert.target_bureau_code && (
                      <BureauChip code={alert.target_bureau_code} />
                    )}
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(alert.created_at)}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-800 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="flex items-center space-x-3 pt-1 text-xs">
                    {alert.case_id && (
                      <Link
                        to={`/cases/${alert.case_id}`}
                        className="text-navy font-bold hover:underline inline-flex items-center space-x-0.5"
                      >
                        <span>Case Docket ({alert.case_no})</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    )}
                    {alert.institution_id && (
                      <Link
                        to={`/institutions/${alert.institution_id}`}
                        className="text-slate-600 font-medium hover:text-navy hover:underline inline-flex items-center space-x-0.5"
                      >
                        <span>Institution Profile</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!alert.is_read && (
                <button
                  onClick={() => handleMarkRead(alert.id)}
                  className="text-xs text-slate-400 hover:text-navy px-2 py-1 hover:bg-slate-100 rounded shrink-0 cursor-pointer"
                  title="Mark as Read"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
