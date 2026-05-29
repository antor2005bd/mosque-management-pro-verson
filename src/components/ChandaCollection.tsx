import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HandCoins, 
  Search, 
  Calendar, 
  DollarSign, 
  Wallet, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  X, 
  Check, 
  Clock, 
  Plus, 
  AlertCircle, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { Member, Transaction } from '../types';
import { supabase } from '../lib/supabase';

// Help functions to parse/format Bengali date and calculate outstanding dues
const banglaMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const getBanglaMonthNameWithYear = (yearMonthStr: string): string => {
  if (!yearMonthStr) return '';
  try {
    const parts = yearMonthStr.split('-');
    if (parts.length < 2) return yearMonthStr;
    const [year, monthStr] = parts;
    const monthIdx = parseInt(monthStr, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${banglaMonths[monthIdx]} ${year}`;
    }
    return yearMonthStr;
  } catch {
    return yearMonthStr;
  }
};

const generateMonthRange = (startMonthStr: string, endMonthStr: string): string[] => {
  if (!startMonthStr) return [];
  const range: string[] = [];
  try {
    const [startYear, startMonth] = startMonthStr.split('-').map(Number);
    const [endYear, endMonth] = endMonthStr.split('-').map(Number);
    
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (
      currentYear < endYear || 
      (currentYear === endYear && currentMonth <= endMonth)
    ) {
      const monthFormatted = String(currentMonth).padStart(2, '0');
      range.push(`${currentYear}-${monthFormatted}`);
      
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
  } catch (e) {
    console.error('Error generating month range', e);
  }
  return range;
};

export default function ChandaCollection({ user }: { user: any }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Collection checklist states
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [isAddingAdvance, setIsAddingAdvance] = useState(false);
  const [advanceMonth, setAdvanceMonth] = useState('');

  const [formData, setFormData] = useState({
    payment_method: 'Cash',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchMembers = async () => {
    try {
      const { data: membersData, error: mErr } = await supabase
        .from('members')
        .select('*')
        .order('id', { ascending: true });

      if (mErr) throw mErr;

      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select('member_id, amount, status, month, source');

      if (txErr) throw txErr;

      const enrichedMembers = (membersData || []).map((m: any) => {
        const memberTxs = (txs || []).filter((t: any) => t.member_id === m.id);
        const approvedTxs = memberTxs.filter((t: any) => t.status === 'Approved');
        
        const total_paid = approvedTxs.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const chandaPayments = memberTxs.filter((t: any) => t.source === 'Chanda');
        
        const paid_months = chandaPayments.filter((t: any) => t.status === 'Approved' && t.month).map((t: any) => t.month);
        const pending_months = chandaPayments.filter((t: any) => t.status === 'Pending' && t.month).map((t: any) => t.month);

        return {
          ...m,
          total_paid,
          paid_months,
          pending_months
        };
      });

      setMembers(enrichedMembers);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  // Helper inside component to get currently outstanding months for a member
  const getMemberDuesList = (member: Member) => {
    const current = new Date();
    const currentMonthFormatted = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    
    // Generate all months from member's start_month to current month
    const totalMonthsRange = generateMonthRange(member.start_month, currentMonthFormatted);
    
    const paid = member.paid_months || [];
    const pending = member.pending_months || [];
    
    // Filter out months that are already paid or pending
    return totalMonthsRange.filter(m => !paid.includes(m) && !pending.includes(m));
  };

  const handleOpenModal = (member: Member) => {
    setSelectedMember(member);
    // Pre-select all calculated due months
    const dues = getMemberDuesList(member);
    setSelectedMonths(dues);
    setIsAddingAdvance(false);
    setAdvanceMonth('');
    setIsModalOpen(true);
  };

  const handleToggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month].sort());
    }
  };

  const handleAddAdvanceMonth = () => {
    if (!advanceMonth) return;
    if (selectedMonths.includes(advanceMonth)) {
      alert('এই মাসটি ইতিমধ্যেই তালিকায় যোগ করা হয়েছে।');
      return;
    }
    
    // Check if it's already paid or pending
    if (selectedMember?.paid_months?.includes(advanceMonth)) {
      alert('এই মাসটির চাঁদা ইতিমধ্যেই পরিশোধ করা হয়েছে।');
      return;
    }
    if (selectedMember?.pending_months?.includes(advanceMonth)) {
      alert('এই মাসটির চাঁদা অনুমোদনের অপেক্ষায় আছে।');
      return;
    }

    setSelectedMonths([...selectedMonths, advanceMonth].sort());
    setIsAddingAdvance(false);
    setAdvanceMonth('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (selectedMonths.length === 0) {
      setErrorMessage('দয়া করে নুন্যতম একটি মাস নির্বাচন করুন।');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const inserts = selectedMonths.map(month => ({
        type: 'Income',
        source: 'Chanda',
        member_id: selectedMember.id,
        amount: Number(selectedMember.monthly_amount),
        date: formData.date,
        month: month,
        payment_method: formData.payment_method,
        entry_by: user?.id || null,
        status: 'Pending'
      }));

      const { error } = await supabase
        .from('transactions')
        .insert(inserts);

      if (error) throw error;

      setIsModalOpen(false);
      setSuccessMessage(`সফলভাবে ${selectedMonths.length} মাসের চাঁদা অনুমোদনের জন্য পাঠানো হয়েছে।`);
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchMembers();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'ডাটাবেজে সংযোগ করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.status === 'Active' && 
    (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.mobile.includes(searchTerm))
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">মাসিক চাঁদা সংগ্রহ</h2>
          <p className="text-slate-500 font-medium font-bengali">সদস্যদের বকেয়া বা অগ্রিম চাঁদা সংগ্রহ এবং ট্র্যাকিং প্যানেল।</p>
        </div>
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

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="মেম্বারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-bold outline-none transition-all shadow-sm shadow-slate-100/50"
            />
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-100">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              সব পরিশোধিত
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-100">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
              বকেয়া রয়েছে
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 sm:p-8">
          {filteredMembers.map((m) => {
            const duesList = getMemberDuesList(m);
            const totalDuesAmount = duesList.length * m.monthly_amount;
            const hasDues = duesList.length > 0;

            return (
              <motion.div 
                key={m.id}
                whileHover={{ y: -5 }}
                className={`bg-white border ${hasDues ? 'border-amber-200/65 shadow-amber-500/5' : 'border-slate-100 hover:border-emerald-200'} rounded-[24px] p-6 flex flex-col justify-between group hover:shadow-xl transition-all duration-300 relative`}
              >
                {/* Visual Status Indicator corner */}
                <div className="absolute top-6 right-6">
                  {hasDues ? (
                    <span className="bg-amber-50 text-amber-600 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Clock size={10} className="animate-pulse" />
                      {duesList.length} মাস বাকি
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle size={10} />
                      পরিশোধিত
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 ${hasDues ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'} rounded-2xl flex items-center justify-center shadow-sm font-bold`}>
                      <HandCoins size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-base">{m.name}</h4>
                      <p className="text-xs text-slate-400 font-bold">{m.mobile}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-6 flex-1">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-50 text-left">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">মাসিক চাঁদা</span>
                      <span className="text-sm font-black text-slate-800">৳ {m.monthly_amount}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-50 text-left">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">মোট জমা (অনুমোদিত)</span>
                      <span className="text-sm font-black text-emerald-600">৳ {m.total_paid || 0}</span>
                    </div>
                  </div>

                  {/* Dues breakdown (Requested functionality) */}
                  <div className="bg-slate-50/55 rounded-2xl p-4 border border-slate-100 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">বকেয়া মাসসমূহের তালিকা:</span>
                      {hasDues ? (
                        <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                          {duesList.map((month) => (
                            <span key={month} className="bg-amber-100/70 border border-amber-200/50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                              {getBanglaMonthNameWithYear(month)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs font-black text-emerald-600 flex items-center gap-1.5 py-1">
                          <CheckCircle size={14} />
                          সব পরিশোধ করা আছে (কোন বকেয়া নেই)
                        </div>
                      )}
                    </div>

                    {hasDues && (
                      <div className="border-t border-slate-200/50 mt-3 pt-2 flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">মোট বকেয়া পরিমাণ:</span>
                        <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">৳ {totalDuesAmount}</span>
                      </div>
                    )}
                  </div>

                  {/* Paid / Pending logs indicator */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 pt-1 font-bold">
                    <span>শুরুর মাস: {getBanglaMonthNameWithYear(m.start_month)}</span>
                    <span className="text-right">
                      {m.paid_months && m.paid_months.length > 0 && `${m.paid_months.length} মাস আদায়`}
                      {m.pending_months && m.pending_months.length > 0 && ` (${m.pending_months.length} মাস পেন্ডিং)`}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => handleOpenModal(m)}
                  className={`w-full py-3.5 rounded-2xl transition-all shadow-lg font-black text-xs ${
                    hasDues 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                  } active:scale-95`}
                >
                  {hasDues ? 'বকেয়া চাঁদা সংগ্রহ করুন' : 'অগ্রিম চাঁদা সংগ্রহ'}
                </button>
              </motion.div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <Search size={32} />
                </div>
                <p className="text-slate-400 font-bold">চলতি সচল কোন মেম্বার পাওয়া যায়নি।</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collection Modal with Select Dues functionality */}
      <AnimatePresence>
        {isModalOpen && selectedMember && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="bg-emerald-600 p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">চাঁদা সংগ্রহ প্যানেল</h3>
                  <p className="text-emerald-100 text-xs font-semibold mt-1">সদস্য: {selectedMember.name} • মোবাইল: {selectedMember.mobile}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                {errorMessage && (
                  <div className="bg-red-50 text-red-700 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-sm font-bold">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <p className="font-black">ব্যর্থ হয়েছে!</p>
                      <p className="font-medium mt-0.5 text-xs text-red-600/90">{errorMessage}</p>
                    </div>
                  </div>
                )}
                
                {/* 1. Month Multi-selection layout */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] ml-1">চাঁদা প্রদানের মাসসমূহ নির্বাচন করুন</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        const dues = getMemberDuesList(selectedMember);
                        setSelectedMonths(selectedMonths.length === dues.length ? [] : dues);
                      }}
                      className="text-xs text-emerald-600 font-bold hover:underline"
                    >
                      {selectedMonths.length === getMemberDuesList(selectedMember).length ? 'সব আনচেক করুন' : 'বকেয়া সব চেক করুন'}
                    </button>
                  </div>

                  {/* Calculation Area */}
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-4">
                    {/* Checklist of outstanding months */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-400 block mb-1">বকেয়া মাসসমূহ:</span>
                      {getMemberDuesList(selectedMember).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                          {getMemberDuesList(selectedMember).map((mKey) => (
                            <button
                              key={mKey}
                              type="button"
                              onClick={() => handleToggleMonth(mKey)}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                                selectedMonths.includes(mKey)
                                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                                selectedMonths.includes(mKey) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {selectedMonths.includes(mKey) && <Check size={12} strokeWidth={3} />}
                              </div>
                              <span className="text-xs">{getBanglaMonthNameWithYear(mKey)}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-500 py-1">কোন বকেয়া মাস নেই।</p>
                      )}
                    </div>

                    {/* Advance / Custom month insert logic */}
                    <div className="border-t border-slate-200 mt-3 pt-3">
                      {!isAddingAdvance ? (
                        <button
                          type="button"
                          onClick={() => setIsAddingAdvance(true)}
                          className="flex items-center gap-1 text-xs text-emerald-600 font-black hover:bg-emerald-50 px-2 py-1.5 rounded-lg transition-all"
                        >
                          <Plus size={16} />
                          অগ্রিম বা নতুন মাসের খোঁজ যোগ করুন
                        </button>
                      ) : (
                        <div className="flex items-end gap-2 bg-white p-3 rounded-2xl border border-slate-200">
                          <div className="flex-1 space-y-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">গ্রুপ মাস নির্বাচন করুন (অগ্রিম)</span>
                            <input 
                              type="month"
                              value={advanceMonth}
                              onChange={(e) => setAdvanceMonth(e.target.value)}
                              className="w-full p-2 bg-slate-50/70 border border-slate-200 focus:border-emerald-500 text-xs rounded-xl outline-none font-bold"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddAdvanceMonth}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all"
                          >
                            যোগ
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingAdvance(false)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs p-2.5 rounded-xl transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Show selected review array */}
                    {selectedMonths.length > 0 && (
                      <div className="border-t border-slate-200 mt-2 pt-3 flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] font-black text-slate-400 mr-1 uppercase">পরিশোধের জন্য পছন্দকৃত:</span>
                        {selectedMonths.map(m => (
                          <span key={m} className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            {getBanglaMonthNameWithYear(m)}
                            <button type="button" onClick={() => handleToggleMonth(m)} className="hover:text-red-600 ml-0.5">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount and payments calculation row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">মোট পরিশোধের পরিমাণ (৳)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 font-black text-base">৳</span>
                      <input 
                        type="text" 
                        readOnly
                        value={selectedMonths.length * selectedMember.monthly_amount}
                        className="w-full pl-9 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none cursor-not-allowed"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 block ml-1 leading-tight">
                      {selectedMember.monthly_amount} ৳ x {selectedMonths.length} মাস
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">পেমেন্ট মাধ্যম</label>
                    <select 
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm"
                    >
                      <option value="Cash">ক্যাশ (Cash)</option>
                      <option value="bKash">বিকাশ (bKash)</option>
                      <option value="Nagad">নগদ (Nagad)</option>
                      <option value="Bank">ব্যাংক (Bank)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">প্রদানের তারিখ</label>
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button 
                    type="submit"
                    disabled={submitting || selectedMonths.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-emerald-200 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Clock size={20} />
                        <span>সংগ্রহ নিশ্চিত করুন এবং অনুমোদনের জন্য পাঠান ({selectedMonths.length} মাস)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-3 font-semibold tracking-wide">
                    অ্যাডমিন প্যানেল থেকে ট্রানজেকশনটি অ্যাপ্রুভ করার সাথে সাথে এটি চূড়ান্ত পরিশোধ হবে।
                  </p>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
