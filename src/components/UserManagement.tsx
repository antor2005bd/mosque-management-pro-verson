import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Search, Edit2, Shield, Phone, User as UserIcon, Check, X } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { User } from '../types';
import { supabase } from '../lib/supabase';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    mobile: '',
    role: 'Data Entry User'
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, mobile, role, status')
        .order('id', { ascending: true });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      loading && setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const normalizedUsername = formData.username.trim().toLowerCase();
      const hashedPassword = bcrypt.hashSync(formData.password, 10);
      const { error } = await supabase
        .from('users')
        .insert({
          username: normalizedUsername,
          password: hashedPassword,
          name: formData.name,
          mobile: formData.mobile || null,
          role: formData.role,
          status: 'Active'
        });

      if (error) {
        if (error.message && error.message.toLowerCase().includes('unique')) {
          alert('এই ইউজার আইডিটি ইতিমধ্যে ব্যবহৃত হয়েছে।');
        } else {
          alert(`ত্রুটি: ${error.message}`);
        }
        return;
      }

      setIsModalOpen(false);
      setFormData({ username: '', password: '', name: '', mobile: '', role: 'Data Entry User' });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert(`ইউজার তৈরিতে সমস্যা হয়েছে: ${err.message || err.toString()}`);
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert(`স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে: ${err.message || err.toString()}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.mobile?.includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">ইউজার ম্যানেজমেন্ট</h2>
          <p className="text-slate-500 font-medium">সিস্টেম ইউজার তৈরি করুন এবং তাদের রোল ম্যানেজ করুন।</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 w-full sm:w-auto"
        >
          <UserPlus size={20} />
          <span>নতুন ইউজার যোগ করুন</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="নাম বা আইডি দিয়ে খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl text-sm font-bold outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[2px]">
                <th className="px-8 py-5">ইউজার তথ্য</th>
                <th className="px-8 py-5">রোল (Role)</th>
                <th className="px-8 py-5">স্ট্যাটাস</th>
                <th className="px-8 py-5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400 font-bold">ID: {u.username} • {u.mobile || 'মোবাইল নেই'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className={u.role === 'Admin' ? 'text-emerald-600' : 'text-blue-600'} />
                      <span className={`text-xs font-black uppercase tracking-wider ${u.role === 'Admin' ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {u.role === 'Admin' ? 'অ্যাডমিন' : 'ডাটা এন্ট্রি ইউজার'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => toggleStatus(u)}
                        className={`p-3 rounded-xl transition-all ${u.status === 'Active' ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                        title={u.status === 'Active' ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                      >
                        {u.status === 'Active' ? <X size={20} /> : <Check size={20} />}
                      </button>
                      <button className="p-3 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
                        <Edit2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold">
                    কোন ইউজার পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
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
                  <h3 className="text-2xl font-black tracking-tight">নতুন ইউজার তৈরি</h3>
                  <p className="text-emerald-100 text-xs font-medium mt-1">ইউজারের সঠিক তথ্য প্রদান করুন।</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">পুরো নাম</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all"
                      placeholder="নাম লিখুন"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">মোবাইল নম্বর</label>
                    <input 
                      type="text" 
                      value={formData.mobile}
                      onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all"
                      placeholder="017XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">ইউজার আইডি (Username)</label>
                    <input 
                      type="text" 
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all"
                      placeholder="যেমন: user01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">পাসওয়ার্ড</label>
                    <input 
                      type="password" 
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">ইউজার রোল (Role)</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all"
                  >
                    <option value="Data Entry User">ডাটা এন্ট্রি ইউজার</option>
                    <option value="Admin">অ্যাডমিন</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-[0.98]"
                  >
                    ইউজার অ্যাকাউন্ট তৈরি করুন
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
