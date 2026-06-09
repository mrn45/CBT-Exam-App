import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { toast } from './ui/Toast';
import { useApp } from '../lib/context';
import { api } from '../lib/api';

export function GenericModal({ isOpen, onClose, schema, initialData, colName }: { isOpen: boolean, onClose: () => void, schema: any[], initialData: any, colName: string }) {
  const { user } = useApp();
  const [formData, setFormData] = useState<any>(initialData || {});
  const [isSaving, setIsSaving] = useState(false);
  
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  
  // Guru Multi Mengajar
  const [mengajarList, setMengajarList] = useState<{id_kelas: string, id_mapel: string}[]>(() => {
    if (colName === 'guru' && initialData) {
      if (initialData.mengajar && Array.isArray(initialData.mengajar)) {
        // Deep copy safely to prevent mutation
        return JSON.parse(JSON.stringify(initialData.mengajar));
      } else if (initialData.id_kelas && initialData.id_mapel) {
        return [{ id_kelas: initialData.id_kelas, id_mapel: initialData.id_mapel }];
      }
    }
    return [{id_kelas: '', id_mapel: ''}];
  });

  // CP Multi Input
  const [jumlahCp, setJumlahCp] = useState(1);
  const [cpList, setCpList] = useState<{capaian_pembelajaran: string, deskripsi: string}>([{capaian_pembelajaran: '', deskripsi: ''}]);

  useEffect(() => {
    if (colName === 'ujian' || colName === 'guru' || colName === 'siswa' || colName === 'capaian_pembelajaran') {
      const fetchData = async () => {
        try {
          const mapelSnap = await getDocs(collection(db, 'mapel'));
          const kelasSnap = await getDocs(collection(db, 'kelas'));
          
          let fetchedMapel = mapelSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (user?.role === 'Pengawas' && user?.mengajar && Array.isArray(user.mengajar)) {
            const allowedMapel = user.mengajar.map((m: any) => m.id_mapel);
            const isAllMapel = allowedMapel.includes('ALL');
            if (!isAllMapel) {
              fetchedMapel = fetchedMapel.filter(m => allowedMapel.includes(m.id));
            }
          }
          
          let fetchedKelas = kelasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (user?.role === 'Pengawas' && user?.mengajar && Array.isArray(user.mengajar)) {
            const allowedKelas = user.mengajar.map((m: any) => m.id_kelas);
            const isAllKelas = allowedKelas.includes('ALL');
            if (!isAllKelas) {
              fetchedKelas = fetchedKelas.filter(k => allowedKelas.includes(k.id));
            }
          }
          
          setMapelList(fetchedMapel);
          setKelasList(fetchedKelas);
        } catch (e) {
          console.error("Failed to load mapel/kelas: ", e);
        }
      };
      if (isOpen) fetchData();
    }
  }, [colName, isOpen, user]);

  const handleSave = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...formData };
      delete payload.id;

      // Force number definitions for numeric schema fields
      const numericFields = ['durasi_menit', 'min_kumpul', 'jml_soal', 'jml_essay', 'jml_opsi', 'nilai_kkm'];
      numericFields.forEach(f => {
        if (payload[f] !== undefined) {
           payload[f] = payload[f] === '' ? 0 : Number(payload[f]);
        }
      });

      if (initialData?.id) {
        // Update
        const ref = doc(db, colName, initialData.id);
        const toSave = { ...payload };
        if (colName === 'nilai' && toSave.status_koreksi === 'Sudah Dikoreksi') {
           let totalEssayNum = 0;
           let essayCount = 0;
           for (const k in toSave) {
              if (k.startsWith('nilai_essay_')) {
                 totalEssayNum += Number(toSave[k]) || 0;
                 essayCount++;
              }
           }
           if (essayCount > 0) {
              const basePg = toSave.nilai_pg !== undefined ? toSave.nilai_pg : (initialData.nilai_pg !== undefined ? initialData.nilai_pg : initialData.nilai_asli);
              toSave.nilai_pg = basePg;
              toSave.nilai_asli = basePg + totalEssayNum;
           }
        }

        if (colName === 'guru') {
          toSave.mengajar = mengajarList.filter(m => m.id_kelas && m.id_mapel);
        }

        await updateDoc(ref, toSave);
        if (colName === 'nilai' && toSave.status_koreksi === 'Sudah Dikoreksi') {
          if (user?.role === 'Guru' || user?.role === 'Pengawas') {
             api.call('add_activity_log', {
                id_user: user.id || user.username,
                nama_user: user.nama || user.username,
                role: user.role,
                aktivitas: `Mengoreksi nilai essay ujian untuk siswa ID: ${toSave.id_siswa || initialData.id_siswa}`
             });
          }
          toast('Nilai koreksi essay berhasil disimpan', 'success');
        } else {
          toast('Data berhasil diperbarui', 'success');
        }
      } else {
        // Create
        if (colName === 'capaian_pembelajaran') {
           // Bulk create CPs
           for (const cp of cpList) {
             const id = Math.random().toString(36).substr(2, 9);
             const ref = doc(db, colName, id);
             await setDoc(ref, {
                id_mapel: payload.id_mapel,
                id_kelas: payload.id_kelas,
                capaian_pembelajaran: cp.capaian_pembelajaran,
                deskripsi: cp.deskripsi,
                id
             });
           }
        } else {
          const newId = formData.id?.trim() || Math.random().toString(36).substr(2, 9);
          const ref = doc(db, colName, newId);
          const toCreate = { ...payload, id: newId };
          if (colName === 'guru') {
            toCreate.mengajar = mengajarList.filter(m => m.id_kelas && m.id_mapel);
          }
          await setDoc(ref, toCreate);
        }
        toast('Data berhasil ditambahkan', 'success');
      }
      onClose();
    } catch (err: any) {
      toast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl overflow-hidden relative"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">{initialData?.id ? 'Edit Data' : 'Tambah Data'}</h3>
              <button type="button" onClick={onClose} disabled={isSaving} className="p-2 bg-slate-200 rounded-full text-slate-500 hover:text-slate-900 btn-touch disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSaving ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar p-1 animate-pulse">
                {schema.map((c, i) => (
                  <div key={i} className="mb-4">
                    <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                    <div className="h-12 bg-slate-100 rounded-xl w-full"></div>
                  </div>
                ))}
                <div className="pt-4 pb-2">
                  <div className="w-full h-12 bg-slate-200 rounded-full"></div>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSave} className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
              {schema.map(c => {
                if (c === 'id_mapel') {
                  return (
                    <div key={c}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mata Pelajaran</label>
                      <select 
                        required
                        value={formData[c] || ''} 
                        onChange={e => setFormData({...formData, [c]: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition"
                      >
                        <option value="">-- Pilih Mata Pelajaran --</option>
                        {colName === 'guru' || colName === 'ujian' ? <option value="ALL">Semua Mata Pelajaran</option> : null}
                        {mapelList.map(m => (
                          <option key={m.id} value={m.id}>{m.nama || m.id}</option>
                        ))}
                      </select>
                    </div>
                  );
                }
                
                if (c === 'id_kelas') {
                  return (
                    <div key={c}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kelas</label>
                      <select 
                        required
                        value={formData[c] || ''} 
                        onChange={e => setFormData({...formData, [c]: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition"
                      >
                        <option value="">-- Pilih Kelas --</option>
                        {colName === 'guru' || colName === 'ujian' ? <option value="ALL">Semua Kelas</option> : null}
                        {kelasList.map(kls => (
                          <option key={kls.id} value={kls.id}>{kls.nama || kls.id}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (c === 'mengajar' && colName === 'guru') {
                  return (
                    <div key={c} className="space-y-4 pt-2">
                       <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-xl">
                          <label className="block text-sm font-semibold text-slate-700">Daftar Kelas & Mapel (Mengajar)</label>
                          <button 
                             type="button"
                             onClick={() => setMengajarList([...mengajarList, {id_kelas: '', id_mapel: ''}])}
                             className="text-xs font-semibold bg-violet-100 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-200"
                          >
                             Tambah
                          </button>
                       </div>
                       {mengajarList.map((m, idx) => (
                          <div key={idx} className="flex gap-3 bg-white p-4 border border-slate-200 rounded-xl relative">
                             <div className="flex-1 space-y-3">
                                <div>
                                   <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kelas</label>
                                   <select
                                       required
                                       value={m.id_kelas}
                                       onChange={(e) => {
                                          const newList = [...mengajarList];
                                          newList[idx] = { ...newList[idx], id_kelas: e.target.value };
                                          setMengajarList(newList);
                                       }}
                                       className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-900 outline-none focus:border-violet-500"
                                   >
                                      <option value="">Pilih Kelas</option>
                                      <option value="ALL">Semua Kelas</option>
                                      {kelasList.map(kls => <option key={kls.id} value={kls.id}>{kls.nama || kls.id}</option>)}
                                   </select>
                                </div>
                                <div>
                                   <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mapel</label>
                                   <select
                                       required
                                       value={m.id_mapel}
                                       onChange={(e) => {
                                          const newList = [...mengajarList];
                                          newList[idx] = { ...newList[idx], id_mapel: e.target.value };
                                          setMengajarList(newList);
                                       }}
                                       className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-900 outline-none focus:border-violet-500"
                                   >
                                      <option value="">Pilih Mata Pelajaran</option>
                                      <option value="ALL">Semua Mata Pelajaran</option>
                                      {mapelList.map(mpl => <option key={mpl.id} value={mpl.id}>{mpl.nama || mpl.id}</option>)}
                                   </select>
                                </div>
                             </div>
                             {mengajarList.length > 1 && (
                                <button type="button" onClick={() => setMengajarList(mengajarList.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1">
                                   <X className="w-4 h-4" />
                                </button>
                             )}
                          </div>
                       ))}
                    </div>
                  );
                }

                if (c === 'jml_opsi') {
                  return (
                    <div key={c}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Jumlah Opsi Jawaban</label>
                      <select 
                        required
                        value={formData[c] || ''} 
                        onChange={e => setFormData({...formData, [c]: Number(e.target.value)})} 
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition"
                      >
                        <option value="">-- Pilih Opsi --</option>
                        <option value={4}>4 (A, B, C, D)</option>
                        <option value={5}>5 (A, B, C, D, E)</option>
                      </select>
                    </div>
                  );
                }

                if (c === 'file_pdf') {
                  return (
                    <div key={c}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">URL File PDF Ujian / ID GDrive</label>
                      <input 
                        type="text"
                        placeholder="https://example.com/soal.pdf atau ID File"
                        value={formData[c] || ''} 
                        onChange={e => setFormData({...formData, [c]: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition" 
                      />
                    </div>
                  );
                }

                if (c === 'waktu_mulai') {
                  const formatDateTimeLocal = (dateStr: string) => {
                    if (!dateStr) return '';
                    if (dateStr.includes('Z')) {
                      // Attempt to format to local if it has Z, but keeping it simple: just take first 16 chars if it's full ISO
                      return dateStr.substring(0, 16);
                    }
                    return dateStr.length > 16 ? dateStr.substring(0, 16) : dateStr;
                  };
                  return (
                    <div key={c}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Waktu Mulai Ujian</label>
                      <input 
                        type="datetime-local"
                        required
                        value={formatDateTimeLocal(formData[c])} 
                        onChange={e => setFormData({...formData, [c]: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition" 
                      />
                    </div>
                  );
                }

                if (c === 'nilai_kkm' || c === 'min_kumpul' || c === 'durasi_menit' || c === 'jml_soal' || c === 'jml_essay') {
                  const labelMap: Record<string, string> = {
                     nilai_kkm: 'Nilai KKTP',
                     min_kumpul: 'Minimal Waktu Pengumpulan (Menit)',
                     durasi_menit: 'Durasi (Menit)',
                     jml_soal: 'Jumlah Soal Pilihan Ganda',
                     jml_essay: 'Jumlah Soal Essay (Opsional)'
                  };
                  return (
                    <div key={c}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{labelMap[c] || c.replace(/_/g, ' ')}</label>
                      <input 
                        type="number"
                        min="0"
                        required={c !== 'jml_essay'}
                        value={formData[c] ?? ''} 
                        onChange={e => setFormData({...formData, [c]: e.target.value === '' ? '' : Number(e.target.value)})} 
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition" 
                      />
                    </div>
                  );
                }

                if (c === 'status') {
                  return (
                    <div key={c}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status Ujian</label>
                      <select 
                        required
                        value={formData[c] || ''} 
                        onChange={e => setFormData({...formData, [c]: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition"
                      >
                        <option value="">-- Pilih Status --</option>
                        <option value="Aktif">Aktif</option>
                        <option value="Tidak Aktif">Tidak Aktif</option>
                      </select>
                    </div>
                  );
                }

                if ((c === 'capaian_pembelajaran' || c === 'deskripsi') && colName === 'capaian_pembelajaran' && !initialData?.id) {
                    if (c === 'deskripsi') return null;
                    return (
                       <div key="cp_multi" className="space-y-4 pt-2">
                         <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-xl">
                            <label className="block text-sm font-semibold text-slate-700">Jumlah CP yang akan di input</label>
                            <input 
                               type="number" 
                               min="1" 
                               max="20"
                               className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-center text-slate-900 outline-none focus:border-violet-500 font-semibold"
                               value={jumlahCp}
                               onChange={e => {
                                 const num = parseInt(e.target.value) || 1;
                                 setJumlahCp(num);
                                 const newList = [...cpList];
                                 while (newList.length < num) newList.push({capaian_pembelajaran: '', deskripsi: ''});
                                 while (newList.length > num) newList.pop();
                                 setCpList(newList);
                               }}
                            />
                         </div>
                         {cpList.map((cp, idx) => (
                           <div key={idx} className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-4">
                              <h4 className="font-bold text-slate-700 text-sm">Capaian Pembelajaran {idx + 1}</h4>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Capaian Pembelajaran</label>
                                <textarea
                                  required
                                  maxLength={100}
                                  value={cp.capaian_pembelajaran}
                                  onChange={e => {
                                     const cl = [...cpList];
                                     cl[idx].capaian_pembelajaran = e.target.value;
                                     setCpList(cl);
                                  }}
                                  placeholder="Maksimal 100 karakter..."
                                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 min-h-[80px]"
                                ></textarea>
                                <p className="text-xs text-right mt-1 text-slate-500">{cp.capaian_pembelajaran.length}/100</p>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Deskripsi</label>
                                <textarea
                                  required
                                  value={cp.deskripsi}
                                  onChange={e => {
                                     const cl = [...cpList];
                                     cl[idx].deskripsi = e.target.value;
                                     setCpList(cl);
                                  }}
                                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 min-h-[80px]"
                                ></textarea>
                              </div>
                           </div>
                         ))}
                       </div>
                    );
                }

                if (c === 'capaian_pembelajaran' || c === 'deskripsi') {
                   return (
                     <div key={c}>
                       <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{c.replace(/_/g, ' ')}</label>
                       <textarea 
                           required 
                           maxLength={c === 'capaian_pembelajaran' ? 100 : undefined}
                           value={formData[c] || ''} 
                           onChange={e => setFormData({...formData, [c]: e.target.value})} 
                           className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition min-h-[80px]" 
                       ></textarea>
                       {c === 'capaian_pembelajaran' && (
                          <p className="text-xs text-right mt-1 text-slate-500">{(formData[c] || '').length}/100</p>
                       )}
                     </div>
                   );
                }

                if (colName === 'nilai' && (c === 'id_ujian' || c === 'id_siswa' || c === 'nilai_asli' || c === 'status' || c === 'status_koreksi')) {
                   return (
                      <div key={c}>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{c.replace(/_/g, ' ')}</label>
                        <input 
                          type="text"
                          disabled
                          value={formData[c] || ''} 
                          className="w-full bg-slate-100 border border-slate-200 p-3.5 rounded-xl text-slate-500 outline-none cursor-not-allowed" 
                        />
                      </div>
                   );
                }

                if (c === 'jawaban_essay' && colName === 'nilai') {
                   let parsedJawaban = {};
                   try { parsedJawaban = JSON.parse(formData.jawaban_essay || '{}'); } catch(e){}
                   const essayList = Object.entries(parsedJawaban).filter(([k,v]) => k.startsWith('essay_'));
                   
                   if (essayList.length === 0) {
                      return <div key={c} className="p-4 bg-orange-50 text-orange-600 rounded-xl text-sm font-semibold border border-orange-200">Tidak ada jawaban essay</div>;
                   }

                   return (
                     <div key={c} className="space-y-4">
                       <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Koreksi Jawaban Essay</h4>
                       <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs p-3 rounded-xl font-medium">
                         Silakan beri nilai pada setiap jawaban essay. Status akan berubah menjadi 'Sudah Dikoreksi' dan nilai akan otomatis diakumulasikan ke Nilai Asli setelah Anda menyimpan.
                       </div>
                       {essayList.map(([key, jawaban], idx) => (
                          <div key={key} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jawaban Siswa (Soal {idx+1})</label>
                              <div className="text-sm text-slate-800 bg-white border border-slate-200 p-3 rounded-lg min-h-[60px] whitespace-pre-wrap">{String(jawaban)}</div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Beri Nilai (Contoh: 10, 20, 50)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                required
                                value={formData[`nilai_${key}`] || ''}
                                onChange={e => {
                                  setFormData({...formData, [`nilai_${key}`]: Number(e.target.value), status_koreksi: 'Sudah Dikoreksi'});
                                }}
                                className="w-full bg-white border border-violet-200 focus:border-violet-500 p-3 rounded-xl text-sm outline-none font-semibold transition-colors"
                              />
                            </div>
                          </div>
                       ))}
                     </div>
                   );
                }

                return (
                  <div key={c}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{c.replace(/_/g, ' ')}</label>
                    <input 
                      type="text"
                      required={c !== 'id'}
                      disabled={c === 'id' && !!initialData?.id}
                      value={formData[c] || ''} 
                      onChange={e => setFormData({...formData, [c]: e.target.value})} 
                      className={`w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition ${c === 'id' && !!initialData?.id ? 'opacity-60 cursor-not-allowed' : ''}`} 
                    />
                  </div>
                );
              })}
              
              <div className="pt-4 pb-2">
                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-8 rounded-full flex items-center justify-center gap-2 btn-touch shadow-[0_4px_15px_rgba(139,92,246,0.3)]">
                  <Save className="w-5 h-5" /> Simpan
                </button>
              </div>
            </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
