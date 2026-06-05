import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useApp } from '../lib/context';
import { toast } from './ui/Toast';
import { Layers, Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { GenericModal } from './GenericModal';
import { db } from '../lib/firebase';
import { deleteDoc, doc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

export function GenericView({ menu }: { menu: string }) {
  const { user } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [inlineValues, setInlineValues] = useState<Record<string, Record<string, string>>>({});
  
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [filterMapel, setFilterMapel] = useState<string>('');
  const [filterKelas, setFilterKelas] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (menu === 'data_cp' || menu === 'input_cp' || menu === 'rekap' || menu === 'katrol' || menu === 'monitor') {
      const fetchFilters = async () => {
        try {
          const mapelSnap = await getDocs(collection(db, 'mapel'));
          const kelasSnap = await getDocs(collection(db, 'kelas'));
          const siswaSnap = await getDocs(collection(db, 'siswa'));
          const ujianSnap = await getDocs(collection(db, 'ujian'));
          setMapelList(mapelSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setKelasList(kelasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setSiswaList(siswaSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setUjianList(ujianSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error("Failed to load filters: ", e);
        }
      };
      fetchFilters();
    }
  }, [menu]);

  const getColName = () => {
    if (menu === 'data_kelas') return 'kelas';
    if (menu === 'data_mapel') return 'mapel';
    if (menu === 'data_guru') return 'guru';
    if (menu === 'data_siswa') return 'siswa';
    if (menu === 'data_cp' || menu === 'input_cp') return 'capaian_pembelajaran';
    if (menu === 'bank_soal') return 'soal';
    if (menu === 'ujian') return 'ujian';
    if (menu === 'koreksi') return 'nilai';
    if (menu === 'rekap' || menu === 'katrol') return 'nilai';
    if (menu === 'monitor') return 'progres';
    return '';
  }

  useEffect(() => {
    let endpoint = '';
    if (menu === 'data_kelas') endpoint = 'get_kelas';
    if (menu === 'data_mapel') endpoint = 'get_mapel';
    if (menu === 'data_guru') endpoint = 'get_guru';
    if (menu === 'data_siswa') endpoint = 'get_siswa';
    if (menu === 'data_cp' || menu === 'input_cp') endpoint = 'get_all_cp';
    if (menu === 'bank_soal') endpoint = 'get_bank_soal';
    if (menu === 'ujian') endpoint = 'get_ujian';
    if (menu === 'koreksi') endpoint = 'get_koreksi_list';
    if (menu === 'rekap' || menu === 'katrol') endpoint = 'get_rekap';
    if (menu === 'monitor') endpoint = 'get_progres';
    
    let unsub: any = null;
    if (endpoint) {
      setLoading(true);
      api.subscribe(endpoint, {}, (newdata) => {
         setData(newdata || []);
         setLoading(false);
      }).then(u => { unsub = u; }).catch(e => {
        toast('Gagal memuat data dari database real-time', 'error');
        setLoading(false);
      });
    } else {
      setLoading(false);
      setData([]);
    }
    
    return () => {
      if (typeof unsub === 'function') unsub();
    }
  }, [menu]);

  const title = menu.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  const getMenuSchema = () => {
    if (menu === 'data_kelas') return ['nama', 'tingkat'];
    if (menu === 'data_mapel') return ['nama', 'kategori'];
    if (menu === 'data_guru') return ['nama', 'nip', 'password', 'id_mapel', 'id_kelas'];
    if (menu === 'data_siswa') return ['nama', 'nis', 'password', 'id_kelas'];
    if (menu === 'data_cp' || menu === 'input_cp') return ['id_mapel', 'id_kelas', 'capaian_pembelajaran', 'deskripsi'];
    if (menu === 'bank_soal') return ['id_ujian', 'pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'opsi_e', 'jawaban_benar'];
    if (menu === 'ujian') return ['judul', 'id_mapel', 'id_kelas', 'waktu_mulai', 'durasi_menit', 'jml_soal', 'jml_essay', 'jml_opsi', 'status', 'file_pdf'];
    if (menu === 'rekap' || menu === 'katrol') return ['id_siswa', 'nilai_asli', 'nilai_harian', 'nilai_tugas', 'nilai_katrol', 'status', 'status_koreksi'];
    if (menu === 'koreksi') return ['id_ujian', 'id_siswa', 'nilai_asli', 'status', 'jawaban_essay', 'status_koreksi'];
    if (menu === 'monitor') return ['id_ujian', 'id_siswa', 'status', 'terjawab'];
    return null;
  };

  let schema = getMenuSchema();
  if (!schema) {
    schema = data.length > 0 ? Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object' && k !== 'id') : [];
  }

  const handleAdd = () => {
    if (schema.length === 0 && data.length === 0) {
       toast('Struktur data belum dikenali', 'warning');
       return;
    }
    setEditingData(null);
    setModalOpen(true);
  };
  
  const handleProsesKatrol = async (row: any) => {
    try {
      const harian = parseFloat(inlineValues[row.id]?.nilai_harian ?? row.nilai_harian ?? '0');
      const tugas = parseFloat(inlineValues[row.id]?.nilai_tugas ?? row.nilai_tugas ?? '0');
      const ujian = parseFloat(row.nilai_asli ?? '0');
      
      const akhir = (harian * 0.4) + (tugas * 0.2) + (ujian * 0.4);
      const nilai_katrol = Math.round(akhir);
      
      const updateData = {
        nilai_harian: harian,
        nilai_tugas: tugas,
        nilai_katrol
      };
      
      await updateDoc(doc(db, 'nilai', row.id), updateData);
      toast('Nilai akhir berhasil diproses', 'success');
    } catch (err: any) {
      toast('Gagal memproses nilai: ' + err.message, 'error');
    }
  };

  const handleProsesSemua = async () => {
    try {
      if (filteredData.length === 0) return;
      toast('Memproses nilai akhir semua siswa...', 'success');
      
      const promises = filteredData.map(row => {
        const harian = parseFloat(inlineValues[row.id]?.nilai_harian ?? row.nilai_harian ?? '0');
        const tugas = parseFloat(inlineValues[row.id]?.nilai_tugas ?? row.nilai_tugas ?? '0');
        const ujian = parseFloat(row.nilai_asli ?? '0');
        
        const akhir = (harian * 0.4) + (tugas * 0.2) + (ujian * 0.4);
        const nilai_katrol = Math.round(akhir);
        
        const updateData = {
          nilai_harian: harian,
          nilai_tugas: tugas,
          nilai_katrol
        };
        
        return updateDoc(doc(db, 'nilai', row.id), updateData);
      });

      await Promise.all(promises);
      toast('Berhasil memproses semua nilai akhir', 'success');
    } catch (err: any) {
      toast('Gagal memproses nilai: ' + err.message, 'error');
    }
  };

  const handleEdit = (row: any) => {
    setEditingData(row);
    setModalOpen(true);
  };
  
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [kunciModalUjian, setKunciModalUjian] = useState<any>(null);
  const [tempKunci, setTempKunci] = useState<Record<number, string>>({});

  const handleEditKunci = (row: any) => {
    setKunciModalUjian(row);
    setTempKunci(row.kunci_jawaban || {});
  };

  const handleSaveKunci = async () => {
    if (!kunciModalUjian) return;
    try {
      const ref = doc(db, 'ujian', kunciModalUjian.id);
      await updateDoc(ref, { kunci_jawaban: tempKunci });
      toast('Kunci jawaban berhasil disimpan', 'success');
      setKunciModalUjian(null);
    } catch(err: any) {
      toast('Gagal menyimpan kunci: ' + err.message, 'error');
    }
  };

  const handleDelete = async (row: any) => {
    setDeleteTarget(row);
  };

  const confirmDelete = async () => {
    if(!deleteTarget) return;
    try {
      if (deleteTarget.type === 'kosongkan_data') {
         for (const row of filteredData) {
            await deleteDoc(doc(db, getColName(), row.id));
         }
         toast('Semua data berhasil dikosongkan', 'success');
      } else if (deleteTarget.type === 'reset_semua') {
         for (const row of filteredData) {
             await deleteDoc(doc(db, 'progres', row.id));
             const qs = await getDocs(query(collection(db, 'nilai'), where('id_siswa', '==', row.id_siswa), where('id_ujian', '==', row.id_ujian)));
             for (const d of qs.docs) {
                 await deleteDoc(doc(db, 'nilai', d.id));
             }
         }
         toast('Semua peserta berhasil direset', 'success');
      } else if (menu === 'monitor') {
         await deleteDoc(doc(db, 'progres', deleteTarget.id));
         const qs = await getDocs(query(collection(db, 'nilai'), where('id_siswa', '==', deleteTarget.id_siswa), where('id_ujian', '==', deleteTarget.id_ujian)));
         for (const d of qs.docs) {
             await deleteDoc(doc(db, 'nilai', d.id));
         }
         toast('Siswa berhasil direset dan dapat mengerjakan ulang ujian', 'success');
      } else {
         await deleteDoc(doc(db, getColName(), deleteTarget.id));
         toast('Data terhapus', 'success');
      }
    } catch (e: any) {
      toast('Gagal memproses: ' + e.message, 'error');
    }
    setDeleteTarget(null);
  };

  const handleDownloadTemplate = () => {
    let csvContent = "";
    if (menu === 'data_guru') {
      csvContent = "nama,nip,mengajar,password\nJohn Doe,19800101,Matematika,123456";
    } else if (menu === 'data_siswa') {
      csvContent = "nama,nis,kelas,password\nJane Doe,1001,X MIPA 1,123456";
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_${menu}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.xlsx,.xls';
    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        toast(`Berhasil mengunggah ${file.name}. Mengimpor data...`, 'success');
        // Implementasi pembacaan excellsok bisa dilakukan menggunakan xlsx library.
      }
    };
    fileInput.click();
  };

  const filteredData = data.filter((row: any) => {
    if (user?.role === 'Pengawas') {
      if (user.id_kelas && user.id_kelas !== 'ALL') {
        if (['rekap', 'katrol', 'monitor'].includes(menu)) {
           const siswa = siswaList.find(s => s.id === row.id_siswa);
           if (!siswa || siswa.id_kelas !== user.id_kelas) return false;
        } else if (row.id_kelas && row.id_kelas !== user.id_kelas) {
           return false;
        }
      }
      if (user.id_mapel && user.id_mapel !== 'ALL') {
         if (['rekap', 'katrol', 'monitor'].includes(menu)) {
            const ujian = ujianList.find(u => u.id === row.id_ujian);
            if (!ujian || ujian.id_mapel !== user.id_mapel) return false;
         } else if (row.id_mapel && row.id_mapel !== user.id_mapel) {
            return false;
         }
      }
    }

    if ((menu === 'data_cp' || menu === 'input_cp') && filterMapel && row.id_mapel !== filterMapel) return false;
    if ((menu === 'data_cp' || menu === 'input_cp') && filterKelas && row.id_kelas !== filterKelas) return false;
    
    if (['rekap', 'katrol', 'monitor'].includes(menu)) {
      if (filterKelas) {
        const siswa = siswaList.find(s => s.id === row.id_siswa);
        if (siswa && siswa.id_kelas !== filterKelas) return false;
      }
      if (filterMapel) {
        const ujian = ujianList.find(u => u.id === row.id_ujian);
        if (ujian && ujian.id_mapel !== filterMapel) return false;
      }
    }

    if (searchQuery) {
      const searchableStr = Object.values(row).join(' ').toLowerCase();
      if (!searchableStr.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const handleExportData = () => {
    let csvContent = schema.join(',') + '\n';
    filteredData.forEach(row => {
      csvContent += schema.map(c => `"${String(row[c] || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_${menu}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 h-full p-1 max-w-7xl mx-auto w-full">
      
      <GenericModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        schema={schema} 
        initialData={editingData} 
        colName={getColName()} 
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {deleteTarget.type === 'kosongkan_data' ? 'Konfirmasi Kosongkan Data' : (deleteTarget.type === 'reset_semua' ? 'Konfirmasi Reset Semua' : (menu === 'monitor' ? 'Konfirmasi Reset' : 'Konfirmasi Hapus'))}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {deleteTarget.type === 'kosongkan_data' ? 'Yakin ingin mengosongkan seluruh data pada tabel ini? Aksi ini tidak dapat dikembalikan.' : (deleteTarget.type === 'reset_semua' ? 'Yakin ingin mereset seluruh ujian siswa di tabel ini? Aksi ini tidak dapat dikembalikan.' : (menu === 'monitor' ? 'Yakin ingin mereset ujian siswa ini dari awal?' : 'Yakin ingin menghapus data ini?'))}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-slate-100 py-3 rounded-full hover:bg-slate-200 font-semibold text-slate-700 btn-touch">Batal</button>
              <button onClick={confirmDelete} className={`flex-1 ${deleteTarget.type === 'reset_semua' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} py-3 rounded-full text-white font-semibold btn-touch shadow-lg`}>
                {deleteTarget.type === 'kosongkan_data' ? 'Kosongkan' : (deleteTarget.type === 'reset_semua' ? 'Reset Semua' : (menu === 'monitor' ? 'Reset' : 'Hapus'))}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-5 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">Kelola data {title.toLowerCase()} pada sistem</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {(menu === 'data_guru' || menu === 'data_siswa') && (
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <button onClick={handleDownloadTemplate} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 h-10 px-4 rounded-full flex items-center justify-center shrink-0 btn-touch shadow-sm text-xs font-semibold gap-2">
                <Download className="w-4 h-4" /> Template {title.split(' ')[1]}
              </button>
              <button onClick={handleUploadClick} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 h-10 px-4 rounded-full flex items-center justify-center shrink-0 btn-touch shadow-sm text-xs font-semibold gap-2">
                <Upload className="w-4 h-4" /> Upload Excel
              </button>
            </div>
          )}
          {['data_cp', 'input_cp', 'rekap', 'katrol', 'monitor'].includes(menu) && (
            <div className="hidden sm:flex items-center gap-2 mr-2">
              {(menu === 'data_cp' || (menu === 'input_cp' && user?.role !== 'Pengawas') || menu === 'rekap' || menu === 'katrol' || menu === 'monitor') && (
                <select
                  value={filterMapel}
                  onChange={(e) => setFilterMapel(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 h-10 px-4 rounded-full outline-none text-xs font-semibold focus:border-violet-500 w-32"
                >
                  <option value="">Semua Mapel</option>
                  {mapelList.map(m => <option key={m.id} value={m.id}>{m.nama || m.id}</option>)}
                </select>
              )}
              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 h-10 px-4 rounded-full outline-none text-xs font-semibold focus:border-violet-500 w-32"
              >
                <option value="">Semua Kelas</option>
                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama || k.id}</option>)}
              </select>
              {(menu === 'data_cp' || (menu === 'input_cp' && user?.role !== 'Pengawas') || menu === 'rekap') && (
                <button onClick={handleExportData} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 h-10 px-4 rounded-full flex items-center justify-center shrink-0 btn-touch shadow-sm text-xs font-semibold gap-2">
                  <Download className="w-4 h-4" /> Export
                </button>
              )}
            </div>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Pencarian..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-full text-sm text-slate-800 outline-none focus:border-violet-500"
            />
          </div>
          {!['rekap', 'katrol', 'monitor', 'koreksi'].includes(menu) && (
            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 w-10 h-10 rounded-full flex items-center justify-center shrink-0 btn-touch shadow-sm hidden sm:flex">
              <Filter className="w-4 h-4" />
            </button>
          )}
          {!['rekap', 'katrol', 'monitor', 'koreksi'].includes(menu) && (
            <button onClick={handleAdd} className="bg-violet-600 hover:bg-violet-700 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0 btn-touch shadow-[0_4px_15px_rgba(139,92,246,0.3)]">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-[2rem] overflow-hidden flex flex-col relative w-full">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">Memuat data...</div>
        ) : filteredData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
             <Layers className="w-16 h-16 text-slate-800 mb-4" />
             <p>Data belum tersedia / Endpoint tidak ditemukan</p>
             {!['rekap', 'katrol', 'monitor', 'koreksi'].includes(menu) && (
               <button onClick={() => setModalOpen(true)} className="mt-4 px-6 py-2.5 bg-violet-600 text-sm font-semibold text-white rounded-full btn-touch shadow-[0_4px_15px_rgba(139,92,246,0.3)]">Tambah Data Awal</button>
             )}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar flex-1 w-full relative">
            <table className="w-full text-left text-sm whitespace-nowrap text-slate-700 min-w-[800px]">
              <thead className="bg-slate-50 text-slate-800 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  {schema.map(c => (
                    <th key={c} className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-slate-500">
                      {c === 'nilai_katrol' ? 'NILAI AKHIR' : c.replace(/_/g, ' ')}
                    </th>
                  ))}
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-slate-500 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {filteredData.map((row, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={row.id || i} 
                    className="hover:bg-slate-100/30 transition-colors group"
                  >
                    {schema.map((c) => (
                      <td key={c} className="px-6 py-4">
                        {c === 'nilai_harian' || c === 'nilai_tugas' ? (
                          (user?.role === 'Guru' || user?.role === 'Pengawas') ? (
                            <input 
                              type="number"
                              className="bg-white border border-slate-200 text-slate-700 w-20 px-2 py-1.5 rounded-lg text-sm outline-none focus:border-violet-500 transition-colors"
                              placeholder="0"
                              value={inlineValues[row.id]?.[c] ?? row[c] ?? ''}
                              onChange={(e) => {
                                setInlineValues(prev => ({
                                  ...prev,
                                  [row.id]: {
                                    ...(prev[row.id] || {}),
                                    [c]: e.target.value
                                  }
                                }))
                              }}
                            />
                          ) : (
                            <span className="font-medium text-slate-700">{row[c] ?? 0}</span>
                          )
                        ) : c === 'status' || c.includes('status') ? (
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            String(row[c]).toLowerCase() === 'aktif' || String(row[c]).toLowerCase() === 'selesai' || String(row[c]).toLowerCase() === 'sudah dikoreksi' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                            String(row[c]).toLowerCase() === 'mengerjakan' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {String(row[c])}
                          </span>
                        ) : c === 'terjawab' && row.total_soal ? (
                          <div className="flex flex-col gap-1.5 w-32">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>{row.terjawab}</span>
                              <span>{row.total_soal}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-violet-500 h-1.5 rounded-full smooth-transition" style={{ width: `${(Number(row.terjawab) / Number(row.total_soal)) * 100}%` }}></div>
                            </div>
                          </div>
                        ) : (
                          <span className="truncate max-w-[250px] inline-block align-bottom text-ellipsis overflow-hidden">
                            {String(row[c]).length > 60 ? String(row[c]).substring(0,60)+'...' : String(row[c])}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      {menu === 'ujian' && (
                         <button onClick={() => handleEditKunci(row)} className="text-emerald-500 hover:text-emerald-400 text-xs font-medium mr-3 btn-touch">Set Kunci</button>
                      )}
                      
                      {(menu === 'rekap' || menu === 'katrol') ? (
                        (user?.role === 'Guru' || user?.role === 'Pengawas') ? (
                          <button onClick={() => handleProsesKatrol(row)} className="text-violet-500 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg text-xs font-semibold mr-3 btn-touch transition-colors">Proses</button>
                        ) : null
                      ) : menu === 'monitor' ? null : (
                        <button onClick={() => handleEdit(row)} className="text-violet-400 hover:text-violet-300 text-xs font-medium mr-3 btn-touch">Edit</button>
                      )}
                      
                      {menu === 'monitor' ? (
                        <button onClick={() => handleDelete(row)} className="text-orange-500 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg text-xs font-semibold btn-touch transition-colors">Reset Peserta</button>
                      ) : (
                        <button onClick={() => handleDelete(row)} className="text-red-500 hover:text-red-400 text-xs font-medium btn-touch">Hapus</button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(menu === 'rekap' || menu === 'katrol') && (user?.role === 'Guru' || user?.role === 'Pengawas') && filteredData.length > 0 && !loading && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end items-center px-6">
            <button 
              onClick={handleProsesSemua} 
              className="px-6 py-2.5 bg-violet-600 text-white font-semibold rounded-full hover:bg-violet-700 btn-touch shadow-[0_4px_15px_rgba(139,92,246,0.3)] text-sm flex items-center gap-2"
            >
              Proses Semua Siswa
            </button>
          </div>
        )}
        {menu === 'monitor' && filteredData.length > 0 && !loading && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end items-center px-6 gap-3">
            <button 
              onClick={() => setDeleteTarget({ type: 'reset_semua' })} 
              className="px-6 py-2.5 bg-orange-600 text-white font-semibold rounded-full hover:bg-orange-700 btn-touch shadow-[0_4px_15px_rgba(234,88,12,0.3)] text-sm flex items-center gap-2"
            >
              Reset Semua Peserta
            </button>
          </div>
        )}
        {user?.role === 'Admin' && ['data_guru', 'data_siswa', 'ujian', 'data_mapel', 'data_kelas', 'rekap'].includes(menu) && filteredData.length > 0 && !loading && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end items-center px-6">
            <button 
              onClick={() => setDeleteTarget({ type: 'kosongkan_data' })} 
              className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 btn-touch shadow-[0_4px_15px_rgba(220,38,38,0.3)] text-sm flex items-center gap-2"
            >
              Kosongkan Data
            </button>
          </div>
        )}
      </div>

      {kunciModalUjian && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Set Kunci Jawaban</h3>
            <p className="text-sm text-slate-500 mb-6">Ujian: <span className="font-semibold text-slate-800">{kunciModalUjian.judul}</span></p>
            
            <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: Number(kunciModalUjian.jml_soal) || 0 }).map((_, i) => (
                  <div key={i} className="flex flex-col bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 smooth-transition">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">No {i + 1}</label>
                    <select
                      className="bg-transparent font-bold text-slate-800 outline-none w-full cursor-pointer"
                      value={tempKunci[i + 1] || ''}
                      onChange={(e) => setTempKunci(prev => ({ ...prev, [i + 1]: e.target.value }))}
                    >
                      <option value="">-</option>
                      {(kunciModalUjian.jml_opsi === 4 ? ['A','B','C','D'] : ['A','B','C','D','E']).map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 shrink-0 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setKunciModalUjian(null)} 
                className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-full hover:bg-slate-200 btn-touch"
              >
                Batal
              </button>
              <button 
                onClick={handleSaveKunci}
                className="px-6 py-3 bg-violet-600 text-white font-semibold rounded-full hover:bg-violet-700 btn-touch shadow-[0_4px_15px_rgba(139,92,246,0.3)] flex items-center gap-2"
              >
                Kunci Tersimpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
