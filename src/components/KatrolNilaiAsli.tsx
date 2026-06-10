import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Scale, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { useApp } from '../lib/context';

export default function KatrolNilaiAsli() {
  const { user } = useApp();
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [selectedUjian, setSelectedUjian] = useState('');
  const [nilaiList, setNilaiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [katrolType, setKatrolType] = useState('tambah'); // 'tambah' or 'persen'
  const [katrolValue, setKatrolValue] = useState(10);
  const [successMsg, setSuccessMsg] = useState('');
  const [katrolMode, setKatrolMode] = useState('massal'); // 'massal' | 'individu'
  const [editingNilai, setEditingNilai] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch ujian
    const uQ = query(collection(db, 'ujian'));
    const unsubU = onSnapshot(uQ, (snap) => {
      let exams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (user?.role === 'Pengawas' && user?.mengajar && Array.isArray(user.mengajar)) {
        const allowedMapel = user.mengajar.map((m: any) => m.id_mapel);
        const isAllMapel = allowedMapel.includes('ALL');
        if (!isAllMapel) {
          exams = exams.filter((ex: any) => allowedMapel.includes(ex.id_mapel));
        }
      }
      setUjianList(exams);
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
      setNilaiList([]);
      return;
    }
    const nQ = query(collection(db, 'nilai'), where('id_ujian', '==', selectedUjian));
    const unsubN = onSnapshot(nQ, (snap) => {
      setNilaiList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubN();
  }, [selectedUjian]);

  const handleApplyKatrol = async () => {
    if (nilaiList.length === 0) return;
    setLoading(true);
    setSuccessMsg('');
    try {
      const promises = nilaiList.map((n) => {
        let currentAsli = parseInt(n.nilai_asli || 0);
        let newAsli = currentAsli;
        if (katrolType === 'tambah') {
          newAsli += Number(katrolValue);
        } else if (katrolType === 'persen') {
          newAsli += Math.round(currentAsli * (Number(katrolValue) / 100));
        }
        if (newAsli > 100) newAsli = 100;

        const harian = parseFloat(n.nilai_harian ?? '0');
        const tugas = parseFloat(n.nilai_tugas ?? '0');
        const akhir = (harian * 0.4) + (tugas * 0.2) + (newAsli * 0.4);
        const nilai_katrol = Math.round(akhir);

        return updateDoc(doc(db, 'nilai', n.id), {
          nilai_asli: newAsli,
          nilai_katrol
        });
      });

      await Promise.all(promises);
      setSuccessMsg(`Berhasil mengkatrol nilai asli untuk ${nilaiList.length} peserta.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      alert('Gagal memproses katrol nilai.');
    }
    setLoading(false);
  };

  const handleEditNilai = (id: string, val: string) => {
    setEditingNilai(prev => ({...prev, [id]: val}));
  };

  const saveIndividual = async (n: any) => {
    const valStr = editingNilai[n.id];
    if (valStr === undefined) return;
    let newAsli = parseInt(valStr);
    if (isNaN(newAsli)) return;
    if (newAsli > 100) newAsli = 100;

    setLoading(true);
    try {
      const harian = parseFloat(n.nilai_harian ?? '0');
      const tugas = parseFloat(n.nilai_tugas ?? '0');
      const akhir = (harian * 0.4) + (tugas * 0.2) + (newAsli * 0.4);
      const nilai_katrol = Math.round(akhir);

      await updateDoc(doc(db, 'nilai', n.id), {
        nilai_asli: newAsli,
        nilai_katrol
      });
      setSuccessMsg(`Berhasil memperbarui nilai untuk satu peserta.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setEditingNilai(prev => {
        const next = {...prev};
        delete next[n.id];
        return next;
      });
    } catch(err) {
      alert('Gagal memproses nilai.');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden w-full max-w-5xl">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3">
            <Scale className="w-7 h-7" />
            Penyesuaian Nilai Ujian
          </h2>
          <p className="text-emerald-100 font-medium text-sm mt-1">Penyesuaian nilai asli ujian siswa secara massal atau individu</p>
        </div>
        
        <div className="flex bg-white/10 p-1.5 rounded-xl border border-white/20">
          <select 
            value={selectedUjian} 
            onChange={e => setSelectedUjian(e.target.value)}
            className="bg-transparent text-white font-bold outline-none px-4 py-2 cursor-pointer w-full md:w-auto appearance-none"
          >
            <option value="" className="text-slate-800">-- Pilih Ujian --</option>
            {ujianList.map((ex: any) => (
              <option key={ex.id} value={ex.id} className="text-slate-800">{ex.judul}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 md:p-8 bg-slate-50/50 min-h-[500px]">
        {!selectedUjian ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
             <Scale className="w-16 h-16 text-slate-300 mx-auto mb-4" />
             <p className="text-slate-500 font-bold">Silahkan pilih ujian di atas untuk menyesuaikan nilai asli.</p>
           </div>
        ) : nilaiList.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
             <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
             <p className="text-slate-500 font-bold">Belum ada nilai untuk ujian ini.</p>
           </div>
        ) : (
           <div className="space-y-6">
             <div className="flex border-b border-slate-200 mb-6 gap-6">
                <button
                  onClick={() => setKatrolMode('massal')}
                  className={`pb-3 font-semibold text-sm ${katrolMode === 'massal' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Penyesuaian Massal
                </button>
                <button
                  onClick={() => setKatrolMode('individu')}
                  className={`pb-3 font-semibold text-sm ${katrolMode === 'individu' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Penyesuaian Individu
                </button>
             </div>

             {katrolMode === 'massal' ? (
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                 <div className="flex-1">
                   <h3 className="font-bold text-slate-800 mb-1">Nilai akhir</h3>
                   <p className="text-slate-500 text-sm">Tambahkan poin nilai asli ke semua peserta. Tipe: Poin Fix atau Persentase.</p>
                 </div>
                 
                 <div className="flex gap-2 w-full sm:w-auto">
                   <select 
                     value={katrolType} 
                     onChange={(e) => setKatrolType(e.target.value)}
                     className="bg-slate-50 border border-slate-200 text-slate-700 h-11 px-4 rounded-xl outline-none text-sm font-semibold focus:border-emerald-500"
                   >
                     <option value="tambah">+ Tambah Poin</option>
                     <option value="persen">+ Persentase (%)</option>
                   </select>
                   
                   <input 
                     type="number" 
                     value={katrolValue} 
                     onChange={(e) => setKatrolValue(Number(e.target.value))}
                     className="bg-slate-50 border border-slate-200 text-slate-700 h-11 w-24 px-4 rounded-xl outline-none text-sm font-semibold focus:border-emerald-500 text-center"
                   />
                   
                   <button 
                     onClick={handleApplyKatrol}
                     disabled={loading}
                     className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 rounded-xl flex items-center justify-center shrink-0 shadow-sm font-bold gap-2 transition-colors disabled:opacity-50"
                   >
                     <Save className="w-4 h-4" /> {loading ? 'Memproses...' : 'Terapkan'}
                   </button>
                 </div>
               </div>
             ) : (
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-1">Penyesuaian Individu</h3>
                 <p className="text-slate-500 text-sm">Ubah dan simpan nilai asli peserta ujian secara individu dengan memasukkan nilai langsung pada tabel.</p>
               </div>
             )}
             
             {successMsg && (
               <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3">
                 <CheckCircle className="w-5 h-5 text-emerald-500" />
                 <p className="text-emerald-800 font-medium">{successMsg}</p>
               </div>
             )}

             <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
               <table className="w-full text-left text-sm whitespace-nowrap text-slate-700">
                 <thead className="bg-slate-50 text-slate-800 border-b border-slate-200">
                   <tr>
                     <th className="px-6 py-4 font-semibold">Nama Siswa</th>
                     <th className="px-6 py-4 font-semibold text-center">Nilai Asli</th>
                     <th className="px-6 py-4 font-semibold text-center">Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {nilaiList.map((n: any) => {
                     const sInfo = siswaList.find(s => s.id === n.id_siswa) || { nama: n.id_siswa };
                     return (
                       <tr key={n.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                         <td className="px-6 py-4 font-medium">{sInfo.nama}</td>
                         <td className="px-6 py-4 text-center">
                           {katrolMode === 'individu' ? (
                             <div className="flex flex-col gap-1 items-center justify-center">
                               <div className="flex items-center justify-center gap-2">
                                 <input 
                                   type="number" 
                                   value={editingNilai[n.id] !== undefined ? editingNilai[n.id] : n.nilai_asli}
                                   onChange={(e) => handleEditNilai(n.id, e.target.value)}
                                   className="bg-slate-50 border border-slate-200 text-slate-700 h-9 w-20 px-2 rounded-lg outline-none text-sm font-semibold focus:border-emerald-500 text-center"
                                 />
                                 {editingNilai[n.id] !== undefined && editingNilai[n.id] !== String(n.nilai_asli) && (
                                   <button
                                     onClick={() => saveIndividual(n)}
                                     disabled={loading}
                                     className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 h-9 px-3 rounded-lg flex items-center justify-center shrink-0 shadow-sm font-bold transition-colors disabled:opacity-50 text-xs gap-1"
                                   >
                                     <Save className="w-3 h-3" /> Simpan
                                   </button>
                                 )}
                               </div>
                               {(() => {
                                  const ujk = ujianList.find(u => u.id === selectedUjian);
                                  if (ujk && ujk.nilai_kkm !== undefined) {
                                     const kkm = Number(ujk.nilai_kkm);
                                     const valSet = editingNilai[n.id] !== undefined ? Number(editingNilai[n.id] || 0) : Number(n.nilai_asli || 0);
                                     const isPass = valSet >= kkm;
                                     return (
                                       <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isPass ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                         KKTP: {kkm}
                                       </span>
                                     );
                                  }
                                  return null;
                               })()}
                             </div>
                           ) : (
                             <div className="flex flex-col gap-1 items-center">
                               <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg inline-block">
                                 {n.nilai_asli}
                               </span>
                               {(() => {
                                  const ujk = ujianList.find(u => u.id === selectedUjian);
                                  if (ujk && ujk.nilai_kkm !== undefined) {
                                     const kkm = Number(ujk.nilai_kkm);
                                     const n_asli = Number(n.nilai_asli || 0);
                                     const isPass = n_asli >= kkm;
                                     return (
                                       <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isPass ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                         KKTP: {kkm} {isPass ? '(Lulus)' : '(Remedial)'}
                                       </span>
                                     );
                                  }
                                  return null;
                               })()}
                             </div>
                           )}
                         </td>
                         <td className="px-6 py-4 text-center">
                           <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                             {n.status}
                           </span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
