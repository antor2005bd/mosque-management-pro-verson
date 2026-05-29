import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Check, X, Edit2, HandCoins, Wheat, Receipt, User, Calendar, DollarSign, HeartHandshake } from 'lucide-react';
import { Transaction } from '../types';
import { supabase } from '../lib/supabase';

export default function ApprovalPanel() {
  const [pending, setPending] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const { data: txs, error: txsErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'Pending')
        .order('id', { ascending: false });

      if (txsErr) throw txsErr;

      const [usersRes, membersRes] = await Promise.all([
        supabase.from('users').select('id, name'),
        supabase.from('members').select('id, name')
      ]);

      const usersList = usersRes.data || [];
      const membersList = membersRes.data || [];

      const enrichedPending = (txs || []).map((tx: any) => {
        const matchingUser = usersList.find((u: any) => u.id === tx.entry_by);
        const matchingMember = membersList.find((m: any) => m.id === tx.member_id);
        return {
          ...tx,
          entry_by_name: matchingUser ? matchingUser.name : 'অজানা ব্যবহারকারী',
          member_name: matchingMember ? matchingMember.name : null
        };
      });

      setPending(enrichedPending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'Approved' })
        .eq('id', id);

      if (error) throw error;

      alert('এন্ট্রিটি সফলভাবে অনুমোদন করা হয়েছে!');
      fetchPending();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'অনুমোদন করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setActionLoading(null);
    }
  };

  const [pendingRejectId, setPendingRejectId] = useState<number | null>(null);

  const handleReject = (id: number) => {
    setPendingRejectId(id);
  };

  const executeReject = async (id: number) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'Rejected' })
        .eq('id', id);

      if (error) throw error;

      alert('এন্ট্রিটি সফলভাবে বাতিল করা হয়েছে।');
      fetchPending();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'বাতিল করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">অনুমোদন প্যানেল (Approval)</h2>
          <p className="text-slate-500 font-medium">ইউজারদের পাঠানো এন্ট্রিগুলো যাচাই করে অনুমোদন দিন।</p>
        </div>
        <div className="bg-amber-50 text-amber-700 px-6 py-3 rounded-2xl border border-amber-100 flex items-center gap-3 font-black text-sm shadow-sm">
          <CheckSquare size={20} />
          <span>{pending.length}টি পেন্ডিং এন্ট্রি</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pending.map((tx) => (
          <motion.div 
            key={tx.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-8 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500"
          >
            <div className="flex items-start sm:items-center gap-5">
              <div className={`p-5 rounded-[24px] shadow-sm transition-transform group-hover:scale-110 ${tx.type === 'Income' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                {tx.source === 'Chanda' ? <HandCoins size={32} /> : tx.source === 'Rice Tuma' ? <Wheat size={32} /> : (tx.source === 'Donation' || tx.source === 'Friday Donation') ? <HeartHandshake size={32} /> : <Receipt size={32} />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h4 className="font-black text-slate-800 text-xl tracking-tight">
                    {tx.source === 'Chanda' ? 'মাসিক চাঁদা' : tx.source === 'Rice Tuma' ? 'চাল তোলা' : tx.source === 'Donation' ? 'সাধারণ দান' : tx.source === 'Friday Donation' ? 'শুক্রবার/জুম্মা দান' : tx.source}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tx.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                    {tx.type === 'Income' ? 'আয়' : 'ব্যয়'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 font-bold">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    <span>সংগ্রাহক: <span className="text-slate-700">{tx.entry_by_name}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span>তারিখ: <span className="text-slate-700">{new Date(tx.date).toLocaleDateString('bn-BD')}</span></span>
                  </div>
                  {tx.member_name && (
                    <div className="flex items-center gap-2">
                      <HandCoins size={16} className="text-slate-400" />
                      <span>মেম্বার: <span className="text-slate-700">{tx.member_name}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8 border-t lg:border-t-0 pt-6 lg:pt-0">
              <div className="text-center sm:text-right w-full sm:w-auto">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[2px] mb-1">পরিমাণ</p>
                <p className={`text-3xl font-black ${tx.type === 'Income' ? 'text-emerald-600' : 'text-orange-600'}`}>
                  ৳ {tx.amount.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
                <button 
                  onClick={() => handleApprove(tx.id)}
                  disabled={actionLoading !== null}
                  className="flex-1 sm:flex-none w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-90 disabled:opacity-50 disabled:pointer-events-none"
                  title="অনুমোদন করুন"
                >
                  {actionLoading === tx.id ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Check size={28} />
                  )}
                </button>
                <button 
                  onClick={() => handleReject(tx.id)}
                  disabled={actionLoading !== null}
                  className="flex-1 sm:flex-none w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 hover:bg-red-500 hover:text-white transition-all active:scale-90 disabled:opacity-50 disabled:pointer-events-none"
                  title="বাতিল করুন"
                >
                  <X size={28} />
                </button>
                <button 
                  disabled={actionLoading !== null}
                  className="flex-1 sm:flex-none w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100 hover:bg-slate-100 transition-all active:scale-90 disabled:opacity-50 disabled:pointer-events-none"
                  title="সম্পাদনা"
                >
                  <Edit2 size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {pending.length === 0 && !loading && (
          <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-sm">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckSquare size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">সব কাজ শেষ!</h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">এই মুহূর্তে অনুমোদনের জন্য কোন নতুন এন্ট্রি নেই।</p>
          </div>
        )}
      </div>

      {/* Rejection Confirmation Modal */}
      {pendingRejectId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-2">বাতিল নিশ্চিতকরণ</h3>
            <p className="text-sm font-medium text-slate-500 mb-6 font-bengali">আপনি কি নিশ্চিত যে এই এন্ট্রিটি বাতিল করতে চান?</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setPendingRejectId(null)} 
                className="px-5 py-2.5 bg-slate-100 font-black hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer text-xs"
              >
                না
              </button>
              <button 
                onClick={() => {
                  const id = pendingRejectId;
                  setPendingRejectId(null);
                  executeReject(id);
                }} 
                className="px-5 py-2.5 bg-red-600 font-black hover:bg-red-700 text-white rounded-xl transition-all shadow-lg shadow-red-200 cursor-pointer text-xs"
              >
                হ্যাঁ, বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
