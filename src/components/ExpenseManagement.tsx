import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, Plus, Calendar, DollarSign, Wallet, X, Check, Clock, Filter, AlertCircle } from 'lucide-react';
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

export default function ExpenseManagement({ user }: { user: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    source: 'Electricity Bill',
    notes: ''
  });

  const expenseCategories = [
    { id: 'Electricity Bill', label: 'বিদ্যুৎ বিল' },
    { id: 'Water Bill', label: 'পানির বিল' },
    { id: 'Imam/Muazzin Salary', label: 'ইমাম/মুয়াজ্জিন বেতন' },
    { id: 'Repair & Maintenance', label: 'মেরামত ও রক্ষণাবেক্ষণ' },
    { id: 'Cleaning', label: 'পরিষ্কার-পরিচ্ছন্নতা' },
    { id: 'Events', label: 'অনুষ্ঠান/মাহফিল' },
    { id: 'Other', label: 'অন্যান্য' }
  ];

  const getCategoryLabel = (id: string): string => {
    const category = expenseCategories.find(cat => cat.id === id);
    return category ? category.label : id;
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'Expense')
        .order('date', { ascending: false });

      if (txErr) throw txErr;

      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('id, name');

      if (usersErr) throw usersErr;

      const enrichedExpenses = (txData || []).map((tx: any) => {
        const matchingUser = (usersData || []).find((u: any) => u.id === tx.entry_by);
        return {
          ...tx,
          entry_by_name: matchingUser ? matchingUser.name : 'অজানা ব্যবহারকারী'
        };
      });

      setExpenses(enrichedExpenses);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
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
          type: 'Expense',
          source: formData.source,
          amount: parseFloat(formData.amount),
          date: formData.date,
          notes: formData.notes || null,
          entry_by: user?.id || null,
          status: 'Pending'
        });

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ amount: '', date: new Date().toISOString().split('T')[0], source: 'Electricity Bill', notes: '' });
      setSuccessMessage('ব্যয় এন্ট্রি সফলভাবে জমা হয়েছে এবং অনুমোদনের অপেক্ষায় আছে।');
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchExpenses();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'ব্যয় এন্ট্রি দিতে ব্যর্থ হয়েছে। দয়া করে ডাটাবেজের সঠিকতা যাচাই করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredList = filterCategory === 'All' 
    ? expenses 
    : expenses.filter(exp => exp.source === filterCategory);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">ব্যয় ব্যবস্থাপনা (Expense)</h2>
          <p className="text-slate-500 font-medium">মসজিদের সকল খরচের হিসাব এখানে রেকর্ড করুন।</p>
        </div>
        <button 
          onClick={() => {
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-95 w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>নতুন ব্যয় যোগ করুন</span>
        </button>
      </div>

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between gap-3 font-bold"
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

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h3 className="font-black text-slate-800 text-xl tracking-tight">ব্যয়ের ইতিহাস</h3>
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-slate-50 font-bold text-sm text-slate-600 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-orange-500 transition-all"
            >
              <option value="All">সকল ব্যয়ের খাত</option>
              {expenseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Receipt size={40} />
            </div>
            <p className="text-slate-400 font-bold">এখনো কোন ব্যয়ের রেকর্ড পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6 max-h-[600px] overflow-y-auto scrollbar-thin">
            {filteredList.map((expense) => (
              <div 
                key={expense.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all gap-4"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-base">{getCategoryLabel(expense.source)}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-bold">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {formatBanglaDate(expense.date)}
                      </span>
                      {expense.entry_by_name && (
                        <span>• এন্ট্রি কারী: {expense.entry_by_name}</span>
                      )}
                    </div>
                    {expense.notes && (
                      <p className="text-xs text-slate-400 mt-2 font-medium italic bg-white/70 px-3 py-1.5 rounded-lg inline-block">
                        "{expense.notes}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 gap-2">
                  <p className="text-xl font-black text-orange-600">৳ {toBanglaNum(expense.amount)}</p>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                    expense.status === 'Approved' 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                      : expense.status === 'Pending' 
                      ? 'text-amber-700 bg-amber-50 border-amber-100' 
                      : 'text-red-700 bg-red-50 border-red-100'
                  }`}>
                    {expense.status === 'Approved' ? 'অনুমোদিত' : expense.status === 'Pending' ? 'অপেক্ষমান' : 'বাতিল'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-orange-600 p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">ব্যয় রেকর্ড করুন</h3>
                  <p className="text-orange-100 text-xs font-medium mt-1">খরচের সঠিক তথ্য এবং ক্যাটাগরি প্রদান করুন।</p>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">ব্যয়ের খাত (Category)</label>
                  <select 
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-orange-500 rounded-2xl font-bold outline-none transition-all"
                  >
                    {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">পরিমাণ (৳)</label>
                    <input 
                      type="number" 
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-orange-500 rounded-2xl font-bold outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">ব্যয়ের তারিখ</label>
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-orange-500 rounded-2xl font-bold outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">বিবরণ (ঐচ্ছিক)</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-orange-500 rounded-2xl font-bold outline-none transition-all h-28 resize-none"
                    placeholder="খরচ সম্পর্কে বিস্তারিত লিখুন..."
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-black py-5 rounded-2xl shadow-xl shadow-orange-200 hover:shadow-orange-300 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
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
