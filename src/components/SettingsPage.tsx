import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  KeyRound, 
  Home, 
  Check, 
  AlertCircle, 
  Trash2, 
  Users, 
  Lock,
  RefreshCw
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  // Access control lock gate
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState('');
  const [isVerifyingGate, setIsVerifyingGate] = useState(false);

  // Mosque Name config
  const [mosqueName, setMosqueName] = useState(localStorage.getItem('mosque_name') || 'mosque-management');
  const [mosqueNameStatus, setMosqueNameStatus] = useState<string | null>(null);

  // Change Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // User list moderation
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [removePassword, setRemovePassword] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [isRemovingSubmit, setIsRemovingSubmit] = useState(false);

  // Data reset steps
  const [resetStep, setResetStep] = useState<0 | 1 | 2 | 3>(0);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResettingSubmit, setIsResettingSubmit] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Load logged in user info
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('mosque_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch users list (can load directly once unlocked)
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
    if (isUnlocked) {
      fetchUsers();
    }
  }, [isUnlocked]);

  // Handle Gate unlocking
  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError('');
    if (!gatePassword) {
      setGateError('দয়া করে আপনার অ্যাডমিন পাসওয়ার্ডটি দিন।');
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
        setGateError('ডাটাবেজে ব্যবহারকারীর তথ্য পাওয়া যায়নি।');
        return;
      }

      const passwordMatch = bcrypt.compareSync(gatePassword, dbUser.password);
      if (passwordMatch) {
        setIsUnlocked(true);
      } else {
        setGateError('পাসওয়ার্ডটি সঠিক নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      }
    } catch (err) {
      console.error(err);
      setGateError('ডাটাবেজের সাথে যোগাযোগ করা সম্ভব হয়নি।');
    } finally {
      setIsVerifyingGate(false);
    }
  };

  // Save Mosque Name Action
  const handleSaveMosqueName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mosqueName.trim()) {
      setMosqueNameStatus('দয়া করে মসজিদের একটি সঠিক নাম দিন।');
      return;
    }
    localStorage.setItem('mosque_name', mosqueName.trim());
    setMosqueNameStatus('সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => {
      setMosqueNameStatus(null);
      window.location.reload(); // Refresh to update title immediately everywhere
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

  // User Deletion moderative action
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

  // Entire Database Reset Action
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

      // Delete all transactions query
      const { error: transErr } = await supabase.from('transactions').delete().neq('id', 0);
      if (transErr) throw transErr;

      // Delete all members query
      const { error: membersErr } = await supabase.from('members').delete().neq('id', 0);
      if (membersErr) throw membersErr;

      setResetSuccess(true);
      setResetStep(0);
      setResetPassword('');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setResetError(`সম্পূর্ণ তথ্য ডিলিট করা যায়নি: ${err.message || err.toString()}`);
    } finally {
      setIsResettingSubmit(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 px-2 sm:px-4 max-w-4xl mx-auto font-sans">
      {/* Title */}
      <div className="text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center justify-center sm:justify-start gap-2">
          <Shield className="text-emerald-600" size={28} />
          মাস্টার সেটিংস ও নিয়ন্ত্রণ প্যানেল
        </h2>
        <p className="text-slate-500 font-bold text-xs sm:text-sm mt-1">মসজিদের নাম, অ্যাডমিন পাসওয়ার্ড পরিবর্তন ও ব্যবহারকারী নিয়ন্ত্রণ করুন।</p>
      </div>

      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          /* Lock Gate Password Form: Elegant Light Overlay */
          <motion.div 
            key="lock-gate"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[28px] border border-slate-200/80 shadow-md p-6 sm:p-10 max-w-md mx-auto text-center space-y-6"
          >
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
              <Lock size={26} />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-800">সেটিংসে প্রবেশ করুন</h3>
              <p className="text-slate-400 font-bold text-xs mt-1.5 leading-relaxed">
                নিরাপত্তার স্বার্থে, এই প্যানেলে প্রবেশ করতে আপনার নিজের অ্যাডমিন পাসওয়ার্ডটি প্রদান করুন।
              </p>
            </div>

            <form onSubmit={handleGateSubmit} className="space-y-4">
              {gateError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl flex items-center gap-2 text-xs font-bold text-left leading-relaxed">
                  <AlertCircle size={15} className="shrink-0" />
                  <p>{gateError}</p>
                </div>
              )}

              <div className="text-left space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">অ্যাডমিন পাসওয়ার্ডটি লিখুন</label>
                <input 
                  type="password"
                  required
                  autoFocus
                  placeholder="আপনার পাসওয়ার্ড"
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl font-bold outline-none transition-all text-sm text-center tracking-widest text-slate-800"
                />
              </div>

              <button 
                type="submit"
                disabled={isVerifyingGate}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black py-3.5 rounded-xl transition-all shadow-sm cursor-pointer hover:shadow"
              >
                {isVerifyingGate ? 'যাচাই করা হচ্ছে...' : 'সেটিংস আনলক করুন'}
              </button>
            </form>
          </motion.div>
        ) : (
          /* Actual Settings: Beautiful Serial Layout (No dark sidebar, completely matching the light theme) */
          <motion.div 
            key="config-sections"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* PASSWORD CHANGE CARD */}
            <div className="bg-white p-5 sm:p-7 rounded-[24px] border border-slate-200/70 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <KeyRound size={16} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">অ্যাডমিন পাসওয়ার্ড সংশোধন</h3>
              </div>

              {passwordStatus && (
                <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold border ${
                  passwordStatus.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                    : 'bg-red-50 border-red-100 text-red-800'
                }`}>
                  {passwordStatus.type === 'success' ? <Check size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                  <p>{passwordStatus.text}</p>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">বর্তমান পাসওয়ার্ড</label>
                    <input 
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl font-bold text-sm text-slate-800 outline-none transition-all h-12"
                      placeholder="বর্তমান পাসওয়ার্ড দিন"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">নতুন পাসওয়ার্ড</label>
                    <input 
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl font-bold text-sm text-slate-800 outline-none transition-all h-12"
                      placeholder="নতুন পাসওয়ার্ড"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">নিশ্চিত করুন</label>
                    <input 
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl font-bold text-sm text-slate-800 outline-none transition-all h-12"
                      placeholder="আবার টাইপ করুন"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 hover:shadow cursor-pointer transition-all active:scale-[0.98]"
                  >
                    পাসওয়ার্ড পরিবর্তন করুন
                  </button>
                </div>
              </form>
            </div>

            {/* USER CONTROL CARD */}
            <div className="bg-white p-5 sm:p-7 rounded-[24px] border border-slate-200/70 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Users size={16} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">ব্যবহারকারী ও অ্যাডমিন তালিকা</h3>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {usersList.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-xs font-bold">কোন ব্যবহারকারী পাওয়া যায়নি।</p>
                  ) : (
                    usersList.map((usr) => (
                      <div key={usr.id} className="bg-slate-50/70 p-3.5 rounded-xl flex items-center justify-between border border-slate-150/60 transition-all hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-extrabold text-xs">
                            {usr.name ? usr.name[0] : 'U'}
                          </div>
                          <div>
                            <p className="font-extrabold text-xs sm:text-sm text-slate-800">{usr.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                usr.role === 'Admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {usr.role === 'Admin' ? 'অ্যাডমিন' : 'ডাটা এন্ট্রি'}
                              </span>
                              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold">@{usr.username}</span>
                            </div>
                          </div>
                        </div>

                        {usr.id === user.id ? (
                          <span className="text-[9px] text-slate-400 font-black pr-2">আপনি নিজে</span>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => {
                              setRemovingUserId(usr.id);
                              setRemoveError('');
                              setRemovePassword('');
                            }}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Trash2 size={11} />
                            মুছুন
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* User removal checking confirmation inside card */}
              <AnimatePresence>
                {removingUserId && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-amber-50 rounded-xl border border-amber-200/60 space-y-3 overflow-hidden text-left"
                  >
                    <div className="flex gap-2 items-start">
                      <AlertCircle className="text-amber-700 shrink-0 mt-0.5" size={16} />
                      <div className="space-y-0.5">
                        <h5 className="font-extrabold text-xs text-amber-900">ইউজার রিমুভ নিশ্চিত করুন</h5>
                        <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                          নিরাপত্তার স্বার্থে, এই ব্যবহারকারীকে মুছে ফেলার অনুমোদনের জন্য আপনার নিজের অ্যাডমিন পাসওয়ার্ডটি দিন।
                        </p>
                      </div>
                    </div>

                    {removeError && (
                      <p className="text-[11px] text-red-650 font-bold pl-1">
                        ⚠️ {removeError}
                      </p>
                    )}

                    <form onSubmit={handleRemoveUser} className="flex flex-col sm:flex-row gap-2.5 items-end">
                      <div className="w-full flex-1">
                        <input 
                          type="password"
                          required
                          value={removePassword}
                          onChange={(e) => setRemovePassword(e.target.value)}
                          placeholder="আপনার অ্যাডমিন পাসওয়ার্ড"
                          className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-lg text-xs outline-none text-slate-805 font-bold h-10"
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0">
                        <button 
                          type="button"
                          onClick={() => setRemovingUserId(null)}
                          className="flex-1 sm:flex-none px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer h-10"
                        >
                          বাতিল
                        </button>
                        <button 
                          type="submit"
                          disabled={isRemovingSubmit}
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-black text-xs rounded-lg transition-all cursor-pointer h-10 shadow-xs"
                        >
                          {isRemovingSubmit ? 'মুছে ফেলা হচ্ছে...' : 'রিমুভ করুন'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* DATA WIPE CARD - FACTORY RESET */}
            <div className="bg-red-50/20 p-5 sm:p-7 rounded-[24px] border border-red-155 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-red-100">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shadow-xs">
                  <Trash2 size={16} />
                </div>
                <h3 className="font-extrabold text-red-900 text-sm sm:text-base">ফ্যাক্টরি ডাটা রিসেট (সিস্টেম মুছুন)</h3>
              </div>

              {resetSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center space-y-2">
                  <Check className="text-emerald-600 mx-auto" size={24} />
                  <p className="font-black text-emerald-950 text-xs sm:text-sm">সব তথ্য সফলভাবে মুছে ফেলা হয়েছে!</p>
                  <p className="text-emerald-800 text-[11px] font-medium">রিলিজ হয়ে আবার রিফ্রেশ হচ্ছে...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Step 0 */}
                  {resetStep === 0 && (
                    <div className="space-y-2.5">
                      <p className="text-xs text-red-800 font-bold leading-relaxed">
                        ⚠️ এই বাটনটি চাপলে সিস্টেমের সকল সদস্যের হিসাব, চাঁদা রসিদ এবং খরচের হিসাব বিলুপ্ত হয়ে যাবে। এটি অপুনরুদ্ধারযোগ্য।
                      </p>
                      <button 
                        type="button"
                        onClick={() => setResetStep(1)}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-xs transition-all cursor-pointer hover:shadow"
                      >
                        হ্যাঁ, সকল লেনদেন ও সদস্য ডাটা মুছুন
                      </button>
                    </div>
                  )}

                  {/* Step 1 */}
                  {resetStep === 1 && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/60 space-y-3">
                      <p className="text-xs text-amber-900 font-bold leading-relaxed">
                        ১ম সতর্কীকরণ: ডাটাবেজ থেকে তথ্য ডিলিট করার পর কোনোভাবেই তা ফিরিয়ে আনা সম্ভব নয়। আপনি কি নিশ্চিত?
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => setResetStep(0)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold cursor-pointer text-slate-700"
                        >
                          বাতিল
                        </button>
                        <button 
                          onClick={() => setResetStep(2)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          হ্যাঁ, আমি সম্মত
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2 */}
                  {resetStep === 2 && (
                    <div className="p-4 bg-red-600 rounded-xl text-white space-y-3 shadow">
                      <p className="text-xs text-red-100 font-bold leading-relaxed">
                        চূড়ান্ত সতর্কীকরণ: সমস্ত চাঁদা রসিদ ও খরচ রেকর্ড রিয়্যালটাইমডাটাবেজ থেকে চিরতরে মুছে যাবে।
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => setResetStep(0)}
                          className="px-3 py-1.5 bg-red-820 hover:bg-red-900 rounded-lg text-xs font-bold text-red-100 cursor-pointer"
                        >
                          না, বাতিল করুন
                        </button>
                        <button 
                          onClick={() => setResetStep(3)}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-red-700 font-black rounded-lg text-xs cursor-pointer"
                        >
                          হ্যাঁ, পাসওয়ার্ড প্রোভাইড করুন
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3 Password verify */}
                  {resetStep === 3 && (
                    <form onSubmit={handleWipeData} className="p-4 bg-slate-100 rounded-xl border border-slate-200/80 space-y-3 text-left">
                      <div className="space-y-1">
                        <h5 className="font-extrabold text-slate-800 text-xs text-left">আপনার অ্যাডমিন পাসওয়ার্ডটি লিখে রিসেট নিশ্চিত করুন</h5>
                        {resetError && <p className="text-[11px] text-red-600 font-bold">⚠️ {resetError}</p>}
                      </div>
                      <input 
                        type="password"
                        required
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="পাসওয়ার্ড লিখুন"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-red-500 rounded-lg text-xs outline-none text-slate-800 font-bold h-10"
                      />
                      <div className="flex gap-2 justify-end pt-1">
                        <button 
                          type="button"
                          onClick={() => setResetStep(0)}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold cursor-pointer text-slate-700 h-10"
                        >
                          বাতিল
                        </button>
                        <button 
                          type="submit"
                          disabled={isResettingSubmit}
                          className="px-4 py-2 bg-red-650 hover:bg-red-700 disabled:bg-red-300 text-white font-black rounded-lg text-xs cursor-pointer h-10 shadow-xs"
                        >
                          {isResettingSubmit ? 'রিসেট হচ্ছে...' : 'রিসেট সম্পন্ন করুন'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App Designer Footer Note - App by Antor Hossain */}
      <div className="pt-8 pb-4 text-center border-t border-slate-150/50">
        <p className="text-slate-400 font-black text-xs tracking-wider font-mono">
          App by <span className="text-emerald-600 uppercase font-bold">Antor Hossain</span>
        </p>
      </div>
    </div>
  );
}
