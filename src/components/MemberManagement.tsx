import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Search, Edit2, Phone, Calendar, DollarSign, X, Check, User as UserIcon } from 'lucide-react';
import { Member } from '../types';
import { supabase } from '../lib/supabase';

export default function MemberManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    monthly_amount: '',
    start_month: new Date().toISOString().slice(0, 7)
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    monthly_amount: '',
    start_month: '',
    status: 'Active'
  });

  const fetchMembers = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleOpenEditModal = (member: Member) => {
    setSelectedMember(member);
    setEditFormData({
      name: member.name,
      mobile: member.mobile || '',
      monthly_amount: String(member.monthly_amount),
      start_month: member.start_month || '',
      status: member.status || 'Active'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      const { error } = await supabase
        .from('members')
        .update({
          name: editFormData.name,
          mobile: editFormData.mobile || null,
          monthly_amount: parseFloat(editFormData.monthly_amount),
          start_month: editFormData.start_month,
          status: editFormData.status
        })
        .eq('id', selectedMember.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (err: any) {
      console.error(err);
      alert(`মেম্বারের তথ্য আপডেট করতে সমস্যা হয়েছে: ${err.message || err.toString()}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('members')
        .insert({
          name: formData.name,
          mobile: formData.mobile || null,
          monthly_amount: parseFloat(formData.monthly_amount),
          start_month: formData.start_month,
          status: 'Active'
        });

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ name: '', mobile: '', monthly_amount: '', start_month: new Date().toISOString().slice(0, 7) });
      fetchMembers();
    } catch (err: any) {
      console.error(err);
      alert(`মেম্বার রেজিস্ট্রেশন করতে সমস্যা হয়েছে: ${err.message || err.toString()}`);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.mobile.includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">মেম্বার তালিকা</h2>
          <p className="text-slate-500 font-medium">মসজিদের সকল মেম্বার এবং তাদের মাসিক চাঁদার তথ্য এখানে দেখুন।</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 w-full sm:w-auto"
        >
          <UserPlus size={20} />
          <span>নতুন মেম্বার যোগ করুন</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="নাম বা মোবাইল দিয়ে খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl text-sm font-bold outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[2px]">
                <th className="px-8 py-5">মেম্বার তথ্য</th>
                <th className="px-8 py-5">মাসিক চাঁদা</th>
                <th className="px-8 py-5">মোট জমা</th>
                <th className="px-8 py-5">অবস্থা</th>
                <th className="px-8 py-5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-400 font-bold">{m.mobile} • {m.start_month} থেকে</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-base font-black text-slate-800">৳ {m.monthly_amount.toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-base font-black text-emerald-600">৳ {(m.total_paid || 0).toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider inline-block ${
                      m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {m.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleOpenEditModal(m)}
                      className="p-3 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all animate-none"
                    >
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Search size={32} />
                      </div>
                      <p className="text-slate-400 font-bold">কোন মেম্বার পাওয়া যায়নি।</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
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
                  <h3 className="text-2xl font-black tracking-tight">নতুন মেম্বার যোগ করুন</h3>
                  <p className="text-emerald-100 text-xs font-medium mt-1">মেম্বারের সকল তথ্য সঠিকভাবে পূরণ করুন।</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">মেম্বারের নাম</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-800"
                    placeholder="মেম্বারের পূর্ণ নাম লিখুন"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">মোবাইল নম্বর</label>
                  <input 
                    type="text" 
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-800"
                    placeholder="০১XXXXXXXXX"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">মাসিক চাঁদা (৳)</label>
                    <input 
                    type="number" 
                    required
                    value={formData.monthly_amount}
                    onChange={(e) => setFormData({...formData, monthly_amount: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-800"
                    placeholder="৫০০"
                  />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">শুরুর মাস</label>
                    <input 
                      type="month" 
                      required
                      value={formData.start_month}
                      onChange={(e) => setFormData({...formData, start_month: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-[0.98]"
                  >
                    মেম্বার রেজিস্ট্রেশন সম্পন্ন করুন
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && selectedMember && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="bg-emerald-600 p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{selectedMember.name}-এর তথ্য সংশোধন</h3>
                  <p className="text-emerald-100 text-xs font-semibold mt-1">মেম্বারের তথ্য বা শুরু করার মাস পরিবর্তন করুন।</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">মেম্বারের নাম</label>
                  <input 
                    type="text" 
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-800"
                    placeholder="নাম লিখুন"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">মোবাইল নম্বর</label>
                  <input 
                    type="text" 
                    required
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({...editFormData, mobile: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-800"
                    placeholder="০১XXXXXXXXX"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">মাসিক চাঁদা (৳)</label>
                    <input 
                      type="number" 
                      required
                      value={editFormData.monthly_amount}
                      onChange={(e) => setEditFormData({...editFormData, monthly_amount: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">শুরুর মাস (চাঁদা শুরুর সময়)</label>
                    <input 
                      type="month" 
                      required
                      value={editFormData.start_month}
                      onChange={(e) => setEditFormData({...editFormData, start_month: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-800"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/50">
                  <p className="text-[10px] sm:text-xs text-amber-800 leading-relaxed font-bold">
                    💡 **বকেয়া নিল বা মওকুফ করার টিপস:**
                    <br />
                    যদি কোনো মেম্বারের পূর্ববর্তী সকল বকেয়া সম্পূর্ণ মওকুফ/নীল (০ ৳) করতে চান, তবে তাঁর **'শুরুর মাস'** পরিবর্তন করে চলতি মাস বা আগামী মাস হিসেবে সেট করে দিন। এর ফলে পেছনের কোনো বকেয়া আর থাকবে না।
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">অবস্থা (Status)</label>
                  <select 
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-800"
                  >
                    <option value="Active">সক্রিয় (Active)</option>
                    <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4.5 rounded-2xl transition-all active:scale-[0.98]"
                  >
                    বাতিল করুন
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-[0.98]"
                  >
                    তথ্য সংরক্ষণ করুন
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
