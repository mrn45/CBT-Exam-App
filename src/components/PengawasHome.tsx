import { useApp } from '../lib/context';
import { Target, Radio, PenTool, Scale, Camera } from 'lucide-react';
import { motion } from 'motion/react';

export function PengawasHome({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user, settings } = useApp();

  const shortcuts = [
    { id: 'input_cp', label: 'Input CP', icon: Target, desc: 'Input Capaian Pembelajaran untuk ujian', color: 'text-blue-600', bg: 'bg-blue-50', hover: 'hover:border-blue-300 hover:shadow-blue-200/50' },
    { id: 'monitor', label: 'Live Monitor', icon: Radio, desc: 'Pantau progres ujian siswa secara real-time', color: 'text-rose-600', bg: 'bg-rose-50', hover: 'hover:border-rose-300 hover:shadow-rose-200/50' },
    { id: 'panta_kamera', label: 'Monitor Kamera', icon: Camera, desc: 'Pantau kamera siswa sedang ujian', color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:border-indigo-300 hover:shadow-indigo-200/50' },
    { id: 'koreksi', label: 'Koreksi Essay', icon: PenTool, desc: 'Periksa dan nilai jawaban essay siswa', color: 'text-amber-600', bg: 'bg-amber-50', hover: 'hover:border-amber-300 hover:shadow-amber-200/50' },
    { id: 'katrol_asli', label: 'Katrol Nilai Asli', icon: Scale, desc: 'Penyesuaian nilai asli ujian siswa', color: 'text-teal-600', bg: 'bg-teal-50', hover: 'hover:border-teal-300 hover:shadow-teal-200/50' },
    { id: 'katrol', label: 'Nilai Akhir', icon: Scale, desc: 'Kelola nilai akhir dan penyesuaian (katrol)', color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:border-emerald-300 hover:shadow-emerald-200/50' },
  ].filter(s => !(s.id === 'katrol_asli' && settings?.fitur_katrol === false));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 sm:p-10 text-slate-900 relative overflow-hidden flex flex-col justify-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/20 blur-[100px] pointer-events-none rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-400/20 blur-[80px] pointer-events-none rounded-full"></div>
        <h3 className="text-3xl font-semibold mb-2 tracking-tight relative z-10">Halo, {user?.nama}! 👋</h3>
        <p className="text-slate-500 text-sm sm:text-base max-w-lg relative z-10">
          Selamat datang di Dasbor Pengawas. Pilih menu pintasan di bawah ini untuk mengelola dan memantau ujian secara cepat.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {shortcuts.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => onNavigate(s.id)}
              className={`bg-white border border-slate-200 p-6 rounded-[1.5rem] cursor-pointer smooth-transition shadow-sm flex flex-col items-center text-center group ${s.hover}`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${s.bg} ${s.color} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">{s.label}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
