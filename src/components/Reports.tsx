import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, Filter, FileSpreadsheet, Printer, TrendingUp, TrendingDown, Landmark, Check, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export default function Reports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<'Approved' | 'Pending' | 'All'>('All');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refresher, setRefresher] = useState(0);

  // Fetch from Supabase directly
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const [transRes, membersRes, usersRes] = await Promise.all([
          supabase.from('transactions').select('*'),
          supabase.from('members').select('id, name'),
          supabase.from('users').select('id, name')
        ]);

        if (transRes.error) throw transRes.error;
        if (membersRes.error) throw membersRes.error;
        if (usersRes.error) throw usersRes.error;

        const txs = transRes.data || [];
        const membersData = membersRes.data || [];
        const usersData = usersRes.data || [];

        // Enrich transactions with member name and submitter's name
        const enriched = txs.map((tx: any) => {
          const matchingMember = membersData.find((m: any) => m.id === tx.member_id);
          const matchingUser = usersData.find((u: any) => u.id === tx.entry_by);
          return {
            ...tx,
            member_name: matchingMember ? matchingMember.name : (tx.source === 'Chanda' ? 'সাধারণ' : '-'),
            entry_by_name: matchingUser ? matchingUser.name : 'অজানা ব্যবহারকারী'
          };
        });

        // Sort descending by date
        enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setTransactions(enriched);
      } catch (err) {
        console.error('Error loading reports data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [refresher]);

  // Filter based on selected month and status filter
  const monthlyTransactions = transactions.filter((tx: any) => {
    const matchesMonth = tx.date && tx.date.startsWith(month);
    if (!matchesMonth) return false;
    if (statusFilter === 'All') return true;
    return tx.status === statusFilter;
  });

  const totalIncome = monthlyTransactions
    .filter((tx: any) => tx.type === 'Income')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const totalExpense = monthlyTransactions
    .filter((tx: any) => tx.type === 'Expense')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const netFund = totalIncome - totalExpense;

  // Source Breakdown Calculation for Visual "চার্ট"
  const getSourceBreakdown = () => {
    const breakdown = {
      chanda: 0,
      juma: 0,
      rice: 0,
      donation: 0,
    };
    
    monthlyTransactions.forEach((tx: any) => {
      if (tx.type === 'Income') {
        const amt = Number(tx.amount) || 0;
        const src = (tx.source || '').toLowerCase();
        
        if (src.includes('chanda') || src.includes('চাঁদা')) {
          breakdown.chanda += amt;
        } else if (src.includes('friday') || src.includes('juma') || src.includes('জুম্মা')) {
          breakdown.juma += amt;
        } else if (src.includes('rice') || src.includes('tuma') || src.includes('চাল')) {
          breakdown.rice += amt;
        } else {
          breakdown.donation += amt;
        }
      }
    });

    const totalIn = totalIncome || 1; // Avoid divide by zero
    return [
      { label: 'সদস্য চাঁদা (Chanda)', value: breakdown.chanda, pct: Math.round((breakdown.chanda / totalIn) * 100), color: 'bg-emerald-600', textColor: 'text-emerald-700' },
      { label: 'জুম্মা দান (Juma Box)', value: breakdown.juma, pct: Math.round((breakdown.juma / totalIn) * 100), color: 'bg-indigo-600', textColor: 'text-indigo-700' },
      { label: 'চাল তোলা (Rice Tuma)', value: breakdown.rice, pct: Math.round((breakdown.rice / totalIn) * 100), color: 'bg-amber-500', textColor: 'text-amber-700' },
      { label: 'সাধারণ দান (Donation)', value: breakdown.donation, pct: Math.round((breakdown.donation / totalIn) * 100), color: 'bg-teal-500', textColor: 'text-teal-700' },
    ];
  };

  const breakdownData = getSourceBreakdown();

  const handleBrowserPrint = () => {
    window.print();
  };

  const downloadPDF = () => {
    if (monthlyTransactions.length === 0) {
      alert('এই মাসের জন্য কোনো অনুমোদিত ট্রানজেকশন নেই!');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(16, 185, 129); // Emerald-600
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      const savedMosqueName = localStorage.getItem('mosque_name') || 'Mosque Management System';
      doc.text(savedMosqueName, 105, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Report Period: ${month}`, 105, 25, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 32, { align: 'center' });

      // Table (Translating fields for clean standard English jsPDF tables)
      const tableData = monthlyTransactions.map((tx: any) => [
        new Date(tx.date).toLocaleDateString(),
        tx.source === 'Chanda' ? 'Monthly Chanda' : tx.source === 'Rice Tuma' ? 'Rice Collection' : tx.source === 'Donation' ? 'General Donation' : tx.source === 'Friday Donation' ? 'Friday Donation (Juma)' : tx.source,
        tx.member_name || 'General',
        tx.type === 'Income' ? 'Income' : 'Expense',
        tx.payment_method || '-',
        `Tk ${Number(tx.amount).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Source/Category', 'Name/Member', 'Type', 'Method', 'Amount']],
        body: tableData,
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 150;

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`Total Income: Tk ${totalIncome.toLocaleString()}`, 135, finalY + 15);
      doc.text(`Total Expense: Tk ${totalExpense.toLocaleString()}`, 135, finalY + 22);
      
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text(`Net Fund balance: Tk ${netFund.toLocaleString()}`, 135, finalY + 32);

      doc.save(`Mosque_Report_${month}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('পিডিএফ ফাইল তৈরি করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  const downloadExcel = () => {
    if (monthlyTransactions.length === 0) {
      alert('এই মাসের জন্য কোনো অনুমোদিত ট্রানজেকশন নেই!');
      return;
    }

    try {
      const exportData = monthlyTransactions.map((tx: any) => ({
        'তারিখ': tx.date,
        'উৎস/খাত': tx.source === 'Chanda' ? 'মাসিক চাঁদা' : tx.source === 'Rice Tuma' ? 'চাল তোলা' : tx.source === 'Donation' ? 'সাধারণ দান' : tx.source === 'Friday Donation' ? 'শুক্রবার/জুম্মা দান' : tx.source,
        'সদস্য/নাম': tx.member_name || 'সাধারণ',
        'ধরণ': tx.type === 'Income' ? 'আয়' : 'ব্যয়',
        'পদ্ধতি': tx.payment_method || '-',
        'পরিমাণ (টাকা)': Number(tx.amount),
        'অবস্থা': tx.status,
        'এন্ট্রি কারী': tx.entry_by_name || 'অজানা'
      }));

      // Add Summary Row
      exportData.push({
        'তারিখ': 'মোট হিসাব',
        'উৎস/খাত': `মোট আয়: ৳${totalIncome}`,
        'সদস্য/নাম': `মোট ব্যয়: ৳${totalExpense}`,
        'ধরণ': `নিট ফান্ড: ৳${netFund}`,
        'পদ্ধতি': '',
        'পরিমাণ (টাকা)': 0,
        'অবস্থা': '',
        'এন্ট্রি কারী': ''
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
      XLSX.writeFile(wb, `Mosque_Report_${month}.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
      alert('এক্সেল ফাইল তৈরি করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">রিপোর্ট ও বিশ্লেষণ</h2>
          <p className="text-slate-500 font-medium">বিস্তারিত আর্থিক রিপোর্ট তৈরি এবং ডাউনলোড করুন।</p>
        </div>
        <button
          onClick={() => setRefresher(prev => prev + 1)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl hover:bg-slate-100 font-extrabold text-xs transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          রিলোড ডাটা
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Control Column */}
        <div className="lg:col-span-1 space-y-6 animate-fadeIn print:hidden">
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            {/* Soft decorative background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3 text-xl tracking-tight relative z-10">
              <Filter size={22} className="text-emerald-600" />
              রিপোর্ট সেটিংস
            </h3>
            
            <div className="space-y-6 relative z-10 font-sans">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">১. মাস নির্বাচন করুন</label>
                <input 
                  type="month" 
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-slate-700 shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">২. স্ট্যাটাস ফিল্টার</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl font-bold outline-none transition-all text-slate-700 shadow-inner"
                >
                  <option value="Approved">অনুমোদিত হিসাব (Approved)</option>
                  <option value="Pending">পেন্ডিং হিসাব (Pending)</option>
                  <option value="All">সকল লেনদেন (Approved & Pending)</option>
                </select>
                <p className="text-[10px] text-slate-400 italic mt-1.5 leading-relaxed font-semibold">
                  * নতুন এন্ট্রিগুলো 'পেন্ডিং' অবস্থায় থাকে। রিপোর্ট চার্ট বা তালিকায় দেখতে 'সকল লেনদেন' সিলেক্ট করতে পারেন।
                </p>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={downloadPDF}
                  disabled={loading || monthlyTransactions.length === 0}
                  className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-emerald-250 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download size={20} />
                  PDF রিপোর্ট ডাউনলোড
                </button>
                <button 
                  onClick={downloadExcel}
                  disabled={loading || monthlyTransactions.length === 0}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-black py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FileSpreadsheet size={20} className="text-emerald-600" />
                  Excel ডাউনলোড করুন
                </button>
              </div>
            </div>
          </div>

          {/* Visual Analysis Chart */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-lg tracking-tight">
              <TrendingUp size={20} className="text-emerald-600" />
              আদায় বিশ্লেষণ চার্ট (Incomes)
            </h3>
            <div className="space-y-5">
              {breakdownData.map((cat) => (
                <div key={cat.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="truncate">{cat.label}</span>
                    <span className={`font-black ${cat.textColor}`}>৳{cat.value.toLocaleString()} ({cat.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div className={`${cat.color} h-full rounded-full transition-all duration-500`} style={{ width: `${cat.pct}%` }}></div>
                  </div>
                </div>
              ))}
              {totalIncome === 0 && (
                <p className="text-slate-400 font-bold text-center py-6 text-xs italic">এই মাসের কোনো আয়ের তথ্য পাওয়া যায়নি।</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Preview Column (On screen version) */}
        <div className="lg:col-span-2 bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col min-h-[500px] print:hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-slate-800 text-xl tracking-tight">রিপোর্ট প্রিভিউ (চলতি স্ক্রিন)</h3>
              <p className="text-slate-400 font-bold text-xs mt-0.5">
                {month} মাসের {statusFilter === 'Approved' ? 'অনুমোদিত' : statusFilter === 'Pending' ? 'পেন্ডিং' : 'সকল'} হিসাব
              </p>
            </div>
            <Printer size={22} className="text-slate-400 cursor-pointer hover:text-slate-600" onClick={handleBrowserPrint} />
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-500 font-bold text-sm">রিপোর্ট ডাটা প্রসেস করা হচ্ছে...</p>
            </div>
          ) : monthlyTransactions.length === 0 ? (
            <div className="flex-1 border-2 border-dashed border-slate-100 rounded-[32px] py-16 px-8 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <FileText size={36} />
              </div>
              <h4 className="font-black text-slate-800 mb-3 text-lg">এই ফিল্টারে কোনো ট্রানজেকশন নেই!</h4>
              <p className="text-slate-400 font-medium text-xs max-w-xs leading-relaxed">
                নির্বাচিত মাসের ও সিলেক্ট করা স্ট্যাটাসের জন্য কোনো ট্রানজেকশন ডাটা পাওয়া যায়নি। অনুগ্রহ করে অন্য কোনো মাস বা ফিল্টার সিলেক্ট করুন।
              </p>
            </div>
          ) : (
            <div className="flex-grow flex flex-col space-y-8 animate-fadeIn">
              {/* Dynamic Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">মোট আদায়/আয়</p>
                    <p className="text-lg font-black text-emerald-600">৳{totalIncome.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">মোট ব্যয় / খরচ</p>
                    <p className="text-lg font-black text-rose-600">৳{totalExpense.toLocaleString()}</p>
                  </div>
                </div>

                <div className={`rounded-2xl p-4 flex items-center gap-4 border ${
                  netFund >= 0 
                  ? 'bg-amber-50/50 border-amber-100/50' 
                  : 'bg-red-50/50 border-red-100/50'
                }`}>
                  <div className={`p-3 rounded-xl ${
                    netFund >= 0 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                  }`}>
                    <Landmark size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">নিট ফান্ড ব্যালেন্স</p>
                    <p className={`text-lg font-black ${
                      netFund >= 0 ? 'text-amber-600' : 'text-red-600'
                    }`}>৳{netFund.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Transactions Table Preview */}
              <div className="flex-1 flex flex-col border border-slate-50 rounded-2xl overflow-hidden shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4 text-center">তারিখ</th>
                        <th className="py-3 px-4">উৎস/খাত</th>
                        <th className="py-3 px-4">মেম্বার/সংগ্রাহক</th>
                        <th className="py-3 px-4 text-center">পদ্ধতি</th>
                        <th className="py-3 px-4 text-center">ধরণ</th>
                        <th className="py-3 px-4 text-right">পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                      {monthlyTransactions.slice(0, 6).map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                            {new Date(tx.date).toLocaleDateString('bn-BD', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-4 font-black text-slate-700 min-w-[120px]">
                            {tx.source === 'Chanda' ? 'মাসিক চাঁদা' : tx.source === 'Rice Tuma' ? 'চাল তোলা' : tx.source === 'Donation' ? 'সাধারণ দান' : tx.source === 'Friday Donation' ? 'শুক্রবার/জুম্মা দান' : tx.source}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            <div className="flex flex-col">
                              <span>{tx.member_name}</span>
                              <span className="text-[9px] text-slate-400 font-normal">এন্ট্রি: {tx.entry_by_name} <span className={`px-1 rounded-sm text-[8px] font-bold ${tx.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{tx.status === 'Approved' ? 'অনুমোদিত' : 'পেন্ডিং'}</span></span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-400 font-black">
                            {tx.payment_method || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${
                              tx.type === 'Income' 
                                ? 'bg-emerald-50 text-emerald-600' 
                                : 'bg-rose-50 text-rose-600'
                            }`}>
                              {tx.type === 'Income' ? 'আয়' : 'ব্যয়'}
                            </span>
                          </td>
                          <td className={`py-3.5 px-4 text-right font-black ${
                            tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            ৳{Number(tx.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {monthlyTransactions.length > 6 && (
                  <div className="bg-slate-50 text-center py-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
                    এবং আরো {monthlyTransactions.length - 6}টি ট্রানজেকশন রিপোর্টে অন্তর্ভুক্ত হবে। (ডাউনলোড বা প্রিন্ট করলেই সম্পূর্ণ তালিকা দেখতে পাবেন)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PRINT ONLY MASTER VIEW (Always rendered, but only visible on paper/print preview) */}
        {!loading && monthlyTransactions.length > 0 && (
          <div className="hidden print:block lg:col-span-3 w-full bg-white p-10 font-sans">
            <div className="text-center pb-8 border-b-2 border-slate-300 mb-8">
              <h1 className="text-3xl font-black text-slate-950 tracking-tight">
                {localStorage.getItem('mosque_name') || 'মসজিদ'} - আর্থিক রিপোর্ট ও বিবরণী
              </h1>
              <p className="text-slate-600 font-bold mt-2 text-sm">
                মাস: {new Date(month + '-01').toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })} ({month}) 
                &nbsp;|&nbsp; ক্যাটাগরি ফিল্টার: {statusFilter === 'Approved' ? 'শুধুমাত্র অনুমোদিত' : statusFilter === 'Pending' ? 'শুধুমাত্র পেন্ডিং' : 'অনুমোদিত ও পেন্ডিং সকল হিসাব'}
              </p>
              <p className="text-slate-400 text-xs mt-1 font-semibold">প্রিন্টের তারিখ: {new Date().toLocaleString('bn-BD')}</p>
            </div>

            {/* Print overview counters */}
            <div className="grid grid-cols-3 gap-6 border-2 border-slate-200 rounded-3xl p-6 mb-8 bg-slate-50/50">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">মোট আদায় ও অনুদান</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">৳ {totalIncome.toLocaleString()}</p>
              </div>
              <div className="text-center border-x-2 border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">মোট ব্যয় ও খরচ</p>
                <p className="text-2xl font-black text-rose-700 mt-1">৳ {totalExpense.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">নিট অবশিষ্ট ব্যালেন্স</p>
                <p className="text-2xl font-black text-amber-700 mt-1">৳ {netFund.toLocaleString()}</p>
              </div>
            </div>

            {/* Print category distribution */}
            <div className="mb-8 border border-slate-200 rounded-2xl p-6 bg-white">
              <h2 className="text-sm font-black text-slate-900 mb-4 border-b pb-1.5 uppercase tracking-wider">১. আদায় বিবরণী চার্ট (Incomes Share)</h2>
              <div className="grid grid-cols-2 gap-6">
                {breakdownData.map((cat) => (
                  <div key={cat.label} className="text-xs font-bold text-slate-650 flex justify-between border-b border-slate-100 pb-2">
                    <span>{cat.label}</span>
                    <span className="font-extrabold text-slate-900">৳ {cat.value.toLocaleString()} ({cat.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full tables of transactions - Absolutely no slicing! */}
            <div>
              <h2 className="text-sm font-black text-slate-900 mb-4 border-b pb-1.5 uppercase tracking-wider font-bengali">২. বিস্তারিত লেনদেনের হিসাব তালিকা</h2>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-350 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-2 px-3 text-center border border-slate-200">ক্রমিক</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">তারিখ</th>
                    <th className="py-2 px-3 border border-slate-200">উৎস / বিবরণ</th>
                    <th className="py-2 px-3 border border-slate-200">সদস্য/দাতা</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">আইডি/মোবাইল</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">পদ্ধতি</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">অবস্থা</th>
                    <th className="py-2 px-3 border border-slate-200 text-right">পরিমাণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-350 font-semibold text-slate-800">
                  {monthlyTransactions.map((tx: any, idx: number) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-550 border border-slate-200">{idx + 1}</td>
                      <td className="py-2 px-3 text-center border border-slate-200 font-mono">
                        {new Date(tx.date).toLocaleDateString('bn-BD', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="py-2 px-3 border border-slate-200 font-black text-slate-900">
                        {tx.source === 'Chanda' ? 'মাসিক চাঁদা' : tx.source === 'Rice Tuma' ? 'চাল তোলা' : tx.source === 'Donation' ? 'সাধারণ দান' : tx.source === 'Friday Donation' ? 'শুক্রবার/জুম্মা দান' : tx.source}
                      </td>
                      <td className="py-2 px-3 border border-slate-200">
                        {tx.member_name}
                      </td>
                      <td className="py-2 px-3 border border-slate-200 text-center text-slate-500 font-mono">
                        {tx.member_id || '-'}
                      </td>
                      <td className="py-2 px-3 border border-slate-200 text-center text-slate-500 font-black">
                        {tx.payment_method || 'Cash'}
                      </td>
                      <td className="py-2 px-3 border border-slate-200 text-center font-black text-[10px]">
                        <span className={tx.type === 'Income' ? 'text-emerald-700' : 'text-rose-700'}>
                          {tx.type === 'Income' ? 'আয় (' + (tx.status === 'Approved' ? 'গৃহীত' : 'পেন্ডিং') + ')' : 'ব্যয়'}
                        </span>
                      </td>
                      <td className={`py-2 px-3 border border-slate-200 text-right font-black ${tx.type === 'Income' ? 'text-slate-950' : 'text-slate-600'}`}>
                        ৳ {Number(tx.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print signatures section */}
            <div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs font-bold pt-8">
              <div>
                <div className="w-48 border-t-2 border-slate-400 mx-auto mt-8"></div>
                <p className="text-slate-600 mt-2">সংগ্রাহক / কোষাধ্যক্ষ স্বাক্ষর</p>
              </div>
              <div>
                <div className="w-48 border-t-2 border-slate-400 mx-auto mt-8"></div>
                <p className="text-slate-600 mt-2">সভাপতি / মোতোওয়াল্লি স্বাক্ষর</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
