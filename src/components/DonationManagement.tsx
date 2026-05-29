import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HeartHandshake, 
  Plus, 
  Check, 
  Calendar, 
  HandCoins, 
  Wallet, 
  Clock, 
  User as UserIcon, 
  FileText, 
  Sparkles,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DonationManagementProps {
  user: any;
}

export default function DonationManagement({ user }: DonationManagementProps) {
  const [activeTab, setActiveTab] = useState<'Friday' | 'General'>('Friday');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recentDonations, setRecentDonations] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    donor_name: '',
    donor_mobile: '',
    notes: ''
  });

  const fetchRecentDonations = async () => {
    try {
      setLoading(true);
      // Fetch donations (source in 'Friday Donation', 'Donation')
      const { data: txs, error } = await supabase
        .from('transactions')
        .select('*')
        .in('source', ['Donation', 'Friday Donation'])
        .order('id', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Enrich with user names
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('id, name');

      if (!usersErr && usersData) {
        const enriched = (txs || []).map((tx: any) => {
          const matchingUser = usersData.find((u: any) => u.id === tx.entry_by);
          return {
            ...tx,
            entry_by_name: matchingUser ? matchingUser.name : 'অজানা ব্যবহারকারী'
          };
        });
        setRecentDonations(enriched);
      } else {
        setRecentDonations(txs || []);
      }
    } catch (err: any) {
      console.error('Error fetching recent donations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentDonations();
  }, []);

  const handleOpenModal = (type: 'Friday' | 'General') => {
    setActiveTab(type);
    setFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'Cash',
      donor_name: type === 'Friday' ? 'জুম্মার দিনের বাক্স' : '',
      donor_mobile: '',
      notes: ''
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setErrorMessage('দয়া করে সঠিক পরিমাণ টাকা লিখুন।');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const isFriday = activeTab === 'Friday';
    const source = isFriday ? 'Friday Donation' : 'Donation';
    let donorInfo = formData.donor_name.trim();

    if (!isFriday) {
      if (!donorInfo) {
        donorInfo = 'নাম প্রকাশে অনিচ্ছুক';
      }
    } else {
      donorInfo = 'জুম্মা/শুক্রবার বক্স';
    }

    // Combine notes with donor info if applicable
    const finalNotes = [
      !isFriday && formData.donor_name ? `দাতা: ${formData.donor_name}` : '',
      !isFriday && formData.donor_mobile ? `মোবাইল: ${formData.donor_mobile}` : '',
      formData.notes ? `মন্তব্য: ${formData.notes}` : ''
    ].filter(Boolean).join(' | ');

    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          type: 'Income',
          source: source,
          amount: parseFloat(formData.amount),
          date: formData.date,
          payment_method: formData.payment_method,
          notes: finalNotes || donorInfo,
          entry_by: user?.id || null,
          status: 'Pending'
        });

      if (error) throw error;

      setIsModalOpen(false);
      setSuccessMessage('দান সংগ্রহের এন্ট্রি পেন্ডিং হিসেবে সফলভাবে এন্ট্রি করা হয়েছে। অনুমোদনের অপেক্ষায় আছে।');
      setTimeout(() => setSuccessMessage(null), 6000);
      fetchRecentDonations();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'ডাটাবেজে এন্ট্রি প্রসেস করতে ব্যর্থ হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper stats for Preview Box
  const totalFridayThisMonth = recentDonations
    .filter(t => t.source === 'Friday Donation' && t.status === 'Approved')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalGeneralThisMonth = recentDonations
    .filter(t => t.source === 'Donation' && t.status === 'Approved')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">দান ও জুম্মা কালেকশন (Donations)</h2>
          <p className="text-slate-500 font-medium font-bengali">মসজিদের সাধারণ দান এবং শুক্রবারের জুম্মার বক্স কালেকশন এন্ট্রি করুন।</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => handleOpenModal('Friday')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={18} />
            <span>শুক্রবার/জুম্মা দান</span>
          </button>
          <button 
            onClick={() => handleOpenModal('General')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-black px-6 py-4 rounded-2xl shadow-xl shadow-teal-200 transition-all active:scale-95 cursor-pointer"
          >
            <HeartHandshake size={18} />
            <span>সাধারণ দান এন্ট্রি</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between gap-3 font-bold shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        </motion.div>
      )}

      {/* Decorative Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 p-6 rounded-[28px] relative overflow-hidden flex items-center gap-5">
          <div className="p-4 bg-emerald-500 text-white rounded-2xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">এ মাসের মোট জুম্মা দান (অনুমোদিত)</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">৳{totalFridayThisMonth.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-cyan-50/50 border border-teal-100 p-6 rounded-[28px] relative overflow-hidden flex items-center gap-5">
          <div className="p-4 bg-teal-500 text-white rounded-2xl">
            <HeartHandshake size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">এ মাসের সাধারণ দান (অনুমোদিত)</p>
            <p className="text-2xl font-black text-teal-700 mt-1">৳{totalGeneralThisMonth.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/10 border border-slate-100 p-6 rounded-[28px] relative overflow-hidden flex items-center gap-5 md:col-span-2 lg:col-span-1">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <Sparkles size={20} />
          </div>
          <div className="text-xs font-bold text-slate-600">
            <p className="font-extrabold text-slate-800">রিয়েল-টাইম ট্রান্সপারেন্সি</p>
            <p className="text-[11px] leading-relaxed mt-0.5 text-slate-500">কোনো ইউজার এন্ট্রি জমা দিলে সেটি পেন্ডিং অবস্থায় থাকে এবং শুধুমাত্র অ্যাডমিন অনুমোদন দিলেই রিপোর্ট ও ড্যাশবোর্ডে যুক্ত হয়।</p>
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800">দান এন্ট্রির তালিকা (সর্বশেষ ১০টি)</h3>
            <p className="text-xs text-slate-450 font-medium">আপনার এন্ট্রি করা সাম্প্রতিক সাধারণ ও জুম্মা দানসমূহ</p>
          </div>
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            <Clock size={20} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="mx-auto w-10 h-10 border-4 border-slate-105 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-3 font-semibold">তথ্য সন্ধান করা হচ্ছে...</p>
          </div>
        ) : recentDonations.length === 0 ? (
          <div className="border border-dashed border-slate-100 rounded-2xl py-12 text-center text-slate-400">
            <HeartHandshake className="mx-auto mb-2 text-slate-300" size={32} />
            <p className="text-xs font-black">কোনো দান এন্ট্রি পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-4 text-center">তারিখ</th>
                  <th className="py-4 px-4">উৎস</th>
                  <th className="py-4 px-4">বিবরণ / দাতা</th>
                  <th className="py-4 px-4 text-center">পদ্ধতি</th>
                  <th className="py-4 px-4 text-center">সংগ্রাহক</th>
                  <th className="py-4 px-4 text-center">অবস্থা</th>
                  <th className="py-4 px-4 text-right">পরিমাণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                {recentDonations.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 text-center text-slate-400 font-mono">
                      {tx.date}
                    </td>
                    <td className="py-4 px-4 font-black">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] ${
                        tx.source === 'Friday Donation'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-teal-50 text-teal-700'
                      }`}>
                        {tx.source === 'Friday Donation' ? 'শুক্রবার/জুম্মা দান' : 'সাধারণ দান'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 max-w-[180px] truncate">
                      {tx.notes || '-'}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-slate-400">
                      {tx.payment_method || 'Cash'}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-500">
                      {tx.entry_by_name}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        tx.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                        tx.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {tx.status === 'Approved' ? 'অনুমোদিত' :
                         tx.status === 'Rejected' ? 'বাতিল' : 'অপেক্ষমান'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-black text-emerald-600 text-sm">
                      ৳{Number(tx.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl relative z-10 border border-slate-100 overflow-hidden"
            >
              {/* Decorative side accent */}
              <div className={`absolute top-0 left-0 right-0 h-2 ${
                activeTab === 'Friday' ? 'bg-emerald-500' : 'bg-teal-500'
              }`} />

              <h3 className="font-black text-slate-800 text-xl tracking-tight mb-2">
                {activeTab === 'Friday' ? 'শুক্রবার/জুম্মা দান এন্ট্রি' : 'সাধারণ দান কালেকশন এন্ট্রি'}
              </h3>
              <p className="text-slate-400 font-medium text-xs mb-6">
                {activeTab === 'Friday' 
                  ? 'সাপ্তাহিক জুম্মা নামাজ উপলক্ষে সংগৃহীত ক্যাশ বক্সের টাকা এন্ট্রি করুন।' 
                  : 'কোনো নির্দিষ্ট বা অনির্দিষ্ট ব্যক্তি যখন সরাসরি দান বা অনুদান প্রধান করবেন।'}
              </p>

              {errorMessage && (
                <div className="mb-4 bg-red-50 text-red-700 border border-red-100 p-4 rounded-xl text-xs font-bold">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === 'General' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider ml-1">দাতার নাম (Donor Name)</label>
                        <input 
                          type="text" 
                          placeholder="উদা: আব্দুল করিম (অথবা ফালি রাখুন)"
                          value={formData.donor_name}
                          onChange={(e) => setFormData({...formData, donor_name: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-teal-500 rounded-xl font-bold outline-none transition-all text-sm shadow-inner"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider ml-1">মোবাইল নং (ঐচ্ছিক)</label>
                        <input 
                          type="text" 
                          placeholder="উদা: 017xxxxxxxx"
                          value={formData.donor_mobile}
                          onChange={(e) => setFormData({...formData, donor_mobile: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-teal-500 rounded-xl font-bold outline-none transition-all text-sm shadow-inner"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider ml-1">টাকার পরিমাণ (Amount in Taka)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">৳</span>
                    <input 
                      type="number" 
                      required
                      placeholder="উদা: 500"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className={`w-full pl-8 pr-4 py-4 bg-slate-50 border border-transparent rounded-xl font-extrabold outline-none transition-all text-lg shadow-inner ${
                        activeTab === 'Friday' ? 'focus:border-emerald-500 focus:bg-white' : 'focus:border-teal-500 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider ml-1">তারিখ (Date)</label>
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-xl font-bold outline-none transition-all text-sm shadow-inner"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider ml-1">পেমেন্ট মেথড</label>
                    <select 
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-xl font-bold outline-none transition-all text-sm shadow-inner cursor-pointer"
                    >
                      <option value="Cash">Cash (নগদ)</option>
                      <option value="bKash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ)</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="Other">অন্যান্য</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider ml-1">মন্তব্য (প্রয়োজনে)</label>
                  <textarea 
                    placeholder={activeTab === 'Friday' ? 'উদা: জুম্মার খুতবার দান বাক্স সংগ্রহ...' : 'কোনো বিশেষ নির্দেশ থাকলে লিখুন'}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white rounded-xl font-bold outline-none transition-all text-sm shadow-inner resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-black text-sm transition-colors border border-slate-150 cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className={`flex-1 py-4 text-white rounded-2xl font-black text-sm transition-all focus:ring-4 cursor-pointer shadow-lg disabled:opacity-50 ${
                      activeTab === 'Friday' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                        : 'bg-teal-600 hover:bg-teal-700 shadow-teal-200'
                    }`}
                  >
                    {submitting ? 'প্রসেস হচ্ছে...' : 'এন্ট্রি সাবমিট করুন'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
