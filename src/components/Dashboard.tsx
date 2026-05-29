import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  TrendingUp,
  Calendar,
  Users,
  HandCoins,
  Wheat,
  Receipt,
  User as UserIcon,
  ChevronRight,
  Check,
  HeartHandshake
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FundSummary, Transaction } from '../types';
import { supabase } from '../lib/supabase';

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle, isCurrency = true }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white p-5 sm:p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between min-h-[160px] sm:min-h-[180px]"
  >
    <div className="flex justify-between items-start mb-4 sm:mb-6">
      <div className={`p-3 sm:p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        <Icon size={24} className="sm:w-7 sm:h-7" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[1.5px] sm:tracking-[2px] mb-1 sm:mb-2">{title}</p>
      <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">
        {isCurrency && '৳ '}{value.toLocaleString()}
      </h3>
      {subtitle && <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 sm:mt-2 font-bold uppercase tracking-wider">{subtitle}</p>}
    </div>
  </motion.div>
);

const DistributionItem = ({ label, percentage, color }: any) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 ${color} rounded-full`}></div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xs font-black text-slate-800">{percentage}%</span>
    </div>
    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full`} style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
);

export default function Dashboard({ user }: { user: any }) {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to calculate a member's dues count and total amount
  const getMemberDues = (member: any) => {
    if (member.status === 'Inactive' || !member.start_month) return { count: 0, amount: 0 };
    try {
      const current = new Date();
      const currentMonthFormatted = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      
      const range: string[] = [];
      const [startYear, startMonth] = member.start_month.split('-').map(Number);
      const [endYear, endMonth] = currentMonthFormatted.split('-').map(Number);
      
      let cy = startYear, cm = startMonth;
      while (cy < endYear || (cy === endYear && cm <= endMonth)) {
        range.push(`${cy}-${String(cm).padStart(2, '0')}`);
        cm++;
        if (cm > 12) { cm = 1; cy++; }
      }
      
      const paid = member.paid_months || [];
      const pending = member.pending_months || [];
      const unpaidMonths = range.filter(month => !paid.includes(month) && !pending.includes(month));
      return {
        count: unpaidMonths.length,
        amount: unpaidMonths.length * member.monthly_amount
      };
    } catch (e) {
      console.error(e);
      return { count: 0, amount: 0 };
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all transactions and members in parallel
        const [transRes, membersRes] = await Promise.all([
          supabase.from('transactions').select('*'),
          supabase.from('members').select('*').order('id', { ascending: true })
        ]);

        if (transRes.error) throw transRes.error;
        if (membersRes.error) throw membersRes.error;

        const transactions = transRes.data || [];
        const membersData = membersRes.data || [];

        // Sort recent transactions by date descending, then by id descending to ensure newly created ones are at the top
        const sortedTrans = [...transactions].sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return Number(b.id) - Number(a.id);
        });
        // For recent transactions list, get either user's or all depending on role
        const displayedTrans = user.role === 'Admin'
          ? sortedTrans.slice(0, 10)
          : sortedTrans.filter(t => t.entry_by === user.id).slice(0, 10);

        setRecentTransactions(displayedTrans);

        // Map members with their transactions to calculate paid_months and pending_months
        const enrichedMembers = membersData.map((m: any) => {
          const memberTxs = transactions.filter((t: any) => t.member_id === m.id);
          const chandaPayments = memberTxs.filter((t: any) => t.source === 'Chanda');
          const paid_months = chandaPayments.filter((t: any) => t.status === 'Approved' && t.month).map((t: any) => t.month);
          const pending_months = chandaPayments.filter((t: any) => t.status === 'Pending' && t.month).map((t: any) => t.month);
          return {
            ...m,
            paid_months,
            pending_months
          };
        });

        setMembers(enrichedMembers);

        // Core Bookkeeping
        let totalFund = 0;
        let monthlyIncome = 0;
        let monthlyExpense = 0;

        const currentYearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const todayDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        transactions.forEach((tx: any) => {
          const amt = Number(tx.amount) || 0;
          if (tx.status === 'Approved') {
            if (tx.type === 'Income') {
              totalFund += amt;
              if (tx.date && tx.date.startsWith(currentYearMonth)) {
                monthlyIncome += amt;
              }
            } else if (tx.type === 'Expense') {
              totalFund -= amt;
              if (tx.date && tx.date.startsWith(currentYearMonth)) {
                monthlyExpense += amt;
              }
            }
          }
        });

        // Calculate total dues across all enriched members
        let totalDues = 0;
        enrichedMembers.forEach((m: any) => {
          totalDues += getMemberDues(m).amount;
        });

        // Personal stats for non-admins / general users
        let personalApproved = 0;
        let personalPending = 0;
        let todayEntries = 0;

        transactions.forEach((tx: any) => {
          const amt = Number(tx.amount) || 0;
          if (tx.entry_by === user.id) {
            if (tx.status === 'Approved') {
              personalApproved += amt;
            } else if (tx.status === 'Pending') {
              personalPending++;
            }
            if (tx.date === todayDateStr) {
              todayEntries++;
            }
          }
        });

        setSummary({
          totalFund,
          monthlyIncome,
          monthlyExpense,
          totalDues,
          personalApproved,
          personalPending,
          todayEntries
        } as any);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="h-20 bg-slate-100 rounded-3xl w-1/3"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-slate-100 rounded-[32px]"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-96 bg-slate-100 rounded-[32px]"></div>
        <div className="h-96 bg-slate-100 rounded-[32px]"></div>
      </div>
    </div>
  );

  const isAdmin = user.role === 'Admin';

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">আসসালামু আলাইকুম, {user.name}</h2>
          <p className="text-slate-500 font-medium mt-1">
            {localStorage.getItem('mosque_name') || 'মসজিদ'} - এর আজকের আর্থিক অবস্থার সংক্ষিপ্ত চিত্র।
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm self-start sm:self-center">
          <Calendar className="text-emerald-600" size={20} />
          <span className="text-sm font-black text-slate-700 tracking-tight">
            {new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {isAdmin ? (
          <>
            <div className="col-span-2 lg:col-span-1">
              <StatCard 
                title="মোট মসজিদ ফান্ড" 
                value={summary?.totalFund || 0} 
                icon={Wallet} 
                color="bg-emerald-500"
                subtitle="বর্তমানে ক্যাশ ইন হ্যান্ড"
              />
            </div>
            <StatCard 
              title="মাসিক আয়" 
              value={summary?.monthlyIncome || 0} 
              icon={ArrowUpRight} 
              color="bg-blue-500"
              trend={12}
              subtitle="এই মাসের সংগ্রহ"
            />
            <StatCard 
              title="মাসিক ব্যয়" 
              value={summary?.monthlyExpense || 0} 
              icon={ArrowDownRight} 
              color="bg-orange-500"
              trend={-5}
              subtitle="এই মাসের খরচ"
            />
            <div className="col-span-2 lg:col-span-1">
              <StatCard 
                title="মোট বকেয়া" 
                value={summary?.totalDues || 0} 
                icon={Clock} 
                color="bg-red-500"
                subtitle="মেম্বারদের অপরিশোধিত চাঁদা"
              />
            </div>
          </>
        ) : (
          <>
            <div className="col-span-2 lg:col-span-1">
              <StatCard 
                title="আমার সংগ্রহ (গৃহীত)" 
                value={(summary as any)?.personalApproved || 0} 
                icon={HandCoins} 
                color="bg-emerald-500"
                subtitle="আপনার মাধ্যমে জমা হওয়া ফান্ড"
              />
            </div>
            <StatCard 
              title="পেন্ডিং এন্ট্রি" 
              value={(summary as any)?.personalPending || 0} 
              icon={Clock} 
              color="bg-amber-500"
              subtitle="অনুমোদনের অপেক্ষায়"
              isCurrency={false}
            />
            <StatCard 
              title="আজকের এন্ট্রি" 
              value={(summary as any)?.todayEntries || 0} 
              icon={Calendar} 
              color="bg-blue-500"
              subtitle="আজকের কালেকশন"
              isCurrency={false}
            />
            <div className="col-span-2 lg:col-span-1">
              <div className="bg-emerald-600 rounded-[32px] p-6 sm:p-8 text-white shadow-xl shadow-emerald-100 flex flex-col justify-between relative overflow-hidden group min-h-[160px]">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div>
                  <h4 className="font-black text-lg tracking-tight mb-1">দ্রুত কালেকশন</h4>
                  <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">নতুন এন্ট্রি যোগ করুন</p>
                </div>
                <div className="flex flex-col gap-2 mt-4 relative z-10">
                  <Link 
                    to="/chanda"
                    className="bg-white text-emerald-600 py-2.5 rounded-xl font-black text-xs active:scale-95 transition-all shadow-md text-center hover:bg-emerald-50"
                  >
                    চাঁদা সংগ্রহ
                  </Link>
                  <Link 
                    to="/donations"
                    className="bg-emerald-500/40 text-white border border-emerald-400 py-2.5 rounded-xl font-black text-xs active:scale-95 transition-all text-center hover:bg-emerald-500/65"
                  >
                    দান ও জুম্মা এন্ট্রি
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-xl tracking-tight">
              {isAdmin ? 'সাম্প্রতিক সকল লেনদেন' : 'আমার সাম্প্রতিক এন্ট্রি সমূহ'}
            </h3>
            <button className="text-xs font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-5 py-2.5 rounded-2xl transition-all flex items-center gap-2">
              সব দেখুন
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[2px]">
                  <th className="px-8 py-6">উৎস / মেম্বার</th>
                  <th className="px-8 py-6">পরিমাণ</th>
                  <th className="px-8 py-6">তারিখ</th>
                  <th className="px-8 py-6 text-center">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3.5 rounded-2xl transition-transform group-hover:scale-110 shadow-sm ${tx.type === 'Income' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                          {tx.source === 'Chanda' ? <HandCoins size={20} /> : tx.source === 'Rice Tuma' ? <Wheat size={20} /> : (tx.source === 'Donation' || tx.source === 'Friday Donation') ? <HeartHandshake size={20} /> : <Receipt size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 tracking-tight">
                            {tx.source === 'Chanda' ? 'সদস্য চাঁদা' : tx.source === 'Rice Tuma' ? 'চাল তোলা' : tx.source === 'Donation' ? 'সাধারণ দান' : tx.source === 'Friday Donation' ? 'শুক্রবার/জুম্মা দান' : tx.source}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tx.member_name || 'সাধারণ ফান্ড'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-base font-black tracking-tight ${tx.type === 'Income' ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {tx.type === 'Income' ? '+' : '-'} ৳ {tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-slate-600 font-bold">{new Date(tx.date).toLocaleDateString('bn-BD')}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider inline-block min-w-[100px] shadow-sm ${
                        tx.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                        tx.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {tx.status === 'Approved' ? 'গৃহীত' : tx.status === 'Pending' ? 'পেন্ডিং' : 'বাতিল'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-slate-200 shadow-inner">
                          <Clock size={40} />
                        </div>
                        <p className="text-slate-400 font-bold">কোন লেনদেন পাওয়া যায়নি।</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Section */}
        <div className="space-y-8">
          {isAdmin ? (
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col max-h-[460px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-slate-800 text-lg tracking-tight">সদস্য বকেয়া তালিকা</h3>
                <span className="text-[10px] font-black bg-red-50 text-red-600 px-3 py-1.5 rounded-full uppercase tracking-wider">বকেয়া</span>
              </div>
              <div className="space-y-4 overflow-y-auto flex-1 pr-1 scrollbar-thin">
                {members.filter(m => getMemberDues(m).count > 0).map(m => {
                  const dues = getMemberDues(m);
                  return (
                    <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/50 rounded-2xl transition-colors">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-sm tracking-tight">{m.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold mt-0.5">{dues.count} মাস বাকি {m.mobile ? `(${m.mobile})` : ''}</span>
                      </div>
                      <span className="text-sm font-black text-red-600">৳ {dues.amount}</span>
                    </div>
                  );
                })}
                {members.filter(m => getMemberDues(m).count > 0).length === 0 && (
                  <div className="text-center py-12 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3">
                      <Check size={24} />
                    </div>
                    <p className="text-slate-400 font-bold text-sm">কোন বকেয়া চাঁদা নেই, সব আদায় হয়েছে!</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-800 text-xl tracking-tight mb-8">আমার প্রোফাইল</h3>
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-[28px] flex items-center justify-center text-emerald-600 shadow-sm">
                  <UserIcon size={40} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-lg tracking-tight">{user.name}</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[2px] mt-1">{user.role === 'Admin' ? 'অ্যাডমিন' : 'ডাটা এন্ট্রি ইউজার'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ইউজার আইডি</span>
                  <span className="text-xs font-black text-slate-800">{user.username}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">স্ট্যাটাস</span>
                  <span className="text-xs font-black text-emerald-600">সক্রিয়</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}