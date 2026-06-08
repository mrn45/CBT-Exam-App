import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Camera, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { useApp } from '../lib/context';
import { api } from '../lib/api';
import { toast } from './ui/Toast';

export default function CameraMonitor() {
  const { user } = useApp();
  const [activeUjian, setActiveUjian] = useState<any[]>([]);
  const [selectedUjian, setSelectedUjian] = useState('');
  const [progresList, setProgresList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  
  useEffect(() => {
    // Fetch active ujian
    const uQ = query(collection(db, 'ujian'), where('status', '==', 'Aktif'));
    const unsubU = onSnapshot(uQ, (snap) => {
      let exams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveUjian(exams);
      if (exams.length > 0 && !selectedUjian) {
        setSelectedUjian(exams[0].id);
      }
    });

    const sQ = query(collection(db, 'siswa'));
    const unsubS = onSnapshot(sQ, (snap) => {
      setSiswaList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubU();
      unsubS();
    };
  }, []);

  useEffect(() => {
    if (!selectedUjian) {
      setProgresList([]);
      return;
    }
    const pQ = query(collection(db, 'progres'), where('id_ujian', '==', selectedUjian));
    const unsubP = onSnapshot(pQ, (snap) => {
      setProgresList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // Force re-render to check offline status based on time
    const timer = setInterval(() => setProgresList(prev => [...prev]), 5000);
    
    return () => {
      unsubP();
      clearInterval(timer);
    };
  }, [selectedUjian]);

  const filteredProgres = progresList.filter((p: any) => p.status === 'Sedang Mengerjakan' && p.kamera_snapshot);
  const offlineStudents = filteredProgres.filter(p => Date.now() - (p.last_snapshot || 0) > 10000);

  const handleForceSubmit = async (p: any, sInfo: any) => {
    if (confirm(`Yakin ingin menghentikan ujian ${sInfo.nama} secara paksa?`)) {
      try {
        await api.call('force_submit_peserta', { id_ujian: selectedUjian, id_siswa: p.id_siswa });
        toast(`Ujian ${sInfo.nama} berhasil dihentikan paksa`, 'success');
      } catch (err: any) {
        toast(`Gagal: ${err.message}`, 'error');
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden w-full max-w-7xl">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3">
            <Camera className="w-7 h-7" />
            Pantau Kamera Ujian
          </h2>
          <p className="text-violet-100 font-medium text-sm mt-1">Lihat snapshot kamera peserta secara real-time (tampa jeda)</p>
        </div>
        
        <div className="flex bg-white/10 p-1.5 rounded-xl border border-white/20">
          <select 
            value={selectedUjian} 
            onChange={e => setSelectedUjian(e.target.value)}
            className="bg-transparent text-white font-bold outline-none px-4 py-2 cursor-pointer w-full md:w-auto appearance-none"
          >
            <option value="" className="text-slate-800">-- Pilih Ujian Aktif --</option>
            {activeUjian.map((ex: any) => (
              <option key={ex.id} value={ex.id} className="text-slate-800">{ex.judul}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 md:p-8 bg-slate-50/50 min-h-[500px]">
        {offlineStudents.length > 0 && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="bg-red-500 rounded-full p-2 text-white shrink-0">
               <AlertCircle className="w-5 h-5" />
            </div>
            <div>
               <h3 className="text-red-800 font-bold">Peringatan: Koneksi Kamera Terputus</h3>
               <p className="text-red-700 text-sm mt-1">
                 Kamera <strong>{offlineStudents.length}</strong> peserta tidak terhubung (kemungkinan menutup aplikasi atau browser):
               </p>
               <ul className="list-disc list-inside text-red-600 text-sm mt-2 font-medium">
                 {offlineStudents.map(p => {
                    const sInfo = siswaList.find(s => s.id === p.id_siswa) || { nama: p.id_siswa };
                    return <li key={p.id}>{sInfo.nama}</li>
                 })}
               </ul>
            </div>
          </div>
        )}

        {activeUjian.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
             <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-slate-600">Tidak Ada Ujian Aktif</h3>
             <p className="text-slate-500 mt-2">Tidak ada ujian berstatus aktif saat ini.</p>
           </div>
        ) : !selectedUjian ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
             <p className="text-slate-500 font-bold">Silahkan pilih ujian di atas untuk memantau kamera peserta.</p>
           </div>
        ) : filteredProgres.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
             <Camera className="w-16 h-16 text-slate-300 mx-auto mb-3" />
             <p className="text-slate-500 font-bold">Belum ada tangkapan kamera dari peserta untuk ujian ini.</p>
           </div>
        ) : (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
             {filteredProgres.map((p: any) => {
               const sInfo = siswaList.find(s => s.id === p.id_siswa) || { nama: p.id_siswa, username: 'Unknown' };
               const isActive = Date.now() - (p.last_snapshot || 0) < 10000; // less than 10 seconds ago
               return (
                 <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative aspect-video bg-slate-900 group">
                      {p.kamera_snapshot ? (
                        <img 
                          src={p.kamera_snapshot} 
                          alt={`Kamera ${sInfo.nama}`} 
                          className={`w-full h-full object-cover transform -scale-x-100 ${!isActive ? 'grayscale opacity-50' : ''}`}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                           <Camera className="w-8 h-8 text-slate-600" />
                        </div>
                      )}
                      
                      {isActive ? (
                        <div className="absolute top-2 right-2 bg-rose-500 border border-rose-400 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1.5 shadow-lg">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div> LIVE
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 bg-slate-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-lg">
                          <AlertCircle className="w-2.5 h-2.5" /> OFFLINE
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-center">
                       <p className="font-bold text-slate-800 text-sm truncate" title={sInfo.nama}>{sInfo.nama}</p>
                       <p className="text-[10px] text-slate-500 font-semibold mb-2">{sInfo.username}</p>
                       <button onClick={() => handleForceSubmit(p, sInfo)} className="bg-red-50 hover:bg-red-100 text-red-600 w-full py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                         <LogOut className="w-3.5 h-3.5" /> Selesai Paksa
                       </button>
                    </div>
                 </div>
               )
             })}
           </div>
        )}
      </div>
    </div>
  );
}
