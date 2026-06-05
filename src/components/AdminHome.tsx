import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { DashboardStats } from '../types';
import { useApp } from '../lib/context';
import { toast } from './ui/Toast';
import { 
  Layers, Key, Shield, Copy, RefreshCw, 
  GraduationCap, Users, BookOpen, FileText,
  UserCheck, UserX, CheckCircle2, PenTool
} from 'lucide-react';
import { formatTime } from '../lib/utils';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function AdminHome() {
  const { user } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tokenInfo, setTokenInfo] = useState({ token: '------', expiry: 0 });
  const [timeLeft, setTimeLeft] = useState(0);

  const fetchStats = async () => {
    const res = await api.call('get_dashboard_stats');
    if (res.success) setStats(res.data);
  };

  const fetchToken = async () => {
    const res = await api.call('get_active_token');
    if (res.success) {
      setTokenInfo(res.data);
      setTimeLeft(Math.floor((res.data.expiry - Date.now()) / 1000));
    }
  };

  const forceRefreshToken = async () => {
    const res = await api.call('force_new_token');
    if (res.success) {
      setTokenInfo(res.data);
      setTimeLeft(Math.floor((res.data.expiry - Date.now()) / 1000));
      toast('Token Baru Digenerate!', 'success');
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(tokenInfo.token);
    toast('Token disalin ke clipboard!', 'info');
  };

  useEffect(() => {
    let unsubStats: any = null;
    api.subscribe('get_dashboard_stats', {}, (newdata) => {
       if (newdata) setStats(newdata);
    }).then(u => { unsubStats = u; });
    fetchToken();
    
    return () => {
      if (typeof unsubStats === 'function') unsubStats();
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          fetchToken();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  if (!stats) return <div className="p-8"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      
      {/* Banner & Token Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] p-8 sm:p-10 text-slate-900 relative overflow-hidden shadow-none flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/20 blur-[100px] pointer-events-none rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-400/20 blur-[80px] pointer-events-none rounded-full"></div>
          <h3 className="text-3xl font-semibold mb-2 tracking-tight relative z-10">Halo, {user?.nama}! 👋</h3>
          <p className="text-slate-500 text-sm sm:text-base mb-8 max-w-lg relative z-10">
            Selamat datang di Panel Admin CBT. Kelola seluruh aset institusi, atur jadwal ujian interaktif, dan pantau aktivitas peserta ujian secara real-time.
          </p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 text-slate-900 relative overflow-hidden flex flex-col justify-center items-center text-center border border-slate-200 group">
          <p className="text-violet-400 font-medium uppercase text-xs mb-2 tracking-widest relative z-10 flex items-center justify-center gap-1.5">
            <Shield className="w-4 h-4" /> Token Keamanan Ujian
          </p>
          
          <div className="flex items-center justify-center gap-4 relative z-10 mb-6 mt-2">
            <div className="text-4xl sm:text-5xl font-light font-mono tracking-widest text-slate-900 cursor-pointer select-all">
              {tokenInfo.token}
            </div>
            <button onClick={copyToken} className="bg-slate-100 hover:bg-slate-200 text-slate-700 w-10 h-10 rounded-full flex items-center justify-center btn-touch shadow-sm shrink-0" title="Salin Token">
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl w-full relative z-10 flex justify-between items-center group-hover:bg-white smooth-transition">
            <div className="text-left">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Masa Berlaku</p>
              <div className="text-xl font-light font-mono text-violet-600 leading-none">
                {timeLeft > 0 ? formatTime(timeLeft) : '00:00'}
              </div>
            </div>
            <button onClick={forceRefreshToken} className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 btn-touch text-slate-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Entity Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[
          { label: 'Guru', count: stats.guru, icon: GraduationCap, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', hoverBg: 'group-hover:bg-violet-600' },
          { label: 'Siswa', count: stats.siswa, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', hoverBg: 'group-hover:bg-blue-600' },
          { label: 'Kelas', count: stats.kelas, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', hoverBg: 'group-hover:bg-emerald-600' },
          { label: 'Ujian', count: stats.ujian, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', hoverBg: 'group-hover:bg-rose-600' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              className={`bg-white p-5 rounded-[1.5rem] border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 stat-card group overflow-hidden hover:border-slate-300 transition-colors`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center shrink-0 relative z-10 group-hover:text-white smooth-transition ${item.color} ${item.bg} ${item.border} ${item.hoverBg} group-hover:bg-opacity-100`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <p className="text-slate-500 text-[10px] uppercase mb-0.5 tracking-widest">Total {item.label}</p>
                <h4 className="text-3xl font-light text-slate-900">{item.count}</h4>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Live Exam Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-[1.5rem] flex flex-col items-center justify-center text-center stat-card shadow-sm hover:shadow-emerald-200 transition-all">
          <div className="w-10 h-10 border border-emerald-200 text-emerald-600 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
            <UserCheck className="w-5 h-5" />
          </div>
          <h4 className="text-4xl font-light text-emerald-900 tracking-tight">{stats.siswa_login}</h4>
          <p className="text-[10px] uppercase text-emerald-600 font-bold tracking-widest mt-1">Telah Login</p>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-5 rounded-[1.5rem] flex flex-col items-center justify-center text-center stat-card shadow-sm hover:shadow-rose-200 transition-all">
          <div className="w-10 h-10 border border-rose-200 text-rose-600 bg-rose-100 rounded-full flex items-center justify-center mb-2">
            <UserX className="w-5 h-5" />
          </div>
          <h4 className="text-4xl font-light text-rose-900 tracking-tight">{stats.siswa_belum_login}</h4>
          <p className="text-[10px] uppercase text-rose-600 font-bold tracking-widest mt-1">Belum Login</p>
        </div>

        <div className="bg-sky-50 border border-sky-200 p-5 rounded-[1.5rem] flex flex-col items-center justify-center text-center stat-card shadow-sm hover:shadow-sky-200 transition-all">
          <div className="w-10 h-10 border border-sky-200 text-sky-600 bg-sky-100 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-4xl font-light text-sky-900 tracking-tight">{stats.siswa_selesai}</h4>
          <p className="text-[10px] uppercase text-sky-600 font-bold tracking-widest mt-1">Selesai Ujian</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-5 rounded-[1.5rem] flex flex-col items-center justify-center text-center stat-card shadow-sm hover:shadow-amber-200 transition-all">
          <div className="w-10 h-10 border border-amber-200 text-amber-600 bg-amber-100 rounded-full flex items-center justify-center mb-2">
            <PenTool className="w-5 h-5 animate-pulse" />
          </div>
          <h4 className="text-4xl font-light text-amber-900 tracking-tight">{stats.siswa_mengerjakan}</h4>
          <p className="text-[10px] uppercase text-amber-600 font-bold tracking-widest mt-1">Mengerjakan</p>
        </div>
      </div>

      {/* Class Performance Chart */}
      {stats.kelas_performance && stats.kelas_performance.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900">Tren Performa Kelas</h3>
            <p className="text-xs text-slate-500 font-medium">Berdasarkan Rata-rata Nilai Siswa</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.kelas_performance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="average" name="Rata-rata Nilai" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
