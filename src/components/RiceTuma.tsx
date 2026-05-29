import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wheat, Plus, Calendar, DollarSign, Wallet, CreditCard, Smartphone, Banknote, X, Check, Clock, Eye, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const banglaMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const banglaDigits: { [key: string]: string } = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

const toBanglaNum = (numStr: string | number): string => {
  return String(numStr).split('').map(char => banglaDigits[char] || char).join('');
};

const formatBanglaDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${toBanglaNum(day)} ${banglaMonths[monthIdx]}, ${toBanglaNum(year)}`;
      }
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const monthIdx = date.getMonth();
    const year = date.getFullYear();
    return `${toBanglaNum(day)} ${banglaMonths[monthIdx]}, ${toBanglaNum(year)}`;
  } catch {
    return dateStr;
  }
};

export default function RiceTuma({ user }: { user: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    notes: ''
  });

  const fetchRecentSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('source', 'Rice Tuma')
        .order('date', { ascending: false });

      if (error) throw error;
      setRecentSales(data || []);
    } catch (err) {
      console.error('Error fetching rice sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentSales();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          type: 'Income',
          source: 'Rice Tuma',
          amount: parseFloat(formData.amount),
          date: formData.date,
          payment_method: formData.payment_method,
          notes: formData.notes || null,
          entry_by: user?.id || null,
          status: 'Pending'
        });

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ amount: '', date: new Date().toISOString().split('T')[0], payment_method: 'Cash', notes: '' });
      setSuccessMessage('চাল বিক্রির এন্ট্রি সফলভাবে জমা হয়েছে এবং অনুমোদনের অপেক্ষায় আছে।');
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchRecentSales();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'চাল বিক্রির এন্ট্রি জমা দিতে ব্যর্থ হয়েছে। দয়া করে ডাটাবেজের সঠিকতা যাচাই করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">চাল তোলা (Rice Tuma)</h2>
          <p className="text-slate-500 font-medium">সাপ্তাহিক সংগৃহীত চাল বিক্রির আয় এখানে এন্ট্রি করুন।</p>
        </div>
        <button 
          onClick={() => {
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>নতুন এন্ট্রি যোগ করুন</span>
        </button>
      </div>

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between gap-3 font-bold animate-pulse"
        >
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X size={18} />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-500">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mb-8 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-6">
            <Wheat size={48} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-3">সাপ্তাহিক চাল বিক্রি</h3>
          <p className="text-slate-500 mb-10 max-w-xs font-medium">সাপ্তাহিক সংগৃহীত চাল বিক্রি করে যে টাকা পাওয়া গেছে তা এখানে রেকর্ড করুন।</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
          >
            বিক্রয়মূল্য এন্ট্রি করুন
          </button>
        </div>

        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-black text-slate-800 text-xl mb-8 tracking-tight">সাম্প্রতিক চাল বিক্রির আয়</h3>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : recentSales.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                <Wheat size={28} />
              </div>
              <p className="font-bold text-sm">কোন চাল বিক্রির আয় পাওয়া যায়নি।</p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform font-bold">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{formatBanglaDate(sale.date)}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {sale.payment_method === 'Cash' ? 'ক্যাশ পেমেন্ট' : sale.payment_method === 'bKash' ? 'বিকাশ পেমেন্ট' : 'নগদ পেমেন্ট'}
                      </p>
                      {sale.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 font-medium italic">"{sale.notes}"</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-600">৳ {toBanglaNum(sale.amount)}</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      sale.status === 'Approved' 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                        : sale.status === 'Pending' 
                        ? 'text-amber-700 bg-amber-50 border-amber-100' 
                        : 'text-red-700 bg-red-50 border-red-100'
                    }`}>
                      {sale.status === 'Approved' ? 'অনুমোদিত' : sale.status === 'Pending' ? 'অপেক্ষমান' : 'বাতিল'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sale Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-emerald-600 p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">চাল বিক্রির তথ্য</h3>
                  <p className="text-emerald-100 text-xs font-medium mt-1">সঠিক বিক্রয়মূল্য এবং তারিখ প্রদান করুন।</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {errorMessage && (
                  <div className="bg-red-50 text-red-700 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-sm font-bold">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <p className="font-black">ব্যর্থ হয়েছে!</p>
                      <p className="font-medium mt-0.5 text-xs text-red-600/90">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">বিক্রয়মূল্য (৳)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all"
                    placeholder="মোট বিক্রয়মূল্য লিখুন"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">বিক্রির তারিখ</label>
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">পেমেন্ট মাধ্যম</label>
                    <select 
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all"
                    >
                      <option value="Cash">ক্যাশ (Cash)</option>
                      <option value="bKash">বিকাশ (bKash)</option>
                      <option value="Nagad">নগদ (Nagad)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">অতিরিক্ত নোট (ঐচ্ছিক)</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all h-28 resize-none"
                    placeholder="কোন বিশেষ তথ্য থাকলে লিখুন..."
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-200 hover:shadow-emerald-300 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Clock size={20} />
                    )}
                    <span>{submitting ? 'প্রসেস করা হচ্ছে...' : 'অনুমোদনের জন্য পাঠান'}</span>
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
