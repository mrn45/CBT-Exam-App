import { useState } from 'react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { useApp } from '../lib/context';
import { toast } from './ui/Toast';
import { Eye, EyeOff, Laptop, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

export function Login() {
  const { login, settings } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Token modal state
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [tokenInput, setTokenInput] = useState('');

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.call('login', { username, password });
      if (res.success) {
        if (res.require_token) {
          setTempUser(res.temp_data);
          setShowTokenModal(true);
        } else {
          login(res.data);
          api.call('add_activity_log', {
            id_user: res.data.id || res.data.username,
            nama_user: res.data.nama || res.data.username,
            role: res.data.role,
            aktivitas: 'Login ke dalam sistem'
          });
          toast("Login berhasil!", "success");
        }
      } else {
        toast(res.message || "Login gagal", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!tokenInput.trim()) return toast("Token kosong!", "warning");
    setLoading(true);
    try {
      const res = await api.call('verify_token', { token: tokenInput.toUpperCase(), temp_data: tempUser });
      if (res.success) {
        setShowTokenModal(false);
        login(res.data);
        api.call('add_activity_log', {
          id_user: res.data.id || res.data.username,
          nama_user: res.data.nama || res.data.username,
          role: res.data.role,
          aktivitas: 'Login ke dalam sistem'
        });
        toast("Autentikasi berhasil!", "success");
      } else {
        toast(res.message || "Token Salah!", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="flex items-center justify-center min-h-screen bg-slate-50 relative overflow-hidden p-4"
    >
      {/* Decorative Background Blobs */}
      <div className="blob bg-fuchsia-400/30 w-96 h-96 rounded-full top-[-10%] left-[-10%] animate-[float_10s_ease-in-out_infinite]" />
      <div className="blob bg-violet-400/30 w-80 h-80 rounded-full bottom-[-10%] right-[-5%] animate-[float_12s_ease-in-out_infinite_reverse]" />
      <div className="blob bg-blue-400/20 w-72 h-72 rounded-full top-[30%] left-[40%] animate-[float_15s_ease-in-out_infinite]" />

      <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-4xl relative z-10">
        
        {/* Branding Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center md:items-start text-center md:text-left max-w-sm"
        >
          <div className="w-24 h-24 bg-white p-3 rounded-[1.8rem] shadow-xl border border-slate-200 flex items-center justify-center mb-6 transform hover:scale-105 hover:rotate-2 smooth-transition">
            {settings?.logo_instansi ? (
              <img src={settings.logo_instansi} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <ShieldCheck className="w-12 h-12 text-violet-500" />
            )}
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
            {settings?.namaSekolah || "CBT Portal"}
          </h1>
          <div className="w-16 h-1 bg-violet-600 rounded-full mb-4 hidden md:block" />
          <p className="text-slate-500 text-sm font-bold leading-relaxed hidden md:block">
            Selamat datang di Portal CBT SMART EXAM APP resmi. Akses ujian nyaman dengan LJK Digital interaktif dan proteksi termutakhir.
          </p>

          <div className="mt-8 p-3 bg-white backdrop-blur-md border border-slate-200 rounded-2xl flex items-center gap-3 w-full shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-violet-400 flex items-center justify-center shrink-0">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">profil Developer</p>
              <p className="text-xs font-black text-slate-700 flex items-center gap-1.5 flex-wrap">
                Ahmad Hanafi - SMP ISLAM ASSYAFIIYAH <CheckCircle className="w-3 h-3 text-violet-500" />
              </p>
            </div>
          </div>
        </motion.div>

        {/* Login Form Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card p-8 rounded-[2rem] w-full max-w-[340px] shrink-0"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">Mulai Ujian</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Autentikasi Akun</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black mb-1.5 text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 outline-none font-bold text-sm text-slate-900 hover:border-violet-500 smooth-transition"
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black mb-1.5 text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 pr-10 rounded-xl focus:bg-white focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 outline-none font-bold text-sm text-slate-900 hover:border-violet-500 smooth-transition"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-violet-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="group relative w-full bg-violet-600 text-white font-black py-3 rounded-full shadow-[0_10px_20px_-8px_rgba(139,92,246,0.5)] btn-touch flex justify-center items-center gap-2 text-xs uppercase tracking-[0.15em] mt-6 overflow-hidden border border-violet-500/50"
            >
               {loading ? (
                 <span className="flex items-center gap-2">Memproses...</span>
               ) : (
                 <span className="relative z-10 flex items-center gap-2">
                   Masuk <ArrowRight className="w-4 h-4 opacity-90 group-hover:translate-x-1 transition-transform" />
                 </span>
               )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Preview Akses:</p>
            <div className="flex justify-center gap-3 text-[10px] text-slate-500 font-semibold">
              <span>Admin: <b className="text-violet-400">admin/edudigital</b></span>
              <span>Siswa: <b className="text-violet-400">1001/123</b></span>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] w-full max-w-sm shadow-2xl relative"
          >
            <h3 className="text-xl font-black text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="text-violet-500" /> Verifikasi Token
            </h3>
            <p className="text-sm text-slate-500 font-bold mb-6">
              Halo <b className="text-slate-900">{tempUser?.nama}</b>! Masukkan 6 Digit Token dari Pengawas.
            </p>
            <input 
              type="text" 
              maxLength={6}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-center text-3xl font-black tracking-[0.4em] text-violet-400 uppercase outline-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 mb-6"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowTokenModal(false)}
                className="w-full bg-slate-100 text-slate-900 font-black py-3 rounded-full btn-touch hover:bg-slate-200"
              >
                Batal
              </button>
              <button 
                onClick={handleVerifyToken}
                disabled={loading}
                className="w-full bg-violet-600 text-white font-black py-3 rounded-full hover:bg-violet-700 btn-touch shadow-lg"
              >
                {loading ? 'Validasi...' : 'Validasi'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
}
