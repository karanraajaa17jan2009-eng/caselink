import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('pgrc1@caselink.demo');
  const [password, setPassword] = useState('Caselink@2026');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    { email: 'pgrc1@caselink.demo', role: 'PGRC Officer', name: 'Shri Praveen Nair', bureau: 'PGRC' },
    { email: 'rb1@caselink.demo', role: 'RB Officer', name: 'Shri Anand Vardhan', bureau: 'RB' },
    { email: 'ab1@caselink.demo', role: 'Approval Officer', name: 'Shri Suresh Chandra', bureau: 'AB' },
    { email: 'legal1@caselink.demo', role: 'Legal Consultant', name: 'Adv. Meenakshi Raman', bureau: 'LEGAL' },
    { email: 'ro.south@caselink.demo', role: 'Regional Officer', name: 'Dr. K. Senthil Kumar', bureau: 'RO South' },
    { email: 'director@caselink.demo', role: 'Senior Mgmt (Read-Only)', name: 'Dr. Rameshwar Prasad', bureau: 'Director' },
    { email: 'admin@caselink.demo', role: 'System Admin', name: 'Dr. Rajeshwar Sharma', bureau: 'HQ Admin' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('Caselink@2026');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-govbg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* Top Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy shadow-lg border-2 border-saffron mb-4">
          <Shield className="w-8 h-8 text-saffron" />
        </div>
        <h2 className="text-2xl font-extrabold text-navy tracking-tight">
          AICTE CASELINK
        </h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-saffron">
          Regulation Bureau · All India Council for Technical Education
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Integrated Institution Complaint Monitoring & Overlap Detection System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left: Login Form */}
          <div className="md:col-span-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Official Sign In</h3>
              <p className="text-xs text-slate-500 mb-6">
                Single-Window Access Portal for AICTE Officers & Regulatory Cells
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Official Email ID
                  </label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                      placeholder="officer@caselink.demo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Default Demo Password: Caselink@2026</p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-navy hover:bg-navy-light text-white text-sm font-semibold rounded-lg shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Secure Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
              <p>Protected by AICTE e-Governance RBAC Security protocols.</p>
            </div>
          </div>

          {/* Right: One-Click Quick-Fill Demo Cards */}
          <div className="md:col-span-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                SIH Evaluator Quick-Fill Roles
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Click any role below to pre-fill credentials for instantaneous role-based testing:
            </p>

            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickFill(acc.email)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between group ${
                    email === acc.email
                      ? 'bg-navy text-white border-navy font-semibold shadow-sm'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={email === acc.email ? 'text-white' : 'font-bold text-navy'}>
                        {acc.role}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        email === acc.email ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {acc.bureau}
                      </span>
                    </div>
                    <p className={`text-[11px] ${email === acc.email ? 'text-slate-200' : 'text-slate-500'}`}>
                      {acc.name} · {acc.email}
                    </p>
                  </div>
                  <CheckCircle2 className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    email === acc.email ? 'text-saffron' : 'text-slate-300'
                  }`} />
                </button>
              ))}
            </div>

            <div className="mt-4 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
              <span>All demo accounts use password: <strong className="font-mono">Caselink@2026</strong></span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
