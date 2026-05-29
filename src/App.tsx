import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  HandCoins, 
  Wheat, 
  Receipt, 
  CheckSquare, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Bell,
  Search,
  Plus,
  Filter,
  Download,
  Trash2,
  Edit2,
  Check,
  XCircle,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  User as UserIcon,
  Settings,
  HeartHandshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, FundSummary } from './types';
import { supabase } from './lib/supabase';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import MemberManagement from './components/MemberManagement';
import ChandaCollection from './components/ChandaCollection';
import RiceTuma from './components/RiceTuma';
import ExpenseManagement from './components/ExpenseManagement';
import ApprovalPanel from './components/ApprovalPanel';
import Reports from './components/Reports';
import SettingsModal from './components/SettingsModal';
import SettingsPage from './components/SettingsPage';
import DonationManagement from './components/DonationManagement';

const SidebarItem = ({ icon: Icon, label, to, active, onClick }: any) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
    {active && <motion.div layoutId="active-pill" className="ml-auto"><ChevronRight size={16} /></motion.div>}
  </Link>
);

const BottomNavItem = ({ icon: Icon, label, to, active }: any) => (
  <Link 
    to={to} 
    className={`flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-200 ${
      active ? 'text-emerald-600' : 'text-slate-400'
    }`}
  >
    <div className={`p-1 rounded-lg ${active ? 'bg-emerald-50' : ''}`}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className={`text-[10px] font-bold ${active ? 'text-emerald-700' : ''}`}>{label}</span>
  </Link>
);

const Layout = ({ children, user, onLogout }: any) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingNotifications, setPendingNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    if (user.role !== 'Admin') return;

    const fetchNotifications = async () => {
      try {
        const { data: txs, error: txErr } = await supabase
          .from('transactions')
          .select('*')
          .eq('status', 'Pending')
          .order('id', { ascending: false });

        if (txErr) throw txErr;

        if (txs) {
          setPendingCount(txs.length);

          // Get member names for member of Chanda transactions
          const memberIds = txs.filter(t => t.member_id).map(t => t.member_id);
          let membersList: any[] = [];
          if (memberIds.length > 0) {
            const { data: members, error: mErr } = await supabase
              .from('members')
              .select('id, name')
              .in('id', memberIds);
            if (!mErr && members) {
              membersList = members;
            }
          }

          const enriched = txs.slice(0, 5).map((t: any) => {
            const member = membersList.find(m => m.id === t.member_id);
            return {
              ...t,
              member_name: member ? member.name : null
            };
          });

          setPendingNotifications(enriched);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [user]);

  const handleOpenSettings = () => {
    if (user.role !== 'Admin') {
      alert('দুঃখিত, শুধুমাত্র এডমিনরাই মাস্টার সেটিংস অ্যাক্সেস করতে পারবেন।');
      return;
    }
    navigate('/settings');
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'ড্যাশবোর্ড', to: '/', roles: ['Admin', 'Data Entry User'] },
    { icon: Users, label: 'মেম্বার', to: '/members', roles: ['Admin', 'Data Entry User'] },
    { icon: HandCoins, label: 'চাঁদা', to: '/chanda', roles: ['Admin', 'Data Entry User'] },
    { icon: HeartHandshake, label: 'দান ও জুম্মা', to: '/donations', roles: ['Admin', 'Data Entry User'] },
    { icon: Wheat, label: 'চাল তোলা', to: '/rice-tuma', roles: ['Admin', 'Data Entry User'] },
    { icon: Receipt, label: 'খরচ', to: '/expenses', roles: ['Admin', 'Data Entry User'] },
    { icon: CheckSquare, label: 'অ্যাপ্রুভাল', to: '/approvals', roles: ['Admin'] },
    { icon: UserPlus, label: 'ইউজার', to: '/users', roles: ['Admin'] },
    { icon: FileText, label: 'রিপোর্ট', to: '/reports', roles: ['Admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  // Bottom Nav Items (Perfectly balanced 5 items to keep '+' action exactly centered)
  const bottomNavItems = [
    { icon: LayoutDashboard, label: 'হোম', to: '/' },
    { icon: Users, label: 'মেম্বার', to: '/members' },
    { icon: HandCoins, label: 'চাঁদা', to: '/chanda', isCenter: true },
    { icon: Wheat, label: 'চাল তোলা', to: '/rice-tuma' },
    { icon: Receipt, label: 'খরচ', to: '/expenses' }
  ].filter(item => {
    const originalItem = menuItems.find(m => m.to === item.to);
    return originalItem ? originalItem.roles.includes(user.role) : true;
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth <= 1024 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || window.innerWidth > 1024) && (
          <motion.aside 
            initial={window.innerWidth <= 1024 ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`fixed lg:relative w-72 bg-white border-r border-slate-100 flex flex-col z-50 h-full transition-all duration-300 shadow-2xl lg:shadow-none`}
          >
            <div className="p-8 flex items-center gap-4 border-b border-slate-50">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex-shrink-0 flex items-center justify-center text-white shadow-xl shadow-emerald-200">
                <LayoutDashboard size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-black text-slate-800 text-sm leading-tight tracking-tight truncate" title={localStorage.getItem('mosque_name') || 'বাইতুল মামুর জামে মসজিদ'}>
                  {localStorage.getItem('mosque_name') || 'Mosque'}
                </h1>
                <p className="text-[9px] text-emerald-600 font-black tracking-[1.5px] uppercase">management-pro</p>
              </div>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
              {filteredMenu.map((item) => (
                <SidebarItem 
                  key={item.to}
                  icon={item.icon}
                  label={item.label}
                  to={item.to}
                  active={location.pathname === item.to}
                  onClick={() => window.innerWidth <= 1024 && setIsSidebarOpen(false)}
                />
              ))}
            </nav>

            <div className="p-6 border-t border-slate-50 bg-slate-50/50">
              <div className="bg-white rounded-2xl p-4 mb-4 border border-slate-100 shadow-sm relative flex items-center justify-between">
                <div className="truncate pr-2">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">লগইন করা আছে</p>
                  <p className="font-black text-slate-800 truncate text-sm">{user.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{user.role}</p>
                  </div>
                </div>
                <button 
                  onClick={handleOpenSettings}
                  className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex-shrink-0"
                  title="সেটিংস ও পাসওয়ার্ড"
                >
                  <Settings size={20} />
                </button>
              </div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-red-600 hover:bg-red-50 rounded-xl transition-all font-black text-sm group"
              >
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>লগআউট</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 sm:px-10 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 hover:bg-slate-50 rounded-xl text-slate-600 transition-all border border-transparent hover:border-slate-100 lg:hidden"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="h-8 w-px bg-slate-100 hidden sm:block lg:hidden"></div>
            <h2 className="font-black text-slate-800 tracking-tight">
              {menuItems.find(i => i.to === location.pathname)?.label || 'ড্যাশবোর্ড'}
            </h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="সার্চ করুন..." 
                className="pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl text-sm transition-all w-72 outline-none font-bold"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl relative transition-all border border-transparent hover:border-slate-100 cursor-pointer"
                title="নোটিফিকেশন"
              >
                <Bell size={22} className={pendingCount > 0 ? "animate-swing" : ""} />
                {pendingCount > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-red-100 animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsNotificationsOpen(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 font-sans font-medium"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-50 mb-3">
                        <span className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <Bell size={16} className="text-emerald-600" />
                          নোটিফিকেশনস
                        </span>
                        {pendingCount > 0 && (
                          <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                            {pendingCount}টি অমীমাংসিত
                          </span>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2.5">
                        {pendingCount === 0 ? (
                          <div className="text-center py-8 text-slate-400">
                            <Check className="mx-auto text-emerald-500 mb-1" size={24} />
                            <p className="text-xs font-black">সবকিছু অনুমোদিত হয়েছে!</p>
                            <p className="text-[10px] mt-0.5 text-slate-400">কোনো নতুন নোটিফিকেশন নেই।</p>
                          </div>
                        ) : (
                          pendingNotifications.map((noti: any) => (
                            <div 
                              key={noti.id}
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                navigate('/approvals');
                              }}
                              className="p-3 bg-slate-50/70 hover:bg-emerald-50/50 rounded-xl transition-all cursor-pointer border border-slate-50 hover:border-emerald-100 flex gap-2.5 items-start text-xs group"
                            >
                              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                noti.source === 'Chanda' ? 'bg-amber-50 text-amber-600' :
                                noti.source === 'Rice Tuma' ? 'bg-indigo-50 text-indigo-650' :
                                noti.source === 'Friday Donation' ? 'bg-emerald-50 text-emerald-600' :
                                noti.source === 'Donation' ? 'bg-teal-50 text-teal-650' :
                                'bg-red-50 text-red-650'
                              }`}>
                                {noti.source === 'Chanda' && <HandCoins size={14} />}
                                {noti.source === 'Rice Tuma' && <Wheat size={14} />}
                                {(noti.source === 'Friday Donation' || noti.source === 'Donation') && <HeartHandshake size={14} />}
                                {noti.type === 'Expense' && <Receipt size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-700 leading-tight group-hover:text-emerald-800">
                                  {noti.source === 'Chanda' ? 'নতুন চাঁদা এন্ট্রি' : 
                                   noti.source === 'Rice Tuma' ? 'চাল বিক্রির এন্ট্রি' : 
                                   noti.source === 'Friday Donation' ? 'নতুন জুম্মার দান' :
                                   noti.source === 'Donation' ? 'নতুন দান এন্ট্রি' :
                                   'নতুন খরচ এন্ট্রি'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {noti.source === 'Chanda' && `${noti.member_name || 'মেম্বার'} • ৳${noti.amount}`}
                                  {noti.source === 'Rice Tuma' && `৳${noti.amount}`}
                                  {(noti.source === 'Friday Donation' || noti.source === 'Donation') && `৳${noti.amount}`}
                                  {noti.type === 'Expense' && `${noti.source} • ৳${noti.amount}`}
                                </p>
                              </div>
                              <div className="text-[9px] text-slate-400 whitespace-nowrap self-center font-bold">
                                {noti.date}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {pendingCount > 0 && (
                        <button 
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            navigate('/approvals');
                          }}
                          className="w-full text-center mt-3 pt-3 border-t border-slate-50 text-emerald-600 hover:text-emerald-700 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          অ্যাপ্রুভাল প্যানেলে যান
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={handleOpenSettings}
              className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl relative transition-all border border-transparent hover:border-slate-100"
              title="সেটিংস ও প্রোফাইল"
            >
              <Settings size={22} />
            </button>
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 sm:hidden">
              <UserIcon size={20} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-[#F8FAFC] pb-24 lg:pb-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-between z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex flex-1 items-center justify-around">
            {bottomNavItems.map((item) => {
              if (item.isCenter) {
                return (
                  <div key="center-action" className="relative -top-6">
                    <Link 
                      to={item.to}
                      className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-200 border-4 border-white transition-transform active:scale-90"
                    >
                      <Plus size={32} strokeWidth={3} />
                    </Link>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-emerald-700 whitespace-nowrap">{item.label}</span>
                  </div>
                );
              }
              return (
                <BottomNavItem 
                  key={item.to}
                  icon={item.icon}
                  label={item.label}
                  to={item.to}
                  active={location.pathname === item.to}
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);

  useEffect(() => {
    let idCounter = 0;
    
    // Override window.alert to display a non-blocking floating custom toast notification
    window.alert = (message: any) => {
      const id = idCounter++;
      const msgStr = String(message || '');
      
      let type: 'success' | 'error' | 'info' = 'success';
      if (
        msgStr.includes('ত্রুটি') || 
        msgStr.includes('ব্যর্থ') || 
        msgStr.includes('ভুল') || 
        msgStr.includes('সংযোগ বিচ্ছিন্ন') || 
        msgStr.includes('পারবেন না') || 
        msgStr.includes('দুঃখিত') || 
        msgStr.includes('সঠিক নয়')
      ) {
        type = 'error';
      } else if (msgStr.includes('অপেক্ষা') || msgStr.includes('সাবধান')) {
        type = 'info';
      }
      
      setToasts(prev => [...prev, { id, message: msgStr, type }]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4500);
    };

    try {
      const savedUser = localStorage.getItem('mosque_user');
      const token = localStorage.getItem('mosque_token');
      if (savedUser && token && savedUser !== 'undefined' && savedUser !== 'null') {
        setUser(JSON.parse(savedUser));
      } else {
        localStorage.removeItem('mosque_user');
        localStorage.removeItem('mosque_token');
        setUser(null);
      }
    } catch (e) {
      console.error('Error parsing saved session:', e);
      localStorage.removeItem('mosque_user');
      localStorage.removeItem('mosque_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData: any, token: string) => {
    localStorage.setItem('mosque_user', JSON.stringify(userData));
    localStorage.setItem('mosque_token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('mosque_user');
    localStorage.removeItem('mosque_token');
    setUser(null);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-emerald-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/*" 
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Routes>
                    <Route path="/" element={<Dashboard user={user} />} />
                    <Route path="/members" element={['Admin', 'Data Entry User'].includes(user.role) ? <MemberManagement /> : <Navigate to="/" />} />
                    <Route path="/chanda" element={<ChandaCollection user={user} />} />
                    <Route path="/donations" element={['Admin', 'Data Entry User'].includes(user.role) ? <DonationManagement user={user} /> : <Navigate to="/" />} />
                    <Route path="/rice-tuma" element={<RiceTuma user={user} />} />
                    <Route path="/expenses" element={<ExpenseManagement user={user} />} />
                    <Route path="/approvals" element={user.role === 'Admin' ? <ApprovalPanel /> : <Navigate to="/" />} />
                    <Route path="/users" element={user.role === 'Admin' ? <UserManagement /> : <Navigate to="/" />} />
                    <Route path="/reports" element={user.role === 'Admin' ? <Reports /> : <Navigate to="/" />} />
                    <Route path="/settings" element={user.role === 'Admin' ? <SettingsPage /> : <Navigate to="/" />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
        </Routes>
      </Router>

      {/* Custom Toast Notification Center */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-[360px] w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-black border pointer-events-auto ${
                t.type === 'success' 
                  ? 'bg-white border-emerald-100 text-emerald-800 shadow-emerald-100/50 shadow-md animate-none' 
                  : t.type === 'error'
                  ? 'bg-white border-red-100 text-red-800 shadow-red-100/50 shadow-md animate-none'
                  : 'bg-white border-blue-100 text-blue-800 shadow-blue-100/50 shadow-md animate-none'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-xl ${
                  t.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                  t.type === 'error' ? 'bg-red-50 text-red-500' :
                  'bg-blue-50 text-blue-500'
                }`}>
                  {t.type === 'success' && <Check size={16} strokeWidth={3} />}
                  {t.type === 'error' && <X size={16} strokeWidth={3} />}
                  {t.type === 'info' && <Bell size={16} strokeWidth={3} />}
                </div>
                <p className="leading-relaxed font-bengali">{t.message}</p>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
