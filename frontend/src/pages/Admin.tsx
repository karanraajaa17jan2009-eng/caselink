import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, Sliders, History, Database, 
  RotateCcw, Check, Plus, Edit2, AlertTriangle, Shield
} from 'lucide-react';
import { api } from '../lib/api';
import { User, SlaRule, AuditLogItem, Bureau, Region } from '../lib/types';
import { formatDate, formatDateTime } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const Admin: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'sla' | 'audit' | 'system'>('users');
  
  // States
  const [users, setUsers] = useState<User[]>([]);
  const [slaRules, setSlaRules] = useState<SlaRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [healthInfo, setHealthInfo] = useState<any | null>(null);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  // Editing SLA rule
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editDays, setEditDays] = useState<number>(30);

  // New user modal
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Caselink@2026');
  const [newUserRole, setNewUserRole] = useState('RB_OFFICER');
  const [newUserBureau, setNewUserBureau] = useState<string>('');
  const [newUserDesig, setNewUserDesig] = useState('Section Officer');

  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [uRes, sRes, aRes, hRes, bRes, rRes] = await Promise.all([
        api.get<User[]>('/users'),
        api.get<SlaRule[]>('/sla-rules'),
        api.get<AuditLogItem[]>('/audit-log?limit=50'),
        api.get('/health'),
        api.get<Bureau[]>('/bureaus'),
        api.get<Region[]>('/regions')
      ]);
      setUsers(uRes);
      setSlaRules(sRes);
      setAuditLogs(aRes);
      setHealthInfo(hRes);
      setBureaus(bRes);
      setRegions(rRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateSla = async (id: number) => {
    try {
      await api.put(`/sla-rules/${id}`, { days_allowed: editDays });
      setEditingRuleId(null);
      const updatedRules = await api.get<SlaRule[]>('/sla-rules');
      setSlaRules(updatedRules);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        bureau_id: newUserBureau ? Number(newUserBureau) : null,
        designation: newUserDesig,
        is_active: true
      });
      setShowNewUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      const updatedUsers = await api.get<User[]>('/users');
      setUsers(updatedUsers);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetDemoData = async () => {
    if (!confirm('CAUTION: This will drop all tables and re-seed fresh demo data (80 institutions, 450 cases, planted overlaps). Proceed?')) return;
    setIsResetting(true);
    try {
      await api.post('/admin/reset-demo');
      alert('Demo data successfully re-seeded from ground truth!');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-navy">Administrative & System Control Console</h1>
            <span className="text-xs bg-navy text-white px-2 py-0.5 rounded font-mono">
              Super Admin Access
            </span>
          </div>
          <p className="text-xs text-slate-500">
            RBAC user provisioning, SLA turnaround rules, audit trail inspection, and demo environment reset.
          </p>
        </div>

        <button
          onClick={handleResetDemoData}
          disabled={isResetting}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Re-seeding Database...' : 'Reset Demo Data to Seed'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'users' ? 'bg-navy text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts & RBAC ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sla')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'sla' ? 'bg-navy text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Regulatory SLA Rules ({slaRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'audit' ? 'bg-navy text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>System Audit Trail ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'system' ? 'bg-navy text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Database & Environment</span>
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Registered System Users</h3>
            <button
              onClick={() => setShowNewUserModal(true)}
              className="px-3 py-1.5 bg-navy text-white text-xs font-bold rounded-lg shadow-sm hover:bg-navy-light flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3">Official Name</th>
                  <th className="p-3">Email ID</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Affiliated Bureau</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{u.name}</td>
                    <td className="p-3 font-mono text-slate-600">{u.email}</td>
                    <td className="p-3">
                      <span className="font-semibold bg-navy/10 text-navy px-2 py-0.5 rounded text-[11px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">{u.bureau ? `${u.bureau.name} (${u.bureau.code})` : 'HQ / All Bureaus'}</td>
                    <td className="p-3 text-slate-600">{u.designation}</td>
                    <td className="p-3">
                      <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: SLA Rules */}
      {activeTab === 'sla' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Regulatory Timeline & SLA Days Matrix</h3>
            <p className="text-xs text-slate-500">
              Timelines are configurable per AICTE Approval Process Handbook (Critical default 7d, High 15d, Medium 30d, Low 45d).
            </p>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3">Grievance Category</th>
                  <th className="p-3">Priority Level</th>
                  <th className="p-3">Allowed Redressal Days</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slaRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{rule.category}</td>
                    <td className="p-3 font-semibold text-slate-700">{rule.priority}</td>
                    <td className="p-3">
                      {editingRuleId === rule.id ? (
                        <input
                          type="number"
                          value={editDays}
                          onChange={(e) => setEditDays(Number(e.target.value))}
                          className="w-20 p-1 border border-slate-300 rounded text-xs font-bold"
                        />
                      ) : (
                        <span className="font-bold text-navy">{rule.days_allowed} Days</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {editingRuleId === rule.id ? (
                        <button
                          onClick={() => handleUpdateSla(rule.id)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingRuleId(rule.id);
                            setEditDays(rule.days_allowed);
                          }}
                          className="text-navy hover:underline text-xs font-semibold"
                        >
                          Edit Days
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">System Audit Trail</h3>
            <p className="text-xs text-slate-500">Every write, transfer, escalation, disposal, and overlap review is immutably logged.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Officer / Actor</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Entity ID</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{formatDateTime(log.created_at)}</td>
                    <td className="p-3 font-semibold text-slate-800">{log.user_name || 'System / Auto'}</td>
                    <td className="p-3">
                      <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-[10px] text-navy">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{log.entity_type}</td>
                    <td className="p-3 font-mono text-slate-500">{log.entity_id || 'N/A'}</td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: System Health & Database Info */}
      {activeTab === 'system' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Database Engine & Deployment Verification</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Database Driver</span>
              <p className="text-lg font-bold text-navy capitalize">{healthInfo?.db || 'sqlite'}</p>
              <p className="text-slate-500 text-[11px]">
                {healthInfo?.db === 'sqlite' ? 'Local zero-config fallback active (caselink.db)' : 'Connected to PostgreSQL'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Seeding Status</span>
              <p className="text-lg font-bold text-emerald-600">Seeded & Ready</p>
              <p className="text-slate-500 text-[11px]">80 institutions, ~450 cases populated</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Overlap Engine Status</span>
              <p className="text-lg font-bold text-saffron">RapidFuzz Local</p>
              <p className="text-slate-500 text-[11px]">No external APIs or tokens required</p>
            </div>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Provision New AICTE Official Account</h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="officer@aicte-india.org"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">System Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="RB_OFFICER">RB Officer (Regulation)</option>
                  <option value="PGRC_OFFICER">PGRC Officer (Public Grievance)</option>
                  <option value="CELL_OFFICER">Cell Officer (Approval / Legal / Vig)</option>
                  <option value="REGIONAL_OFFICER">Regional Officer</option>
                  <option value="SENIOR_MGMT">Senior Management (Read Only)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Bureau Affiliation</label>
                <select
                  value={newUserBureau}
                  onChange={(e) => setNewUserBureau(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="">None / Central Oversight</option>
                  {bureaus.map(b => (
                    <option key={b.id} value={b.id}>{b.code} ({b.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Designation</label>
                <input
                  type="text"
                  required
                  value={newUserDesig}
                  onChange={(e) => setNewUserDesig(e.target.value)}
                  placeholder="e.g. Assistant Director"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-navy text-white font-bold rounded-lg"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
