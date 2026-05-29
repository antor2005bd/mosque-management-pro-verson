import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Lock, User as UserIcon, AlertCircle, Shield, Phone, ChevronRight } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

export default function Login({ onLogin }: { onLogin: (user: any, token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<'Admin' | 'User'>('Admin');

  // Registration/Setup States
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Check if initial admin setup is required
  const checkSetup = async () => {
    try {
      const { count, error: countErr } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'Admin');

      if (countErr) throw countErr;
      const isSetupNeeded = (count || 0) < 1;
      setSetupNeeded(isSetupNeeded);
      if (isSetupNeeded) {
        setIsRegistering(true);
      }
    } catch (e: any) {
      console.error('Error checking setup status:', e);
      setError(`ডাটাবেজ কানেকশন চেক করতে সমস্যা হচ্ছে। (${e.message || e.toString()})`);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { count, error: countErr } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'Admin');

      if (countErr) throw countErr;

      if (count && count >= 2) {
        setError('সর্বোচ্চ ২ জন অ্যাডমিন অ্যাকাউন্ট ইতিমধ্যে তৈরি করা হয়েছে।');
        setLoading(false);
        return;
      }

      if (!regUsername || !regPassword || !regName) {
        setError('দয়া করে ইউজার আইডি, পাসওয়ার্ড এবং নাম পূরণ করুন।');
        setLoading(false);
        return;
      }

      const normalizedUsername = regUsername.trim().toLowerCase();
      const hashedPassword = bcrypt.hashSync(regPassword, 10);
      const { error: insertErr } = await supabase
        .from('users')
        .insert({
          username: normalizedUsername,
          password: hashedPassword,
          name: regName,
          mobile: regMobile || null,
          role: 'Admin',
          status: 'Active'
        });

      if (insertErr) {
        if (insertErr.message && insertErr.message.toLowerCase().includes('unique')) {
          setError('এই ইউজার আইডিটি ইতিমধ্যে ব্যবহৃত হয়েছে।');
        } else {
          setError(`রেজিস্ট্রেশন ব্যর্থ হয়েছে: ${insertErr.message}`);
        }
        return;
      }

      setRegSuccess('সফলভাবে রেজিস্ট্রেশন সম্পূর্ণ হয়েছে! এখন আপনার তথ্য দিয়ে লগইন করুন।');
      // Pre-fill login info
      setUsername(regUsername);
      setPassword(regPassword);
      setLoginType('Admin');
      setIsRegistering(false);
      setSetupNeeded(false);
    } catch (err: any) {
      setError(`ডাটাবেজের সাথে সংযোগ বিচ্ছিন্ন। আবার চেষ্টা করুন। (${err.message || err.toString()})`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedUsername = username.trim().toLowerCase();
      const { data: user, error: loginErr } = await supabase
        .from('users')
        .select('*')
        .eq('username', normalizedUsername)
        .maybeSingle();

      if (loginErr) throw loginErr;

      if (!user) {
        setError('ইউজার আইডি অথবা পাসওয়ার্ড সঠিক নয়।');
        setLoading(false);
        return;
      }

      const passwordMatch = bcrypt.compareSync(password, user.password);
      if (!passwordMatch) {
        setError('ইউজার আইডি অথবা পাসওয়ার্ড সঠিক নয়।');
        setLoading(false);
        return;
      }

      if (user.status !== 'Active') {
        setError('অ্যাকাউন্টটি নিষ্ক্রিয় (Inactive) আছে।');
        setLoading(false);
        return;
      }

      // Verify if the login type matches the role
      if (loginType === 'Admin' && user.role !== 'Admin') {
        setError('এটি একটি অ্যাডমিন অ্যাকাউন্ট নয়। দয়া করে ইউজার লগইন ব্যবহার করুন।');
        setLoading(false);
        return;
      }
      if (loginType === 'User' && user.role === 'Admin') {
        setError('এটি একটি অ্যাডমিন অ্যাকাউন্ট। দয়া করে অ্যাডমিন লগইন ব্যবহার করুন।');
        setLoading(false);
        return;
      }

      const token = 'direct-supabase-token-dummy';
      onLogin({ id: user.id, username: user.username, role: user.role, name: user.name }, token);
    } catch (err: any) {
      setError(`ডাটাবেজের সাথে সংযোগ বিচ্ছিন্ন। আবার চেষ্টা করুন। (${err.message || err.toString()})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px]"
      >
        <div className="bg-white rounded-[40px] shadow-2xl shadow-emerald-200/20 overflow-hidden border border-slate-100">
          <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>
            
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-emerald-600 mx-auto mb-4 shadow-xl relative z-10">
              <LayoutDashboard size={32} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight relative z-10">মসজিদ ম্যানেজমেন্ট</h1>
            <p className="text-emerald-100 text-xs mt-1 font-medium opacity-90 relative z-10">
              {isRegistering ? 'প্রথম ধাপ: নতুন অ্যাডমিন অ্যাকাউন্ট তৈরি' : 'সফটওয়্যারে স্বাগতম'}
            </p>
          </div>

          <div className="p-8">
            {regSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-emerald-100 mb-6"
              >
                <AlertCircle size={18} />
                {regSuccess}
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-100 mb-6"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}

            {isRegistering ? (
              /* Registration Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="text-center mb-4">
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {setupNeeded ? 'প্রথমবার সেটআপ আবশ্যক' : 'নতুন অ্যাডমিন নিবন্ধন'}
                  </span>
                  <p className="text-xs text-slate-500 mt-2 font-medium">প্রথমবার চালানোর পূর্বে আপনার নিজের পছন্দমতো অ্যাডমিন অ্যাকাউন্ট নিবন্ধন করুন</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পূর্ণ নাম</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="আপনার নাম লিখুন"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">মোবাইল নম্বর</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="tel" 
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      placeholder="০১XXXXXXXXX"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইউজার আইডি</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="লগইন ইউজার আইডি লিখুন"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পাসওয়ার্ড</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="password" 
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 text-base mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>নিবন্ধন নিশ্চিত করুন</>
                  )}
                </button>

                {!setupNeeded && (
                  <button 
                    type="button" 
                    onClick={() => setIsRegistering(false)}
                    className="w-full py-3.5 text-slate-500 hover:text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    লগইন পেজে ফিরে যান
                  </button>
                )}
              </form>
            ) : (
              /* Login Form */
              <>
                {/* Role Toggle */}
                <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8">
                  <button 
                    onClick={() => setLoginType('Admin')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${loginType === 'Admin' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Shield size={16} />
                    অ্যাডমিন
                  </button>
                  <button 
                    onClick={() => setLoginType('User')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${loginType === 'User' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <UserIcon size={16} />
                    ইউজার
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ইউজার আইডি</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="আপনার আইডি লিখুন"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">পাসওয়ার্ড</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 text-lg"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>লগইন করুন</>
                    )}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setIsRegistering(true)}
                    className="w-full py-4 text-emerald-600 hover:text-emerald-700 text-xs font-black transition-all flex items-center justify-center gap-1 hover:underline"
                  >
                    সরাসরি নতুন অ্যাডমিন রেজিষ্ট্রেশন করুন <ChevronRight size={14} />
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="p-8 pt-0 text-center">
            <div className="h-px bg-slate-100 w-full mb-6"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[2px]">
              © 2026 MOSQUE MANAGEMENT SYSTEM
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
