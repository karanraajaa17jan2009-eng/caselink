import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Bell, User as UserIcon, LogOut, CheckCircle2, 
  AlertTriangle, Clock, HelpCircle, Play, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AlertItem } from '../../lib/types';

interface NavbarProps {
  onStartTour?: () => void;
  lastUpdated?: Date;
}

export const Navbar: React.FC<NavbarProps> = ({ onStartTour, lastUpdated = new Date() }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ institutions: any[]; cases: any[] }>({ institutions: [], cases: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Alerts state
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  // User menu state
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Format time for live heartbeat
  const timeString = lastUpdated.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Fetch unread alerts count
  const fetchAlerts = async () => {
    try {
      const countRes = await api.get<{ unread_count: number }>('/alerts/count');
      setUnreadCount(countRes.unread_count);
      const listRes = await api.get<AlertItem[]>('/alerts?limit=5');
      setAlerts(listRes);
    } catch (err) {
      // quiet fail on background poll
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000);
    return () => clearInterval(interval);
  }, []);

  // Global search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults({ institutions: [], cases: [] });
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [instRes, casesRes] = await Promise.all([
          api.get(`/institutions?search=${encodeURIComponent(searchQuery)}&page_size=4`),
          api.get(`/cases?q=${encodeURIComponent(searchQuery)}&page_size=4`)
        ]);
        setSearchResults({
          institutions: instRes.items || [],
          cases: casesRes.items || []
        });
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setShowAlertsDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAlertsRead = async () => {
    try {
      await api.post('/alerts/read-all');
      setUnreadCount(0);
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        
        {/* Brand & Wordmark */}
        <div className="flex items-center space-x-3">
          <Link to="/dashboard" className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center shadow-md border-2 border-saffron">
              <span className="text-white font-extrabold text-lg tracking-wider">AI</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-bold text-navy tracking-tight">AICTE CASELINK</span>
                <span className="text-[10px] font-semibold bg-saffron/15 text-saffron px-1.5 py-0.5 rounded border border-saffron/30">
                  SIH 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">
                Integrated Institution Complaint Monitoring Dashboard
              </p>
            </div>
          </Link>
        </div>

        {/* Global Live Search Bar */}
        <div className="flex-1 max-w-lg mx-6 relative" ref={searchRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
              placeholder="Search by Institution, AICTE ID, Case No, or District..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy focus:bg-white transition-colors"
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Search Live Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              {searchResults.institutions.length === 0 && searchResults.cases.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  No matching institutions or cases found.
                </div>
              ) : (
                <div className="py-2 divide-y divide-slate-100">
                  {searchResults.institutions.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                        Institutions
                      </div>
                      {searchResults.institutions.map((inst) => (
                        <button
                          key={inst.id}
                          onClick={() => {
                            navigate(`/institutions/${inst.id}`);
                            setShowSearchDropdown(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-sm group"
                        >
                          <div>
                            <p className="font-medium text-slate-800 group-hover:text-navy">{inst.name}</p>
                            <p className="text-xs text-slate-500">
                              AICTE ID: {inst.permanent_id} · {inst.district}, {inst.state}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                            {inst.open_cases_count} open cases
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.cases.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                        Complaint Cases
                      </div>
                      {searchResults.cases.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            navigate(`/cases/${c.id}`);
                            setShowSearchDropdown(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-sm group"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-navy text-xs">{c.case_no}</span>
                              <span className="text-xs text-slate-400">· {c.category}</span>
                            </div>
                            <p className="text-xs text-slate-700 truncate max-w-sm">{c.subject}</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            c.status === 'Disposed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {c.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action Tools: Live Heartbeat + Guided Demo Tour + Alerts + User */}
        <div className="flex items-center space-x-4">
          
          {/* Live Heartbeat Indicator */}
          <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium">Live</span>
            <span className="text-slate-400 text-[10px]">{timeString}</span>
          </div>

          {/* Guided Tour Trigger Button */}
          {onStartTour && (
            <button
              onClick={onStartTour}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-saffron to-amber-500 text-white font-medium text-xs rounded-lg shadow-sm hover:from-saffron-hover hover:to-amber-600 transition-all cursor-pointer"
              title="Launch 5-Step SIH Guided Demo Tour"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Guided Demo</span>
            </button>
          )}

          {/* Alerts Bell Notification Icon */}
          <div className="relative" ref={alertsRef}>
            <button
              onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
              className="relative p-2 text-slate-600 hover:text-navy hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Alerts and Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Alerts Dropdown Panel */}
            {showAlertsDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Alerts & Notifications</h4>
                    <p className="text-xs text-slate-500">{unreadCount} unread active alerts</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAlertsRead}
                      className="text-xs text-navy font-medium hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                      No active alerts. All cases within regulatory SLAs!
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <Link
                        key={alert.id}
                        to={alert.case_id ? `/cases/${alert.case_id}` : '/alerts'}
                        onClick={() => setShowAlertsDropdown(false)}
                        className={`block p-3 hover:bg-slate-50 transition-colors ${
                          !alert.is_read ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-2.5">
                          {alert.type === 'OVERLAP' ? (
                            <AlertTriangle className="w-4 h-4 text-saffron shrink-0 mt-0.5" />
                          ) : alert.type === 'SLA_BREACH' ? (
                            <Clock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          ) : (
                            <Bell className="w-4 h-4 text-navy shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-800 line-clamp-2">{alert.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(alert.created_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <Link
                    to="/alerts"
                    onClick={() => setShowAlertsDropdown(false)}
                    className="text-xs text-navy font-semibold hover:underline"
                  >
                    View All Notifications &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-navy/10 text-navy font-semibold flex items-center justify-center text-xs border border-navy/20">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user?.name || 'Authorized Official'}
                </p>
                <p className="text-[10px] text-slate-500 leading-none">
                  {user?.role.replace('_', ' ')}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                  <p className="text-[11px] text-slate-500">{user?.email}</p>
                  <div className="mt-2 flex items-center space-x-1.5">
                    <span className="text-[10px] font-semibold bg-navy text-white px-2 py-0.5 rounded">
                      {user?.role}
                    </span>
                    {user?.bureau && (
                      <span className="text-[10px] font-medium bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        {user.bureau.code}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 font-medium italic">
                    {user?.designation}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    to="/about"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <span>How CASELINK Works</span>
                  </Link>

                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span>Admin Management</span>
                    </Link>
                  )}

                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
