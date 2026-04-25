import React, { useEffect, useState, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import {
  Users,
  BarChart2,
  Bug,
  DollarSign,
  ChevronLeft,
  Crown,
  Zap,
  CalendarDays,
  RefreshCw,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Moon,
  Sun,
} from 'lucide-react';

interface AdminPanelProps {
  onBack?: () => void;
}

type AdminUser = UserProfile & { uid: string; tripsCount: number };

interface BugReport {
  id: string;
  userId: string;
  email: string;
  description: string;
  category: 'bug' | 'feature' | 'other';
  deviceInfo: string;
  timestamp: Timestamp | null;
  status: 'new' | 'reviewed';
}

type Tab = 'overview' | 'users' | 'bugs' | 'revenue';
type UserSort = 'newest' | 'most_active' | 'fuel' | 'pro';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [tripCounts, setTripCounts] = useState<Record<string, number>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [userSort, setUserSort] = useState<UserSort>('newest');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('gt_admin_dark');
    return saved !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('gt_admin_dark', String(darkMode));
  }, [darkMode]);

  // Load travel log counts once
  useEffect(() => {
    getDocs(collection(db, 'travelLogs')).then((snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const uid = (d.data() as { uid: string }).uid;
        if (uid) counts[uid] = (counts[uid] ?? 0) + 1;
      });
      setTripCounts(counts);
    });
  }, []);

  // Real-time users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: AdminUser[] = snap.docs.map((d) => {
        const data = d.data() as UserProfile;
        return { ...data, uid: d.id, tripsCount: tripCounts[d.id] ?? 0 };
      });
      setUsers(list);
      setLoadingUsers(false);
    });
    return () => unsub();
  }, [tripCounts]);

  // Real-time bug reports
  useEffect(() => {
    const q = query(collection(db, 'bugReports'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: BugReport[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BugReport, 'id'>),
      }));
      setBugReports(list);
      setLoadingBugs(false);
    });
    return () => unsub();
  }, []);

  const markReviewed = useCallback(async (id: string) => {
    setMarkingId(id);
    try {
      await updateDoc(doc(db, 'bugReports', id), { status: 'reviewed' });
    } finally {
      setMarkingId(null);
    }
  }, []);

  // Derived stats
  const now = Date.now();
  const proUsers = users.filter((u) => u.isPro);
  const freeUsers = users.filter((u) => !u.isPro);
  const totalTrips = Object.values(tripCounts).reduce((a: number, b: number) => a + b, 0);
  const newUsers = users.filter((u) => {
    if (!u.lastLogin) return false;
    return now - new Date(u.lastLogin).getTime() < SEVEN_DAYS_MS;
  });
  const totalFuelRemaining = users.reduce((acc, u) => acc + (u.credits ?? 0), 0);
  const openBugs = bugReports.filter((b) => b.status === 'new');

  // Sorted users
  const sortedUsers = [...users].sort((a, b) => {
    if (userSort === 'newest') {
      return (
        new Date(b.lastLogin ?? 0).getTime() - new Date(a.lastLogin ?? 0).getTime()
      );
    }
    if (userSort === 'most_active') return (b.tripsCount ?? 0) - (a.tripsCount ?? 0);
    if (userSort === 'fuel') return (b.credits ?? 0) - (a.credits ?? 0);
    if (userSort === 'pro') return (b.isPro ? 1 : 0) - (a.isPro ? 1 : 0);
    return 0;
  });

  const fmtDate = (ts: string | Timestamp | null | undefined) => {
    if (!ts) return '—';
    let d: Date;
    if (ts instanceof Timestamp) d = ts.toDate();
    else if (typeof ts === 'string') d = new Date(ts);
    else return '—';
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const categoryLabel = (c: string) => {
    if (c === 'bug') return { label: 'Bug', cls: 'bg-red-500/20 text-red-400' };
    if (c === 'feature') return { label: 'Feature', cls: 'bg-blue-500/20 text-blue-400' };
    return { label: 'Other', cls: 'bg-stone-600/40 text-stone-400' };
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, badge: users.length },
    {
      id: 'bugs',
      label: 'Feedback',
      icon: <Bug className="w-4 h-4" />,
      badge: openBugs.length || undefined,
    },
    { id: 'revenue', label: 'Revenue', icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-stone-950 text-stone-100' : 'bg-gray-50 text-gray-800'}`}>
      {/* Header */}
      <div className={`border-b px-4 py-3 flex items-center gap-3 ${darkMode ? 'border-stone-800' : 'border-gray-200'}`}>
        {onBack && (
          <button
            onClick={onBack}
            className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-100' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className={`text-lg font-black tracking-tight ${darkMode ? 'text-stone-100' : 'text-gray-800'}`}>Admin</h1>
          <p className={`text-xs ${darkMode ? 'text-stone-500' : 'text-gray-500'}`}>Feedback & Reports</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-stone-800 text-yellow-400 hover:bg-stone-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`border-b px-4 flex gap-1 overflow-x-auto ${darkMode ? 'border-stone-800' : 'border-gray-200'}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-green-500 text-green-400'
                : `border-transparent ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-gray-500 hover:text-gray-700'}`
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  t.id === 'bugs' && t.badge > 0
                    ? 'bg-red-500/20 text-red-400'
                    : darkMode ? 'bg-stone-700 text-stone-300' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-md lg:max-w-2xl mx-auto">
        {/* ── OVERVIEW ─────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={<Users className="w-5 h-5 text-blue-400" />}
                label="Total Users"
                value={loadingUsers ? '…' : users.length}
                sub="registered accounts"
                color="blue"
                darkMode={darkMode}
              />
              <StatCard
                icon={<Crown className="w-5 h-5 text-yellow-400" />}
                label="Pro Users"
                value={loadingUsers ? '…' : proUsers.length}
                sub={`${freeUsers.length} on free tier`}
                color="yellow"
                darkMode={darkMode}
              />
              <StatCard
                icon={<CalendarDays className="w-5 h-5 text-green-400" />}
                label="Trips Logged"
                value={totalTrips}
                sub="across all users"
                color="green"
                darkMode={darkMode}
              />
              <StatCard
                icon={<CalendarDays className="w-5 h-5 text-purple-400" />}
                label="New This Week"
                value={loadingUsers ? '…' : newUsers.length}
                sub="active in last 7 days"
                color="purple"
                darkMode={darkMode}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                icon={<Zap className="w-5 h-5 text-orange-400" />}
                label="Fuel Remaining"
                value={totalFuelRemaining}
                sub="credits in system"
                color="orange"
                darkMode={darkMode}
              />
              <StatCard
                icon={<Bug className="w-5 h-5 text-red-400" />}
                label="Open Bug Reports"
                value={loadingBugs ? '…' : openBugs.length}
                sub={`${bugReports.length} total submitted`}
                color="red"
                darkMode={darkMode}
              />
              <StatCard
                icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                label="Pro Upgrades"
                value={proUsers.length}
                sub={`$${(proUsers.length * 9.99).toFixed(2)} revenue`}
                color="emerald"
                darkMode={darkMode}
              />
            </div>

            {/* Recent signups */}
            {newUsers.length > 0 && (
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-stone-300 mb-3 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-green-400" />
                  New Users (Last 7 Days)
                </h3>
                <div className="space-y-2">
                  {newUsers.slice(0, 10).map((u) => (
                    <div key={u.uid} className="flex items-center justify-between text-sm">
                      <span className="text-stone-200">{u.displayName || u.email || u.uid}</span>
                      <div className="flex items-center gap-3">
                        {u.isPro && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-medium">
                            Pro
                          </span>
                        )}
                        <span className="text-stone-500 text-xs">{fmtDate(u.lastLogin)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── USERS ────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-400">{users.length} users total</p>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-stone-500" />
                <select
                  value={userSort}
                  onChange={(e) => setUserSort(e.target.value as UserSort)}
                  className="bg-stone-800 border border-stone-700 text-stone-200 text-sm rounded-lg px-2 py-1.5"
                >
                  <option value="newest">Last Active</option>
                  <option value="most_active">Most Trips</option>
                  <option value="fuel">Fuel Remaining</option>
                  <option value="pro">Pro First</option>
                </select>
              </div>
            </div>

            {loadingUsers ? (
              <LoadingState darkMode={darkMode} />
            ) : (
              <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-800 text-left text-xs text-stone-500 uppercase tracking-wider">
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Last Active</th>
                        <th className="px-4 py-3 font-semibold">Tier</th>
                        <th className="px-4 py-3 font-semibold">Fuel</th>
                        <th className="px-4 py-3 font-semibold">Trips</th>
                        <th className="px-4 py-3 font-semibold">Logins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map((u, i) => (
                        <tr
                          key={u.uid}
                          className={`border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors ${
                            i % 2 === 0 ? '' : 'bg-stone-900/50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-sm font-bold text-stone-300 shrink-0">
                                {(u.displayName || u.email || '?')[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-stone-100 truncate max-w-[140px]">
                                {u.displayName || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-400">{u.email || '—'}</td>
                          <td className="px-4 py-3 text-sm text-stone-400">{fmtDate(u.lastLogin)}</td>
                          <td className="px-4 py-3">
                            {u.isPro ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-medium">
                                <Crown className="w-3 h-3" />
                                Pro
                              </span>
                            ) : (
                              <span className="text-xs text-stone-500">Free</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-mono font-bold ${
                              (u.credits ?? 0) === 0 ? 'text-red-400' :
                              (u.credits ?? 0) <= 2 ? 'text-orange-400' : 'text-green-400'
                            }`}>
                              {u.credits ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-300 font-medium">
                            {tripCounts[u.uid] ?? 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-400">
                            {u.loginCount ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-stone-800">
                  {sortedUsers.map((u) => (
                    <div key={u.uid} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-stone-700 flex items-center justify-center text-sm font-bold text-stone-300">
                            {(u.displayName || u.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-stone-100 truncate">
                              {u.displayName || u.email || u.uid}
                            </div>
                            <div className="text-xs text-stone-500 truncate">{u.email || '—'}</div>
                          </div>
                        </div>
                        {u.isPro ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                            <Crown className="w-3 h-3" />
                            Pro
                          </span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-stone-400">
                        <div>
                          <span className="block text-stone-600">Last active</span>
                          {fmtDate(u.lastLogin)}
                        </div>
                        <div>
                          <span className="block text-stone-600">Fuel</span>
                          <span className={`font-bold ${(u.credits ?? 0) === 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {u.credits ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="block text-stone-600">Trips</span>
                          {tripCounts[u.uid] ?? 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BUG REPORTS ──────────────────────────── */}
        {tab === 'bugs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-400">
                {openBugs.length} open · {bugReports.length - openBugs.length} reviewed
              </p>
            </div>

            {loadingBugs ? (
              <LoadingState darkMode={darkMode} />
            ) : bugReports.length === 0 ? (
              <EmptyState icon={<Bug className="w-8 h-8" />} message="No bug reports yet" darkMode={darkMode} />
            ) : (
              <div className="space-y-3">
                {bugReports.map((b) => {
                  const cat = categoryLabel(b.category);
                  const reviewed = b.status === 'reviewed';
                  return (
                    <div
                      key={b.id}
                      className={`bg-stone-900 border rounded-xl p-4 transition-opacity ${
                        reviewed ? 'border-stone-800 opacity-60' : 'border-stone-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.cls}`}>
                            {cat.label}
                          </span>
                          <span className="text-xs text-stone-500">{b.email || 'anonymous'}</span>
                          <span className="text-xs text-stone-600">{fmtDate(b.timestamp)}</span>
                        </div>
                        <div className="shrink-0">
                          {reviewed ? (
                            <span className="flex items-center gap-1 text-xs text-stone-500">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Reviewed
                            </span>
                          ) : (
                            <button
                              onClick={() => markReviewed(b.id)}
                              disabled={markingId === b.id}
                              className="flex items-center gap-1.5 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {markingId === b.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              Mark reviewed
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-stone-200 leading-relaxed">{b.description}</p>
                      {b.deviceInfo && (
                        <p className="text-xs text-stone-600 mt-2 truncate">{b.deviceInfo}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── REVENUE ──────────────────────────────── */}
        {tab === 'revenue' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                icon={<Crown className="w-5 h-5 text-yellow-400" />}
                label="Pro Upgrades"
                value={proUsers.length}
                sub="total conversions"
                color="yellow"
                darkMode={darkMode}
              />
              <StatCard
                icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                label="Total Revenue"
                value={`$${(proUsers.length * 9.99).toFixed(2)}`}
                sub="at $9.99 / Pro"
                color="emerald"
                darkMode={darkMode}
              />
              <StatCard
                icon={<Users className="w-5 h-5 text-blue-400" />}
                label="Conversion Rate"
                value={
                  users.length > 0
                    ? `${((proUsers.length / users.length) * 100).toFixed(1)}%`
                    : '0%'
                }
                sub={`${proUsers.length} of ${users.length} users`}
                color="blue"
                darkMode={darkMode}
              />
            </div>

            {proUsers.length > 0 && (
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-stone-300 mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  Pro Members
                </h3>
                <div className="space-y-2">
                  {proUsers.map((u) => (
                    <div key={u.uid} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center text-xs font-bold text-stone-300">
                          {(u.displayName || u.email || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-stone-200">{u.displayName || u.email || u.uid}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span>{u.email}</span>
                        <span className="text-emerald-400 font-bold">$9.99</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {proUsers.length === 0 && (
              <EmptyState
                icon={<DollarSign className="w-8 h-8" />}
                message="No Pro upgrades yet"
                darkMode={darkMode}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'red' | 'emerald';
  darkMode: boolean;
}

const colorMap: Record<Exclude<StatCardProps['color'], undefined>, string> = {
  blue: 'bg-blue-500/10 border-blue-500/20',
  yellow: 'bg-yellow-500/10 border-yellow-500/20',
  green: 'bg-green-500/10 border-green-500/20',
  purple: 'bg-purple-500/10 border-purple-500/20',
  orange: 'bg-orange-500/10 border-orange-500/20',
  red: 'bg-red-500/10 border-red-500/20',
  emerald: 'bg-emerald-500/10 border-emerald-500/20',
};

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, color, darkMode }) => (
  <div className={`rounded-xl border p-4 ${darkMode ? colorMap[color] : 'bg-white border-gray-200'}`}>
    <div className="flex items-center gap-2 mb-2">{icon}<span className={`text-xs font-medium ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>{label}</span></div>
    <div className={`text-2xl font-black tabular-nums ${darkMode ? 'text-stone-100' : 'text-gray-800'}`}>{value}</div>
    <div className={`text-xs mt-0.5 truncate ${darkMode ? 'text-stone-500' : 'text-gray-400'}`}>{sub}</div>
  </div>
);

const LoadingState: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <div className={`flex items-center justify-center py-16 ${darkMode ? 'text-stone-500' : 'text-gray-400'}`}>
    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
    <span className="text-sm">Loading…</span>
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; message: string; darkMode: boolean }> = ({ icon, message, darkMode }) => (
  <div className={`flex flex-col items-center justify-center py-16 gap-3 ${darkMode ? 'text-stone-600' : 'text-gray-400'}`}>
    {icon}
    <span className="text-sm">{message}</span>
  </div>
);

export default AdminPanel;
