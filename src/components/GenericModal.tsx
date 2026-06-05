import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { toast } from './ui/Toast';
import { useApp } from '../lib/context';

export function GenericModal({ isOpen, onClose, schema, initialData, colName }: { isOpen: boolean, onClose: () => void, schema: any[], initialData: any, colName: string }) {
  const { user } = useApp();
  const [formData, setFormData] = useState<any>(initialData || {});
  const [isSaving, setIsSaving] = useState(false);
  
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  
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
          if (user?.role === 'Pengawas' && user?.id_mapel && user.id_mapel !== 'ALL') {
             fetchedMapel = fetchedMapel.filter(m => m.id === user.id_mapel);
          }
          
          setMapelList(fetchedMapel);
          setKelasList(kelasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      if (initialData?.id) {
        // Update
        const ref = doc(db, colName, initialData.id);
        const toSave = { ...formData };
        delete toSave.id;
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

        await updateDoc(ref, toSave);
        if (colName === 'nilai' && toSave.status_koreksi === 'Sudah Dikoreksi') {
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
                id_mapel: formData.id_mapel,
                id_kelas: formData.id_kelas,
                capaian_pembelajaran: cp.capaian_pembelajaran,
                deskripsi: cp.deskripsi,
                id
             });
           }
        } else {
          const id = Math.random().toString(36).substr(2, 9);
          const ref = doc(db, colName, id);
          await setDoc(ref, { ...formData, id });
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
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">URL File PDF Ujian</label>
                      <input 
                        type="url"
                        placeholder="https://example.com/soal.pdf"
                        required
                        value={formData[c] || ''} 
                        onChange={e => setFormData({...formData, [c]: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition" 
                      />
                    </div>
                  );
                }

                if (c === 'waktu_mulai') {
                  return (
                    <div key={c}>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Waktu Mulai Ujian</label>
                      <input 
                        type="datetime-local"
                        required
                        value={formData[c] || ''} 
                        onChange={e => setFormData({...formData, [c]: e.target.value})} 
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
                      type={c.includes('password') ? 'password' : 'text'}
                      required
                      value={formData[c] || ''} 
                      onChange={e => setFormData({...formData, [c]: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition" 
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
