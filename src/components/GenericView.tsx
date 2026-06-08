import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useApp } from '../lib/context';
import { toast } from './ui/Toast';
import { Layers, Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { GenericModal } from './GenericModal';
import { db } from '../lib/firebase';
import { deleteDoc, doc, updateDoc, collection, getDocs, query, where, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

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
  
  const [logDateStart, setLogDateStart] = useState<string>('');
  const [logDateEnd, setLogDateEnd] = useState<string>('');
  const [logNamaFilter, setLogNamaFilter] = useState<string>('');

  useEffect(() => {
    if (menu === 'data_cp' || menu === 'input_cp' || menu === 'rekap' || menu === 'katrol' || menu === 'monitor' || menu === 'data_guru' || menu === 'data_siswa' || menu === 'ujian') {
      const fetchFilters = async () => {
        try {
          const mapelSnap = await getDocs(collection(db, 'mapel'));
          const kelasSnap = await getDocs(collection(db, 'kelas'));
          const siswaSnap = await getDocs(collection(db, 'siswa'));
          const ujianSnap = await getDocs(collection(db, 'ujian'));
          let mList = mapelSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (user?.role === 'Pengawas' && user?.mengajar && Array.isArray(user.mengajar)) {
            const allowedMapel = user.mengajar.map((m: any) => m.id_mapel);
            const isAllMapel = allowedMapel.includes('ALL');
            if (!isAllMapel) {
              mList = mList.filter(m => allowedMapel.includes(m.id));
            }
          }
          setMapelList(mList);
          let kList = kelasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (user?.role === 'Pengawas' && user?.mengajar && Array.isArray(user.mengajar)) {
            const allowedKelas = user.mengajar.map((m: any) => m.id_kelas);
            const isAllKelas = allowedKelas.includes('ALL');
            if (!isAllKelas) {
              kList = kList.filter(k => allowedKelas.includes(k.id));
            }
          }
          setKelasList(kList);
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
    if (menu === 'log_aktivitas') return 'log_aktivitas';
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
    if (menu === 'log_aktivitas') endpoint = 'get_log_aktivitas';
    
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
    if (menu === 'data_kelas') return ['id', 'nama', 'tingkat'];
    if (menu === 'data_mapel') return ['nama', 'kategori'];
    if (menu === 'data_guru') return ['nama', 'username', 'password', 'nip', 'mengajar'];
    if (menu === 'data_siswa') return ['nama', 'username', 'password', 'nis', 'id_kelas'];
    if (menu === 'data_cp' || menu === 'input_cp') return ['id_mapel', 'id_kelas', 'capaian_pembelajaran', 'deskripsi'];
    if (menu === 'bank_soal') return ['id_ujian', 'pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'opsi_e', 'jawaban_benar'];
    if (menu === 'ujian') return ['judul', 'id_mapel', 'id_kelas', 'waktu_mulai', 'durasi_menit', 'min_kumpul', 'jml_soal', 'jml_essay', 'jml_opsi', 'nilai_kkm', 'status', 'file_pdf'];
    if (menu === 'rekap' || menu === 'katrol') return ['id_siswa', 'nilai_asli', 'nilai_harian', 'nilai_tugas', 'nilai_katrol', 'status', 'status_koreksi'];
    if (menu === 'koreksi') return ['id_ujian', 'id_siswa', 'nilai_asli', 'status', 'jawaban_essay', 'status_koreksi'];
    if (menu === 'monitor') return ['id_ujian', 'id_siswa', 'status', 'terjawab'];
    if (menu === 'log_aktivitas') return ['timestamp', 'role', 'nama_user', 'aktivitas'];
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
      if (user?.role === 'Guru' || user?.role === 'Pengawas') {
        api.call('add_activity_log', {
          id_user: user.id || user.username,
          nama_user: user.nama || user.username,
          role: user.role,
          aktivitas: `Memproses katrol/nilai akhir untuk siswa ID: ${row.id_siswa}`
        });
      }
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
      if (user?.role === 'Guru' || user?.role === 'Pengawas') {
        api.call('add_activity_log', {
          id_user: user.id || user.username,
          nama_user: user.nama || user.username,
          role: user.role,
          aktivitas: `Memproses massal katrol/nilai akhir untuk ${filteredData.length} siswa`
        });
      }
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
      } else if (deleteTarget.type === 'selesai_paksa') {
         await api.call('force_submit_peserta', { id_ujian: deleteTarget.id_ujian, id_siswa: deleteTarget.id_siswa });
         toast('Ujian siswa berhasil dihentikan paksa', 'success');
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
      csvContent = "nama,username,password,nip,mengajar\nBudi Santoso,budis,123456,19800101,B.Indo:10A;Matematika:10B\nJohn Doe,johndoe,123456,19800102,Fisika:10A";
    } else if (menu === 'data_siswa') {
      csvContent = "nama,username,password,nis,id_kelas\nSiswa Ahmad,ahmad,123456,1001,X MIPA 1";
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
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        toast(`Mengimpor data dari ${file.name}...`, 'success');
        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
              const arrayBuffer = evt.target?.result as ArrayBuffer;
              const dataBuffer = new Uint8Array(arrayBuffer);
              const wb = XLSX.read(dataBuffer, { type: 'array' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const jsonData = XLSX.utils.sheet_to_json(ws);
            
            let count = 0;
            const colName = getColName();
            
            for (const rawRow of jsonData as any[]) {
               // Normalize keys
               const row: any = {};
               for (const key in rawRow) {
                 row[key.trim().toLowerCase()] = rawRow[key];
               }
               
               const id = Math.random().toString(36).substr(2, 9);
               const toSave: any = { id };
               
               if (menu === 'data_guru') {
                 toSave.nama = String(row.nama ?? '').trim();
                 toSave.username = String(row.username ?? '').trim();
                 toSave.password = String(row.password ?? '123456').trim();
                 toSave.nip = String(row.nip ?? '').trim();
                 
                 const mengajarStr = String(row.mengajar ?? '').trim();
                 const mengajarArr: any[] = [];
                 if (mengajarStr && mengajarStr !== '') {
                    const pairs = mengajarStr.split(';');
                    for (const p of pairs) {
                       const parts = p.split(':');
                       if (parts.length >= 2) {
                          mengajarArr.push({ id_mapel: parts[0].trim(), id_kelas: parts[1].trim() });
                       }
                    }
                 }
                 toSave.mengajar = mengajarArr;
               } else if (menu === 'data_siswa') {
                 toSave.nama = String(row.nama ?? '').trim();
                 toSave.username = String(row.username ?? '').trim();
                 toSave.password = String(row.password ?? '123456').trim();
                 toSave.nis = String(row.nis ?? '').trim();
                 toSave.id_kelas = String(row.id_kelas ?? row['id kelas'] ?? row.kelas ?? '').trim();
               }
               
               if (toSave.nama && toSave.username) {
                  await setDoc(doc(db, colName, id), toSave);
                  count++;
               }
            }
            
            toast(`Berhasil mengimpor ${count} data ${title}.`, 'success');
          };
          reader.readAsArrayBuffer(file);
        } catch (err: any) {
          toast('Gagal mengimpor file: ' + err.message, 'error');
        }
      }
    };
    fileInput.click();
  };

  const filteredData = data.filter((row: any) => {
    if (user?.role === 'Pengawas' && user.mengajar && Array.isArray(user.mengajar)) {
      const allowedKelas = user.mengajar.map((m:any) => m.id_kelas);
      const allowedMapel = user.mengajar.map((m:any) => m.id_mapel);
      
      const isAllKelas = allowedKelas.includes('ALL');
      const isAllMapel = allowedMapel.includes('ALL');

      if (!isAllKelas) {
        if (['rekap', 'katrol', 'monitor'].includes(menu)) {
           const siswa = siswaList.find(s => s.id === row.id_siswa);
           if (!siswa || !allowedKelas.includes(siswa.id_kelas)) return false;
        } else if (row.id_kelas && !allowedKelas.includes(row.id_kelas)) {
           return false;
        }
      }
      
      if (!isAllMapel) {
         if (['rekap', 'katrol', 'monitor'].includes(menu)) {
            const ujian = ujianList.find(u => u.id === row.id_ujian);
            if (!ujian || !allowedMapel.includes(ujian.id_mapel)) return false;
         } else if (row.id_mapel && !allowedMapel.includes(row.id_mapel)) {
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

    if (menu === 'log_aktivitas') {
      if (logNamaFilter && typeof row.nama_user === 'string' && !row.nama_user.toLowerCase().includes(logNamaFilter.toLowerCase())) {
        return false;
      }
      if (logDateStart || logDateEnd) {
        if (!row.timestamp) return false;
        const rowDate = new Date(row.timestamp);
        rowDate.setHours(0, 0, 0, 0);
        
        if (logDateStart) {
          const start = new Date(logDateStart);
          start.setHours(0, 0, 0, 0);
          if (rowDate < start) return false;
        }
        if (logDateEnd) {
          const end = new Date(logDateEnd);
          end.setHours(0, 0, 0, 0);
          if (rowDate > end) return false;
        }
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
              {deleteTarget.type === 'kosongkan_data' ? 'Konfirmasi Kosongkan Data' : (deleteTarget.type === 'reset_semua' ? 'Konfirmasi Reset Semua' : (deleteTarget.type === 'selesai_paksa' ? 'Selesai Paksa' : (menu === 'monitor' ? 'Konfirmasi Reset' : 'Konfirmasi Hapus')))}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {deleteTarget.type === 'kosongkan_data' ? 'Yakin ingin mengosongkan seluruh data pada tabel ini? Aksi ini tidak dapat dikembalikan.' : (deleteTarget.type === 'reset_semua' ? 'Yakin ingin mereset seluruh ujian siswa di tabel ini? Aksi ini tidak dapat dikembalikan.' : (deleteTarget.type === 'selesai_paksa' ? 'Yakin ingin menyelesaikan ujian peserta ini secara paksa?' : (menu === 'monitor' ? 'Yakin ingin mereset ujian siswa ini dari awal?' : 'Yakin ingin menghapus data ini?')))}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-slate-100 py-3 rounded-full hover:bg-slate-200 font-semibold text-slate-700 btn-touch">Batal</button>
              <button onClick={confirmDelete} className={`flex-1 ${deleteTarget.type === 'reset_semua' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} py-3 rounded-full text-white font-semibold btn-touch shadow-lg`}>
                {deleteTarget.type === 'kosongkan_data' ? 'Kosongkan' : (deleteTarget.type === 'reset_semua' ? 'Reset Semua' : (deleteTarget.type === 'selesai_paksa' ? 'Selesai Paksa' : (menu === 'monitor' ? 'Reset' : 'Hapus')))}
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
          {!['rekap', 'katrol', 'monitor', 'koreksi', 'log_aktivitas'].includes(menu) && (
            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 w-10 h-10 rounded-full flex items-center justify-center shrink-0 btn-touch shadow-sm hidden sm:flex">
              <Filter className="w-4 h-4" />
            </button>
          )}
          {menu === 'log_aktivitas' && (
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <input 
                type="date"
                value={logDateStart}
                onChange={e => setLogDateStart(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 h-10 px-4 rounded-full outline-none text-xs font-semibold focus:border-violet-500 w-32"
                title="Tanggal Mulai"
              />
              <span className="text-slate-400">-</span>
              <input 
                type="date"
                value={logDateEnd}
                onChange={e => setLogDateEnd(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 h-10 px-4 rounded-full outline-none text-xs font-semibold focus:border-violet-500 w-32"
                title="Tanggal Akhir"
              />
              <input 
                type="text"
                value={logNamaFilter}
                onChange={e => setLogNamaFilter(e.target.value)}
                placeholder="Nama Guru..."
                className="bg-white border border-slate-200 text-slate-700 h-10 px-4 rounded-full outline-none text-xs font-semibold focus:border-violet-500 w-40"
              />
            </div>
          )}
          {!['rekap', 'katrol', 'monitor', 'koreksi', 'log_aktivitas'].includes(menu) && (
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
                      {c === 'nilai_katrol' ? 'NILAI AKHIR' : c === 'nilai_kkm' ? 'NILAI KKTP' : c.replace(/_/g, ' ')}
                    </th>
                  ))}
                  {menu !== 'log_aktivitas' && (
                    <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-slate-500 text-right">Aksi</th>
                  )}
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
                        ) : c === 'mengajar' ? (
                          <div className="flex flex-col gap-1 my-1">
                             {Array.isArray(row[c]) ? row[c].map((m: any, idx: number) => {
                                 const kelasName = m.id_kelas === 'ALL' ? 'Semua Kelas' : (kelasList.find(k => k.id === m.id_kelas)?.nama || m.id_kelas);
                                 const mapelName = m.id_mapel === 'ALL' ? 'Semua Mapel' : (mapelList.find(mpl => mpl.id === m.id_mapel)?.nama || m.id_mapel);
                                 return (
                                   <div key={idx} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] uppercase font-semibold tracking-wider flex items-center justify-between gap-3 min-w-[max-content]">
                                      <span className="truncate max-w-[120px] text-violet-600 font-bold" title={kelasName}>{kelasName}</span>
                                      <span className="truncate max-w-[150px]" title={mapelName}>{mapelName}</span>
                                   </div>
                                 );
                             }) : <span className="text-slate-400 italic font-medium text-xs">Belum diatur</span>}
                          </div>
                        ) : c === 'status' || c.includes('status') ? (
                          <span 
                            onClick={async () => {
                              if (menu === 'ujian' && c === 'status') {
                                try {
                                  const newStatus = String(row[c]).toLowerCase() === 'aktif' ? 'Non-Aktif' : 'Aktif';
                                  const ref = doc(db, getColName(), row.id);
                                  await updateDoc(ref, { status: newStatus });
                                  if (user) {
                                    api.call('add_activity_log', {
                                      id_user: user.id || user.username,
                                      nama_user: user.nama || user.username,
                                      role: user.role,
                                      aktivitas: `Mengubah status ujian ${row.judul || row.id} menjadi ${newStatus}`
                                    });
                                  }
                                  toast(`Status diubah menjadi ${newStatus}`, 'success');
                                } catch (err: any) {
                                  toast('Gagal mengubah status: ' + err.message, 'error');
                                }
                              }
                            }}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${menu === 'ujian' && c === 'status' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${
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
                        ) : c === 'id_kelas' ? (
                          <span className="truncate max-w-[200px] inline-block align-bottom font-medium text-slate-700">
                             {row[c] === 'ALL' ? 'Semua Kelas' : (kelasList.find(k => k.id === row[c])?.nama || row[c])}
                          </span>
                        ) : c === 'id_mapel' ? (
                          <span className="truncate max-w-[200px] inline-block align-bottom font-medium text-slate-700">
                             {row[c] === 'ALL' ? 'Semua Mapel' : (mapelList.find(m => m.id === row[c])?.nama || row[c])}
                          </span>
                        ) : c === 'id_siswa' ? (
                          <span className="truncate max-w-[200px] inline-block align-bottom font-medium text-slate-700">
                             {siswaList.find(s => s.id === row[c])?.nama || row[c]}
                          </span>
                        ) : c === 'id_ujian' ? (
                          <span className="truncate max-w-[200px] inline-block align-bottom font-medium text-slate-700">
                             {ujianList.find(u => u.id === row[c])?.judul || row[c]}
                          </span>
                        ) : c === 'nilai_asli' || c === 'nilai_katrol' ? (
                          <div className="flex flex-col gap-1 items-start">
                             <span className={`font-bold ${row[c] !== undefined && row[c] !== null && row[c] !== '' ? 'px-2 py-1 bg-slate-100 rounded text-slate-800' : 'text-slate-400 italic'}`}>
                               {row[c] !== undefined && row[c] !== null && row[c] !== '' ? row[c] : 'Belum Ada'}
                             </span>
                             {(() => {
                               const ujk = ujianList.find(u => u.id === row.id_ujian);
                               if (ujk && (ujk.nilai_kkm !== undefined && ujk.nilai_kkm !== null && ujk.nilai_kkm !== '')) {
                                  const cVal = Number(row[c]);
                                  const isPass = cVal >= Number(ujk.nilai_kkm);
                                  const hasScore = row[c] !== undefined && row[c] !== null && row[c] !== '';
                                  return (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${!hasScore ? 'bg-slate-100 text-slate-500' : isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      KKTP: {ujk.nilai_kkm} {hasScore ? (isPass ? '(Lulus)' : '(Remedial)') : ''}
                                    </span>
                                  );
                               }
                               return null;
                             })()}
                          </div>
                        ) : c === 'timestamp' && typeof row[c] === 'number' ? (
                          <span className="truncate max-w-[200px] inline-block align-bottom font-medium text-slate-700">
                             {new Date(row[c]).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        ) : (
                          <span className="truncate max-w-[250px] inline-block align-bottom text-ellipsis overflow-hidden">
                            {String(row[c]).length > 60 ? String(row[c]).substring(0,60)+'...' : String(row[c])}
                          </span>
                        )}
                      </td>
                    ))}
                    {menu !== 'log_aktivitas' && (
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
                          <div className="flex gap-2 justify-end">
                            {row.status === 'Sedang Mengerjakan' && (
                              <button onClick={() => setDeleteTarget({ type: 'selesai_paksa', id_ujian: row.id_ujian, id_siswa: row.id_siswa })} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold btn-touch transition-colors">Selesai Paksa</button>
                            )}
                            <button onClick={() => handleDelete(row)} className="text-orange-500 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg text-xs font-semibold btn-touch transition-colors">Reset Peserta</button>
                          </div>
                        ) : (
                          <button onClick={() => handleDelete(row)} className="text-red-500 hover:text-red-400 text-xs font-medium btn-touch">Hapus</button>
                        )}
                      </td>
                    )}
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
