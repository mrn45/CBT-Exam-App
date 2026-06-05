import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useApp } from '../lib/context';
import { Ujian } from '../types';
import { motion } from 'motion/react';
import { GraduationCap, Award, Lock, PlayCircle, Clock, FileText } from 'lucide-react';
import { toast } from './ui/Toast';

export function StudentHome({ onStartExam }: { onStartExam: (exam: Ujian) => void }) {
  const { user } = useApp();
  const [exams, setExams] = useState<Ujian[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: any = null;
    if (user) {
      setLoading(true);
      api.subscribe('get_ujian_siswa', { id_siswa: user.id_siswa, id_kelas: user.id_kelas }, (newdata) => {
         setExams(newdata || []);
         setLoading(false);
      }).then(u => { unsub = u; });
    }
    return () => {
      if (typeof unsub === 'function') unsub();
    }
  }, [user]);

  const handleStartExam = async (exam: Ujian) => {
    if (exam.status_pengerjaan === 'Selesai') {
      toast('Ujian sudah dikerjakan dan telah terkunci!', 'warning');
      return;
    }
    
    // Simulate beginning
    const startRes = await api.call('mulai_ujian', { id_ujian: exam.id, id_siswa: user?.id_siswa });
    
    if (startRes.success) {
      onStartExam(startRes.data.ujian);
    } else {
      toast(startRes.message || 'Gagal memulai ujian', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Memuat jadwal ujian...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 text-slate-900 p-8 sm:p-10 rounded-[2.5rem] relative shadow-none flex items-center gap-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/20 blur-[100px] pointer-events-none rounded-full"></div>
        <div className="absolute bottom-0 left-20 w-56 h-56 bg-emerald-400/20 blur-[90px] pointer-events-none rounded-full"></div>
        <div className="w-24 h-24 bg-slate-100 rounded-[1.5rem] flex items-center justify-center border border-slate-200 text-violet-400 text-5xl relative z-10 shrink-0">
          <GraduationCap className="w-12 h-12" />
        </div>
        <div className="relative z-10">
          <h3 className="font-semibold text-3xl mb-2 tracking-tight">Sukses Selalu, {user?.nama}!</h3>
          <p className="text-slate-500 text-sm font-light max-w-lg">
            Selamat datang di Ruang Ujian Digital. Pilih ujian aktif di bawah ini untuk memulai pengerjaan. Pastikan koneksi stabil.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-xl text-slate-900 flex items-center gap-2">
          Jadwal Ujian Aktif
        </h4>
        
        {exams.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-200 shadow-none text-slate-500 font-medium border-dashed">
            Belum ada jadwal ujian aktif untuk kelasmu saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((u, i) => (
              <motion.div 
                key={u.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-gradient-to-br from-white to-violet-50 p-6 sm:p-8 rounded-[2rem] border border-violet-100 hover:border-violet-300 hover:shadow-violet-200 smooth-transition flex flex-col justify-between stat-card group relative overflow-hidden"
              >
                <div className="mb-6 relative z-10">
                  <div className="flex items-center justify-between gap-3 mb-4">
                     <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg truncate max-w-[200px]">
                       {u.nama_mapel}
                     </span>
                     <span className={`text-[10px] font-bold uppercase border px-2.5 py-1 rounded-md tracking-wider ${
                        u.status_pengerjaan === 'Selesai' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        u.status_pengerjaan === 'Mengerjakan' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-violet-500/10 text-violet-400 border-violet-500/20'
                     }`}>
                       {u.status_pengerjaan === 'Mengerjakan' ? 'Sedang Dikerjakan' : u.status_pengerjaan}
                     </span>
                  </div>
                  
                  <h4 className="font-semibold text-xl text-slate-900 mb-4">{u.judul}</h4>
                  
                  <div className="flex gap-4 text-xs font-medium text-slate-500 border-t border-slate-200 pt-4">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> {u.durasi} Menit</span>
                    <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> {u.jml_soal} PG, {u.jml_essay} Ess</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleStartExam(u)}
                  className={`w-full font-medium py-4 rounded-xl flex items-center justify-center gap-2 btn-touch relative z-10 ${
                    u.status_pengerjaan === 'Selesai' ? 'bg-slate-200 text-slate-500 hover:bg-slate-100' :
                    u.status_pengerjaan === 'Mengerjakan' ? 'bg-amber-600 text-white shadow-[0_4px_15px_rgba(217,119,6,0.3)]' :
                    'bg-violet-600 text-white shadow-[0_4px_15px_rgba(139,92,246,0.3)]'
                  }`}
                >
                  {u.status_pengerjaan === 'Selesai' && <><Lock className="w-4 h-4 text-slate-400" /> Ujian Terkunci</>}
                  {u.status_pengerjaan === 'Mengerjakan' && <><PlayCircle className="w-5 h-5" /> Lanjutkan Pengerjaan</>}
                  {u.status_pengerjaan === 'Belum Mulai' && <><PlayCircle className="w-5 h-5" /> Mulai Ujian</>}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
