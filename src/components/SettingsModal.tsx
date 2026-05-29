import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Shield, 
  KeyRound, 
  Info, 
  Check, 
  AlertCircle, 
  Trash2, 
  Users, 
  Lock, 
  Unlock, 
  RefreshCw,
  UserCheck
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ user, isOpen, onClose }: SettingsModalProps) {
  // Access gate
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState('');
  const [isVerifyingGate, setIsVerifyingGate] = useState(false);

  // Active tab inside settings
  const [activeTab, setActiveTab] = useState<'info' | 'users' | 'reset'>('info');

  // Mosque Name config
  const [mosqueName, setMosqueName] = useState(localStorage.getItem('mosque_name') || 'বাইতুল মামুর জামে মসজিদ');
  const [mosqueNameStatus, setMosqueNameStatus] = useState<string | null>(null);

  // Change Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // User management
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [removePassword, setRemovePassword] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [isRemovingSubmit, setIsRemovingSubmit] = useState(false);

  // Data reset state machine
  // 0 = idle, 1 = first warning, 2 = second warning, 3 = password confirm
  const [resetStep, setResetStep] = useState<0 | 1 | 2 | 3>(0);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResettingSubmit, setIsResettingSubmit] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Fetch users list
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, role, status')
        .order('id', { ascending: true });

      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked && activeTab === 'users') {
      fetchUsers();
    }
  }, [isUnlocked, activeTab]);

  if (!isOpen) return null;

  // Gate verification
  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError('');
    if (!gatePassword) {
      setGateError('দয়া করে পাসওয়ার্ড দিন।');
      return;
    }

    try {
      setIsVerifyingGate(true);
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !dbUser) {
        setGateError('ইউজার তথ্য ডাটাবেজে পাওয়া যায়নি।');
        return;
      }

      const passwordMatch = bcrypt.compareSync(gatePassword, dbUser.password);
      if (passwordMatch) {
        setIsUnlocked(true);
      } else {
        setGateError('ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।');
      }
    } catch (err) {
      console.error(err);
      setGateError('ডাটাবেজের সাথে সংযোগ স্থাপন করা যায়নি।');
    } finally {
      setIsVerifyingGate(false);
    }
  };

  // Save Mosque Name
  const handleSaveMosqueName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mosqueName.trim()) {
      setMosqueNameStatus('দয়া করে মসজিদের একটি সঠিক নাম দিন।');
      return;
    }
    localStorage.setItem('mosque_name', mosqueName.trim());
    setMosqueNameStatus('সফলভাবে সংরক্ষিত হয়েছে! পেজ রিলোড হচ্ছে...');
    setTimeout(() => {
      setMosqueNameStatus(null);
      window.location.reload();
    }, 1200);
  };

  // Password change submission
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'দয়া করে সবগুলো ঘর পূরণ করুন।' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'নতুন পাসওয়ার্ড দুটি মিলছে না।' });
      return;
    }

    if (newPassword.length < 4) {
      setPasswordStatus({ type: 'error', text: 'পাসওয়ার্ডটি অন্তত ৪ অক্ষরের হতে হবে।' });
      return;
    }

    try {
      setIsChangingPassword(true);
      const { data: dbUser, error: selectErr } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .maybeSingle();

      if (selectErr || !dbUser) {
        setPasswordStatus({ type: 'error', text: 'ইউজার তথ্য পাওয়া যায়নি।' });
        return;
      }

      const passwordMatch = bcrypt.compareSync(currentPassword, dbUser.password);
      if (!passwordMatch) {
        setPasswordStatus({ type: 'error', text: 'আপনার বর্তমান পাসওয়ার্ডটি সঠিক নয়।' });
        return;
      }

      const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
      const { error: updateErr } = await supabase
        .from('users')
        .update({ password: hashedNewPassword })
        .eq('id', user.id);

      if (updateErr) {
        setPasswordStatus({ type: 'error', text: `পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে: ${updateErr.message}` });
      } else {
        setPasswordStatus({ type: 'success', text: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error(err);
      setPasswordStatus({ type: 'error', text: 'ডাটাবেজ সংযোগে সমস্যা হয়েছে।' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // User removal
  const handleRemoveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemoveError('');
    if (!removingUserId || !removePassword) {
      setRemoveError('পাসওয়ার্ড প্রদান করা আবশ্যক।');
      return;
    }

    try {
      setIsRemovingSubmit(true);
      const { data: dbUser, error: selectErr } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .maybeSingle();

      if (selectErr || !dbUser) {
        setRemoveError('ইউজার তথ্য পাওয়া যায়নি।');
        return;
      }

      const passwordMatch = bcrypt.compareSync(removePassword, dbUser.password);
      if (!passwordMatch) {
        setRemoveError('ভুল পাসওয়ার্ড। আপনার অ্যাডমিন পাসওয়ার্ড দিয়ে নিশ্চিত করুন।');
        return;
      }

      const { error: deleteErr } = await supabase
        .from('users')
        .delete()
        .eq('id', removingUserId);

      if (deleteErr) {
        setRemoveError(`রিমুভ করা যায়নি: ${deleteErr.message}`);
      } else {
        alert('ইউজারটি সফলভাবে রিমুভ করা হয়েছে।');
        setRemovingUserId(null);
        setRemovePassword('');
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      setRemoveError('ডাটাবেজ সংযোগে সমস্যা হয়েছে।');
    } finally {
      setIsRemovingSubmit(false);
    }
  };

  // Entire Database Reset
  const handleWipeData = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetPassword) {
      setResetError('পাসওয়ার্ড প্রদান করা আবশ্যক।');
      return;
    }

    try {
      setIsResettingSubmit(true);
      const { data: dbUser, error: selectErr } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .maybeSingle();

      if (selectErr || !dbUser) {
        setResetError('ইউজার তথ্য পাওয়া যায়নি।');
        return;
      }

      const passwordMatch = bcrypt.compareSync(resetPassword, dbUser.password);
      if (!passwordMatch) {
        setResetError('ভুল পাসওয়ার্ড। আপনার অ্যাডমিন পাসওয়ার্ড দিয়ে নিশ্চিত করুন।');
        return;
      }

      // 1. Delete all transactions
      const { error: transErr } = await supabase.from('transactions').delete().neq('id', 0);
      if (transErr) throw transErr;

      // 2. Delete all members
      const { error: membersErr } = await supabase.from('members').delete().neq('id', 0);
      if (membersErr) throw membersErr;

      setResetSuccess(true);
      setResetStep(0);
      setResetPassword('');
      setTimeout(() => {
        window.location.reload(); // Reload to refresh all calculations, dashboards and states perfectly
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setResetError(`সম্পূর্ণ তথ্য ডিলিট করা যায়নি: ${err.message || err.toString()}`);
    } finally {
      setIsResettingSubmit(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* 1. LOCK GATE SCREEN */}
      {!isUnlocked ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 p-8 space-y-6"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center border border-emerald-100/50 shadow-sm animate-pulse">
              <Lock size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">সেটিংস লক করুন</h3>
              <p className="text-slate-400 font-bold text-xs mt-1 leading-relaxed">
                সেটিংস প্যানেলে প্রবেশ করতে আপনার নিজের অ্যাডমিন পাসওয়ার্ডটি প্রদান করুন।
              </p>
            </div>
          </div>

          <form onSubmit={handleGateSubmit} className="space-y-4">
            {gateError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl flex items-center gap-3"
              >
                <AlertCircle size={18} className="flex-shrink-0" />
                <p className="text-xs font-black leading-relaxed">{gateError}</p>
              </motion.div>
            )}

            <div className="space-y-1.5 animate-none">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[1px] ml-1">অ্যাডমিন পাসওয়ার্ড</label>
              <input 
                type="password"
                required
                autoFocus
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-center text-slate-800"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all active:scale-[0.98] text-sm"
              >
                বাতিল করুন
              </button>
              <button 
                type="submit"
                disabled={isVerifyingGate}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] text-sm"
              >
                {isVerifyingGate ? 'যাচাই হচ্ছে...' : 'প্রবেশ করুন'}
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        /* 2. VERIFIED SETTINGS DASHBOARD */
        <motion.div 
          initial={{ opacity: 0, scale: 0.90, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.90, y: 15 }}
          className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col md:flex-row h-[90vh] md:h-[650px]"
        >
          {/* Left panel / sidebar inside settings */}
          <div className="bg-slate-900 text-white p-8 md:w-80 flex flex-col justify-between relative overflow-hidden flex-shrink-0">
            <div className="absolute -left-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl"></div>
            
            <div className="space-y-8 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/45">
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight leading-none">মাস্টার সেটিংস</h3>
                  <p className="text-[10px] text-emerald-400 font-black tracking-widest mt-1">অ্যাডমিন কন্ট্রোল</p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl transition-all text-xs font-black tracking-wide ${
                    activeTab === 'info' 
                      ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-950/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Info size={16} />
                  <span>তথ্য ও পাসওয়ার্ড</span>
                </button>

                <button 
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl transition-all text-xs font-black tracking-wide ${
                    activeTab === 'users' 
                      ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-950/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Users size={16} />
                  <span>অ্যাডমিন ও ইউজার তালিকা</span>
                </button>

                <button 
                  onClick={() => setActiveTab('reset')}
                  className={`w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl transition-all text-xs font-black tracking-wide ${
                    activeTab === 'reset' 
                      ? 'bg-red-600/90 text-white shadow-xl shadow-red-950/20' 
                      : 'text-slate-400 hover:bg-red-500/10 hover:text-red-400'
                  }`}
                >
                  <Trash2 size={16} />
                  <span>ডাটা রিসেট বা মুছুন</span>
                </button>
              </nav>
            </div>

            {/* Current profile status */}
            <div className="relative z-10 border-t border-white/5 pt-6 mt-8 md:mt-0 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/15 text-emerald-400 rounded-xl flex items-center justify-center font-black text-sm">
                {user.name ? user.name[0] : 'A'}
              </div>
              <div>
                <p className="font-extrabold text-xs text-slate-100">{user.name}</p>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">প্রধান অ্যাডমিন</span>
              </div>
            </div>
          </div>

          {/* Right main panel */}
          <div className="flex-1 p-8 overflow-y-auto bg-[#F8FAFC]/55 flex flex-col justify-between">
            {/* Header of internal pane */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <h4 className="text-xl font-black text-slate-800 tracking-tight">
                  {activeTab === 'info' && 'অ্যাপের তথ্য ও পাসওয়ার্ড সংশোধন'}
                  {activeTab === 'users' && 'ইউজার ও অ্যাডমিন কন্ট্রোল'}
                  {activeTab === 'reset' && 'ডাটা ডেস্ট্রাকশন সেন্ট্রাল'}
                </h4>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  {activeTab === 'info' && 'আপনার প্রোফাইল তথ্য এবং পাসওয়ার্ড পরিবর্তন করুন।'}
                  {activeTab === 'users' && 'এক অ্যাডমিন অন্য অ্যাডমিন বা ইউজার অপসারণ করুন।'}
                  {activeTab === 'reset' && '২ লেয়ার সুরক্ষায় সিস্টেমের সমস্ত হিসাবপত্র ক্লিন করুন।'}
                </p>
              </div>
              <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-slate-200/85 text-slate-500 rounded-2xl transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* TAB CONTENT 1: INFO & PASSWORD CHANGE */}
            <div className="flex-1">
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                  {/* Mosque Name Config Form */}
                  <form onSubmit={handleSaveMosqueName} className="space-y-4 pb-6 border-b border-slate-100">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">মসজিদের নাম পরিবর্তন</h5>
                    
                    {mosqueNameStatus && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3.5 rounded-2xl flex items-center gap-3 text-xs font-black border bg-emerald-50 border-emerald-105 text-emerald-800"
                      >
                        <Check size={16} />
                        <p>{mosqueNameStatus}</p>
                      </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[1px] ml-1">নামের বিবরণ</label>
                        <input 
                          type="text"
                          required
                          value={mosqueName}
                          onChange={(e) => setMosqueName(e.target.value)}
                          className="w-full px-4.5 py-3.5 bg-slate-100 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-850"
                          placeholder="মসজিদের নাম দিন (যেমন: বাইতুল মামুর জামে মসজিদ)"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="sm:self-end bg-emerald-600 hover:bg-emerald-750 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-50 transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        নাম সংরক্ষণ করুন
                      </button>
                    </div>
                  </form>

                  {/* Password Form */}
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    {passwordStatus && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-black border ${
                          passwordStatus.type === 'success' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                            : 'bg-red-50 border-red-100 text-red-800'
                        }`}
                      >
                        {passwordStatus.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                        <p>{passwordStatus.text}</p>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[1px] ml-1">বর্তমান পাসওয়ার্ড</label>
                        <input 
                          type="password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4.5 py-3.5 bg-slate-100 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-850"
                          placeholder="আপনার বর্তমানটি দিন"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[1px] ml-1">নতুন পাসওয়ার্ড</label>
                        <input 
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4.5 py-3.5 bg-slate-100 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-850"
                          placeholder="নতুন পছন্দ দিন"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[1px] ml-1">নিশ্চিত করুন</label>
                        <input 
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4.5 py-3.5 bg-slate-100 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-sm text-slate-850"
                          placeholder="পুনরায় টাইপ করুন"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isChangingPassword}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black px-6 py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2"
                    >
                      <KeyRound size={16} />
                      {isChangingPassword ? 'পাসওয়ার্ড আপডেট হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
                    </button>
                  </form>

                  {/* App details grid */}
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-[30px] grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <p className="text-[9px] text-slate-400 font-black tracking-wide uppercase">সিস্টেম সংস্করণ</p>
                      <p className="font-extrabold text-sm text-slate-700">মসজিদ ও ক্যাশ ম্যানেজমেন্ট v১.৪.০</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-black tracking-wide uppercase">ডাটাবেজ ইঞ্জিন</p>
                      <p className="font-extrabold text-sm text-slate-700">Supabase Cloud PostgreSQL</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 2: MANAGE USERS & REMOVE ADMINS */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {usersList.map((usr) => (
                        <div key={usr.id} className="bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between group hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 text-slate-700 rounded-2xl flex items-center justify-center font-black border border-slate-100">
                              {usr.name[0]}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-sm">{usr.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  usr.role === 'Admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {usr.role === 'Admin' ? 'অ্যাডমিন' : 'ডাটা এন্ট্রি ইউজার'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">@{usr.username}</span>
                              </div>
                            </div>
                          </div>
                          
                          {usr.id === user.id ? (
                            <span className="text-[10px] text-slate-400 font-black pr-4">আপনি নিজে (লগইন করা)</span>
                          ) : (
                            <button 
                              onClick={() => {
                                setRemovingUserId(usr.id);
                                setRemoveError('');
                                setRemovePassword('');
                              }}
                              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all"
                            >
                              <Trash2 size={13} />
                              রিমুভ করুন
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Specific User Removal Password confirmation Modal component */}
                  <AnimatePresence>
                    {removingUserId && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-amber-50/70 border border-amber-200/50 p-6 rounded-[30px] space-y-4"
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle className="text-amber-600 mt-1 flex-shrink-0" size={20} />
                          <div>
                            <h5 className="font-black text-amber-900 text-sm">ইউজার ডিলিট করার অনুমতি নিশ্চিত করুন</h5>
                            <p className="text-amber-800 text-xs mt-1 font-bold">
                              নিরাপত্তার স্বার্থে, এই ইউজারকে ডিলিট করার জন্য আপনার নিজের অ্যাডমিন পাসওয়ার্ড অথবা যেই অ্যাডমিনকে রিমুভ করছেন তাঁর পাসওয়ার্ডটি নিচে লিখে নিশ্চিত করুন।
                            </p>
                          </div>
                        </div>

                        {removeError && (
                          <p className="text-xs text-red-600 font-bold ml-1 flex items-center gap-1">
                            ⚠️ {removeError}
                          </p>
                        )}

                        <form onSubmit={handleRemoveUser} className="flex gap-4 items-end">
                          <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">নিশ্চিতকরণ পাসওয়ার্ড</label>
                            <input 
                              type="password"
                              required
                              value={removePassword}
                              onChange={(e) => setRemovePassword(e.target.value)}
                              placeholder="পাসওয়ার্ড লিখুন"
                              className="w-full px-4.5 py-3.5 bg-white border border-slate-200 focus:border-amber-500 rounded-2xl font-bold text-xs outline-none text-slate-800"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={() => setRemovingUserId(null)}
                              className="px-5 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs rounded-2xl transition-all"
                            >
                              বাতিল
                            </button>
                            <button 
                              type="submit"
                              disabled={isRemovingSubmit}
                              className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-red-100 transition-all flex items-center gap-1.5"
                            >
                              {isRemovingSubmit ? 'মুছে ফেলা হচ্ছে...' : 'রিমুভ করুন'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* TAB CONTENT 3: TOTAL DATABASE WIPE */}
              {activeTab === 'reset' && (
                <div className="space-y-5">
                  {resetSuccess ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 bg-emerald-50 border border-emerald-100 rounded-[35px] text-center space-y-4"
                    >
                      <div className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
                        <Check size={28} />
                      </div>
                      <h4 className="text-xl font-black text-emerald-900 tracking-tight">সব তথ্য সফলভাবে ডিলিট করা হয়েছে!</h4>
                      <p className="text-emerald-800 font-bold text-xs max-w-md mx-auto leading-relaxed">
                        সিস্টেমের সকল মেম্বার তথ্য, খরচ এবং আয়ের রসিদপত্র সম্পূর্ণ মুছে ফেলা হয়েছে। সিস্টেমকে আপ-টু-ডেট করতে ৩ সেকেন্ডের মধ্যে ড্যাশবোর্ড রিফ্রেশ হচ্ছে...
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {/* Step 0 - Initial Warning */}
                      {resetStep === 0 && (
                        <div className="bg-red-50/50 border border-red-100 p-8 rounded-[35px] text-center space-y-5">
                          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                            <Trash2 size={26} />
                          </div>
                          <div className="space-y-2">
                            <h5 className="font-black text-red-900 text-lg">আপনি কি সব হিসাব মেম্বার ডেটা ডিলিট করতে চান?</h5>
                            <p className="text-red-700 font-bold text-xs max-w-sm mx-auto leading-relaxed">
                              এই বাটনটি প্রেস করলে সিস্টেমের সকল মেম্বার, চাঁদা এন্ট্রি ও যাবতীয় খরচের হিসাব বিলুপ্ত হয়ে যাবে।
                            </p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setResetStep(1)}
                            className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-4 rounded-2xl text-xs transition-all tracking-wider shadow-lg shadow-red-200"
                          >
                            হ্যাঁ, সব হিসাব মুছে ফেলুন
                          </button>
                        </div>
                      )}

                      {/* Step 1 - First Warning Alert */}
                      {resetStep === 1 && (
                        <div className="bg-amber-50 border border-amber-200/60 p-8 rounded-[35px] space-y-5">
                          <div className="flex gap-4">
                            <AlertCircle className="text-amber-600 flex-shrink-0" size={32} />
                            <div>
                              <h5 className="font-black text-amber-900 text-base">১ম সতর্কীকরণ নোটিশ (Warning 1/2)</h5>
                              <p className="text-amber-800 font-black text-xs leading-relaxed mt-1">
                                দয়া করে পুনরায় ভেবে দেখুন! ডাটা একবার ডিলিট করার পর কোনোভাবেই ফিরিয়ে আনা (Restore) সম্ভব নয়। আপনি কি নিশ্চিত?
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4 justify-end pt-2">
                            <button 
                              onClick={() => setResetStep(0)}
                              className="px-6 py-3.5 bg-slate-150 hover:bg-slate-200 rounded-2xl font-black text-xs text-slate-700 transition-all"
                            >
                              ভুলবসত ক্লিক করেছি (ফিরে যান)
                            </button>
                            <button 
                              onClick={() => setResetStep(2)}
                              className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 rounded-2xl text-white font-black text-xs transition-all shadow-md shadow-amber-200"
                            >
                              হ্যাঁ, আমি সচেতন এবং ডিলিট করতে রাজি
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 2 - Second Critical Warning Alert */}
                      {resetStep === 2 && (
                        <div className="bg-red-600 text-white p-8 rounded-[35px] space-y-5 shadow-xl shadow-red-900/10">
                          <div className="flex gap-4">
                            <AlertCircle className="text-red-100 flex-shrink-0" size={32} />
                            <div>
                              <h5 className="font-black text-white text-base">২য় চূড়ান্ত সতর্কীকরণ (Warning 2/2)</h5>
                              <p className="text-red-100 font-black text-xs leading-relaxed mt-1">
                                এটিই শেষ সুযোগ। আপনার মসজিদের সমস্ত ফান্ড ডিস্ট্রিবিউশন হিসাব, সকল মাসের চাঁদা রিয়্যাল ডাটাবেজ থেকে মুছে ফেলার আগে আপনার পাসওয়ার্ড সাবমিট করতে হবে। আপনি কি ডিলিট করতে সম্পূর্ণরূপে দৃঢ়প্রত্যয়ী?
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4 justify-end pt-2">
                            <button 
                              onClick={() => setResetStep(0)}
                              className="px-6 py-3.5 bg-red-800 hover:bg-red-950 text-red-100 rounded-2xl font-black text-xs transition-all"
                            >
                              না, ডেটা রেখে দিন (বাতিল)
                            </button>
                            <button 
                              onClick={() => setResetStep(3)}
                              className="px-6 py-3.5 bg-white hover:bg-slate-100 rounded-2xl text-red-700 font-black text-xs transition-all shadow-md"
                            >
                              হ্যাঁ, পাসওয়ার্ড স্ক্রিনে যান
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 3 - Final Password input */}
                      {resetStep === 3 && (
                        <form onSubmit={handleWipeData} className="bg-slate-950 text-slate-100 p-8 rounded-[35px] space-y-5">
                          <div className="flex gap-4 items-center">
                            <Lock className="text-red-500 animate-pulse flex-shrink-0" size={24} />
                            <div>
                              <h5 className="font-black text-white text-sm">পাসওয়ার্ড প্রদান করে চূড়ান্ত সিলমোহর দিন</h5>
                              <p className="text-slate-400 font-bold text-[10px] mt-0.5">সব তথ্য ডিলিট করার জন্য আপনার অ্যাডমিন পাসওয়ার্ডটি দিন।</p>
                            </div>
                          </div>

                          {resetError && (
                            <p className="text-xs text-red-400 font-bold leading-relaxed">
                              ⚠️ {resetError}
                            </p>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">অ্যাডমিন পাসওয়ার্ড প্রবেশ করুন</label>
                            <input 
                              type="password"
                              required
                              autoFocus
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              placeholder="আপনার বর্তমান পাসওয়ার্ড"
                              className="w-full px-5 py-4 bg-slate-900 border border-transparent focus:border-red-500 focus:bg-slate-900 text-white rounded-2xl font-bold text-xs outline-none"
                            />
                          </div>

                          <div className="flex gap-4 justify-end pt-2">
                            <button 
                              type="button"
                              onClick={() => setResetStep(0)}
                              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-850 rounded-2xl font-black text-xs text-slate-300 transition-all border border-slate-800"
                            >
                              বাতিল করুন
                            </button>
                            <button 
                              type="submit"
                              disabled={isResettingSubmit}
                              className="px-6 py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black text-xs rounded-2xl shadow-lg shadow-red-900/30 transition-all"
                            >
                              {isResettingSubmit ? 'সম্পূর্ণ হিসাব ডিলিট হচ্ছে...' : 'চূড়ান্ত ডিলিশন সম্পন্ন করুন'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
