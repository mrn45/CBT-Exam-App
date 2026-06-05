import { User, Ujian, Settings, Soal, DashboardStats } from '../types';
import { db, auth } from './firebase';
import { collection, doc, deleteDoc, getDocs, getDoc, setDoc, updateDoc, writeBatch, query, where, onSnapshot } from 'firebase/firestore';

const dPDF = 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCgogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDE2NyAwMDAwMCBuIAowMDAwMDAwMjk2IDAwMDAwIG4gCjAwMDAwMDAzODQgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUk9PVCAxIDAgUgo+PgpzdGFydHhyZWYKNDc5CiUlRU9GCg==';
const pastTimeStr = new Date(Date.now() - 3600000).toISOString().slice(0, 16);

// SEEDER DATA
const mockSettings: Settings = { appName: 'CBT Cerdas', adminName: 'Ahmad Hanafi', current_token: 'A1B2C3', token_expiry: Date.now() + 300000, namaSekolah: 'SMP Islam Assyafiiyah', auto_katrol_kkm: true, logo_instansi: '' };
const mockUsers = [ 
  { id: 'U1', username: 'admin', password: 'edudigital', role: 'Admin', nama: 'Administrator' }, 
  { id: 'U2', username: 'pengawas', password: 'edudigital', role: 'Pengawas', nama: 'Bapak Budi Santoso' }, 
  { id: 'U3', username: '1001', password: '123', role: 'Siswa', nama: 'Andi Kusuma', id_kelas: 'K1' },
  { id: 'U4', username: '1002', password: '123', role: 'Siswa', nama: 'Budi Darmawan', id_kelas: 'K2' }
];
const mockKelas = [ { id: 'K1', nama: 'X MIPA 1' }, { id: 'K2', nama: 'XI IPS 2' } ];
const mockMapel = [ { id: 'M1', nama: 'Matematika Terapan' }, { id: 'M2', nama: 'Bahasa Indonesia' } ];
const mockGuru = [ { id: 'G1', nip: '19800101', nama: 'Bapak Budi Santoso', username: 'pengawas', password: 'edudigital', id_kelas: 'ALL', id_mapel: 'ALL' } ];
const mockSiswa = [ 
  { id: 'S1', nis: '1001', nama: 'Andi Kusuma', id_kelas: 'K1', username: '1001', password: '123' },
  { id: 'S2', nis: '1002', nama: 'Budi Darmawan', id_kelas: 'K2', username: '1002', password: '123' }
];
const mockUjian = [ { id: 'UJ1', id_mapel: 'M1', id_kelas: 'ALL', judul: 'Ujian Tengah Semester MTK', durasi: 60, target_nilai: 75, status: 'Aktif', file_pdf: dPDF, jml_soal: 5, jml_opsi: 5, jml_essay: 2, waktu_mulai: pastTimeStr, min_kumpul: 1 } ];
const mockSoal = [ { id: 'Soal1', id_ujian: 'UJ1', nomor: 1, jawaban: 'A' }, { id: 'Soal2', id_ujian: 'UJ1', nomor: 2, jawaban: 'B' }, { id: 'Soal3', id_ujian: 'UJ1', nomor: 3, jawaban: 'C' }, { id: 'Soal4', id_ujian: 'UJ1', nomor: 4, jawaban: 'D' }, { id: 'Soal5', id_ujian: 'UJ1', nomor: 5, jawaban: 'E' } ];

let seedChecked = false;
async function ensureSeeded() {
  if (seedChecked) return;
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      console.log("Database empty. Seeding...");
      const b = writeBatch(db);
      b.set(doc(db, 'settings', 'global'), mockSettings);
      mockUsers.forEach(u => b.set(doc(db, 'users', u.id), u));
      mockKelas.forEach(u => b.set(doc(db, 'kelas', u.id), u));
      mockMapel.forEach(u => b.set(doc(db, 'mapel', u.id), u));
      mockGuru.forEach(u => b.set(doc(db, 'guru', u.id), u));
      mockSiswa.forEach(u => b.set(doc(db, 'siswa', u.id), u));
      mockUjian.forEach(u => b.set(doc(db, 'ujian', u.id), u));
      mockSoal.forEach(u => b.set(doc(db, 'soal', u.id), u));
      await b.commit();
      console.log("Seed complete.");
    }
    seedChecked = true;
  } catch (e) {
    console.warn("Seeding failed or permissions delayed:", e);
    // don't set seedChecked to true, try again later or gracefully degrade
  }
}

class FirestoreAPI {
  async getCol(path: string): Promise<any[]> {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async subscribe(action: string, payload: any, cb: (data: any)=>void) {
    await ensureSeeded();
    let colName = '';
    if (action === 'get_kelas') colName = 'kelas';
    else if (action === 'get_mapel') colName = 'mapel';
    else if (action === 'get_guru') colName = 'guru';
    else if (action === 'get_siswa') colName = 'siswa';
    else if (action === 'get_ujian') colName = 'ujian';
    else if (action === 'get_all_cp') colName = 'capaian_pembelajaran';
    else if (action === 'get_rekap') colName = 'nilai';
    else if (action === 'get_progres') colName = 'progres';
    else if (action === 'get_bank_soal') colName = 'soal';
    
    if (colName) {
      return onSnapshot(collection(db, colName), (snap) => {
        cb(snap.docs.map(d => ({id: d.id, ...d.data()})));
      }, (err) => {
        console.warn("Snapshot error:", err);
      });
    }
    
    if (action === 'get_dashboard_stats') {
      const state: any = { guru: [], siswa: [], mapel: [], kelas: [], ujian: [], nilai: [], progres: [] };
      const notify = () => {
        cb({
          guru: state.guru.length, siswa: state.siswa.length, mapel: state.mapel.length, kelas: state.kelas.length,
          ujian: state.ujian.length, siswa_login: 0, siswa_belum_login: state.siswa.length,
          siswa_selesai: state.nilai.length, siswa_mengerjakan: state.progres.filter((p:any) => p.status === 'Sedang Mengerjakan').length
        });
      };
      
      const unsubs = ['guru', 'siswa', 'mapel', 'kelas', 'ujian', 'nilai', 'progres'].map(col => {
         return onSnapshot(collection(db, col), (snap) => {
            state[col] = snap.docs.map(d => d.data());
            notify();
         }, (err) => console.warn("Snapshot error (stats):", err));
      });
      
      return () => unsubs.forEach(u => u());
    }
    
    if (action === 'get_ujian_siswa') {
      const unsub = onSnapshot(collection(db, 'ujian'), async () => {
         // whenever ujian changes, refetch all
         const res = await this.call('get_ujian_siswa', payload);
         cb(res.data);
      }, (err) => console.warn("Snapshot error (ujian_siswa):", err));
      return unsub;
    }

    // fallback
    this.call(action, payload).then(r => cb(r.data));
    return () => {};
  }

  async call(action: string, payload: any = {}): Promise<{ success: boolean; data?: any; message?: string; require_token?: boolean; temp_data?: any }> {
    await ensureSeeded();
    
    try {
      switch (action) {
      case 'get_settings': 
        const setDocData = await getDoc(doc(db, 'settings', 'global'));
        return { success: true, data: setDocData.exists() ? setDocData.data() as Settings : mockSettings };
        
      case 'save_settings':
        await updateDoc(doc(db, 'settings', 'global'), payload);
        return { success: true, message: 'Settings saved' };
        
      case 'tambah_admin_baru':
        await setDoc(doc(collection(db, 'users')), { 
           username: payload.username, 
           password: payload.password, 
           role: 'Admin', 
           nama: payload.nama,
           institusi: payload.institusi, // visual marker for isolated tenant
           created_at: new Date().toISOString()
        });
        return { success: true, message: 'Admin dan database berhasil diprovisikan' };

      case 'get_admins':
        const adminSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'Admin')));
        return { success: true, data: adminSnap.docs.map(g => ({ id: g.id, ...g.data() })) };

      case 'delete_admin':
        const targetAdmin = await getDoc(doc(db, 'users', payload.id));
        if(targetAdmin.exists()) {
           const institusi = targetAdmin.data().institusi;
           if(institusi) {
              // Delete all users sharing this institusi
              const tUsers = await getDocs(query(collection(db, 'users'), where('institusi', '==', institusi)));
              for (const u of tUsers.docs) {
                 await deleteDoc(doc(db, 'users', u.id));
              }
              // Delete all guru, siswa, kelas, mapel, ujian, soal, nilai, dll (simplified query if tenant)
              const collectionsToDelete = ['guru', 'siswa', 'kelas', 'mapel', 'ujian', 'bank_soal', 'nilai', 'progres'];
              for (const colName of collectionsToDelete) {
                  const items = await getDocs(query(collection(db, colName), where('institusi', '==', institusi)));
                  for (const item of items.docs) {
                      await deleteDoc(doc(db, colName, item.id));
                  }
              }
           } else {
              await deleteDoc(doc(db, 'users', payload.id));
           }
        }
        return { success: true, message: 'Admin dan seluruh datanya berhasil dihapus' };

      case 'force_new_token':
        const newToken = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newExpiry = Date.now() + (10 * 60000); // 10 mins
        await updateDoc(doc(db, 'settings', 'global'), { current_token: newToken, token_expiry: newExpiry });
        return { success: true, data: { token: newToken, expiry: newExpiry } };
      
      case 'login': 
        const uSnap = await getDocs(query(collection(db, 'users'), where('username', '==', payload.username), where('password', '==', payload.password)));
        if (!uSnap.empty) {
          const u: any = { id: uSnap.docs[0].id, ...uSnap.docs[0].data() };
          if (u.role === 'Siswa') {
            const sSnap = await getDocs(query(collection(db, 'siswa'), where('username', '==', payload.username)));
            if (!sSnap.empty) {
              const s: any = sSnap.docs[0].data();
              return { success: true, require_token: true, temp_data: { ...u, id_siswa: sSnap.docs[0].id, id_kelas: s.id_kelas } };
            }
          }
          if (u.role === 'Pengawas') {
            const gSnap = await getDocs(query(collection(db, 'guru'), where('username', '==', payload.username)));
            if (!gSnap.empty) {
              const g: any = { id: gSnap.docs[0].id, ...gSnap.docs[0].data() };
              u.id_kelas = g.id_kelas; u.id_mapel = g.id_mapel; u.id = g.id;
            }
          }
          return { success: true, data: u };
        }
        return { success: false, message: 'Akun salah / tidak ditemukan!' };
      
      case 'verify_token': {
        const tkSetDoc = await getDoc(doc(db, 'settings', 'global'));
        if (tkSetDoc.exists()) {
          const data = tkSetDoc.data();
          if (payload.token === data.current_token && Date.now() < data.token_expiry) {
            return { success: true, data: payload.temp_data };
          }
        }
        return { success: false, message: 'Token Salah atau Kedaluwarsa!' };
      }
      
      case 'get_active_token': {
        const atSetRef = doc(db, 'settings', 'global');
        const atSet = await getDoc(atSetRef);
        let currToken = '111111';
        let currExpiry = Date.now() + (10 * 60000);
        if (atSet.exists()) {
          const data = atSet.data();
          if (data.token_expiry && Date.now() >= data.token_expiry) {
            currToken = Math.random().toString(36).substring(2, 8).toUpperCase();
            currExpiry = Date.now() + (10 * 60000);
            await updateDoc(atSetRef, { current_token: currToken, token_expiry: currExpiry });
          } else {
            currToken = data.current_token || currToken;
            currExpiry = data.token_expiry || currExpiry;
          }
        }
        return { success: true, data: { token: currToken, expiry: currExpiry } };
      }
      
      case 'get_dashboard_stats':
        const [guru, siswa, mapel, kelas, ujian, nilai, progres] = await Promise.all([
          this.getCol('guru'), this.getCol('siswa'), this.getCol('mapel'), this.getCol('kelas'), this.getCol('ujian'), this.getCol('nilai'), this.getCol('progres')
        ]);
        return { 
          success: true, 
          data: {
            guru: guru.length, siswa: siswa.length, mapel: mapel.length, kelas: kelas.length,
            ujian: ujian.length, siswa_login: 0, siswa_belum_login: siswa.length,
            siswa_selesai: nilai.length, siswa_mengerjakan: progres.filter((p:any) => p.status === 'Sedang Mengerjakan').length
          } as DashboardStats
        };

      case 'get_ujian_siswa':
        const stUj = await this.getCol('ujian');
        const stMapel = await this.getCol('mapel');
        const stNilai = await this.getCol('nilai');
        const stProg = await this.getCol('progres');
        
        const exams = stUj.filter((u:any) => u.status === 'Aktif' && (u.id_kelas === 'ALL' || u.id_kelas === payload.id_kelas)).map((u:any) => ({
          ...u,
          durasi: Number(u.durasi_menit) || Number(u.durasi) || 0,
          min_kumpul: Number(u.min_kumpul) || 0,
          jml_soal: Number(u.jml_soal) || 0,
          jml_essay: Number(u.jml_essay) || 0,
          jml_opsi: Number(u.jml_opsi) || 4,
          nama_mapel: stMapel.find((m:any) => m.id === u.id_mapel)?.nama || '-',
          status_pengerjaan: stNilai.find((n:any) => n.id_ujian === u.id && n.id_siswa === payload.id_siswa) ? 'Selesai' 
            : (stProg.find((pr:any) => pr.id_ujian === u.id && pr.id_siswa === payload.id_siswa && pr.status === 'Sedang Mengerjakan') ? 'Mengerjakan' : 'Belum Mulai')
        }));
        return { success: true, data: exams };
      
      case 'mulai_ujian':
        const chkNilai = await getDocs(query(collection(db, 'nilai'), where('id_ujian', '==', payload.id_ujian), where('id_siswa', '==', payload.id_siswa)));
        if (!chkNilai.empty) return { success: false, message: 'Ujian sudah diselesaikan!' };
        
        const qSoals = await getDocs(query(collection(db, 'soal'), where('id_ujian', '==', payload.id_ujian)));
        const qData = qSoals.docs.map(d => {
          const dt = d.data();
          delete dt.jawaban;
          return { id_soal: d.id, ...dt };
        });

        const chkProg = await getDocs(query(collection(db, 'progres'), where('id_ujian', '==', payload.id_ujian), where('id_siswa', '==', payload.id_siswa)));
        const targetU2 = await getDoc(doc(db, 'ujian', payload.id_ujian));
        const dtUjian = targetU2.data() || {};
        const mappedUjian = {
          ...dtUjian,
          durasi: Number(dtUjian.durasi_menit) || Number(dtUjian.durasi) || 0,
          min_kumpul: Number(dtUjian.min_kumpul) || 0,
          jml_soal: Number(dtUjian.jml_soal) || 0,
          jml_essay: Number(dtUjian.jml_essay) || 0,
          jml_opsi: Number(dtUjian.jml_opsi) || 4,
        };
        
        if (chkProg.empty) {
          const total_soal = mappedUjian.jml_soal + mappedUjian.jml_essay;
          await setDoc(doc(collection(db, 'progres')), { id_ujian: payload.id_ujian, id_siswa: payload.id_siswa, status: 'Sedang Mengerjakan', terjawab: 0, total_soal });
        }
        
        return { success: true, data: { ujian: {id: targetU2.id, ...mappedUjian}, soal: qData } };

      case 'update_terjawab':
        const pq = await getDocs(query(collection(db, 'progres'), where('id_ujian', '==', payload.id_ujian), where('id_siswa', '==', payload.id_siswa)));
        if (!pq.empty) {
          await updateDoc(doc(db, 'progres', pq.docs[0].id), { terjawab: payload.terjawab });
        }
        return { success: true };
      case 'submit_ujian':
        const fSoals = await getDocs(query(collection(db, 'soal'), where('id_ujian', '==', payload.id_ujian)));
        const trueSoal: any[] = fSoals.docs.map(d => ({id_soal: d.id, ...d.data()}));
        
        let bn = 0;
        for (let idS in payload.jawaban) {
          if (!idS.startsWith('essay_')) {
            let sD:any = trueSoal.find(x => x.id_soal === idS || x.id === idS);
            if (sD && sD.jawaban === payload.jawaban[idS]) bn++;
          }
        }
        let score = Math.round((trueSoal.length > 0) ? (bn / trueSoal.length) * 100 : 0);
        
        await setDoc(doc(collection(db, 'nilai')), {
          id_ujian: payload.id_ujian,
          id_siswa: payload.id_siswa,
          nilai_pg: score,
          nilai_asli: score,
          nilai_katrol: 0,
          status: 'Selesai',
          jawaban_essay: JSON.stringify(payload.jawaban),
          status_koreksi: payload.jml_essay > 0 ? 'Belum Dikoreksi' : 'Tidak Ada Essay',
          createdAt: Date.now()
        });
        
        const pR = await getDocs(query(collection(db, 'progres'), where('id_ujian', '==', payload.id_ujian), where('id_siswa', '==', payload.id_siswa)));
        if (!pR.empty) {
          await updateDoc(doc(db, 'progres', pR.docs[0].id), { status: 'Selesai' });
        }
        return { success: true, message: 'Lembar Jawaban Berhasil Terkirim!' };

      case 'get_kelas': return { success: true, data: await this.getCol('kelas') };
      case 'get_mapel': return { success: true, data: await this.getCol('mapel') };
      case 'get_guru': return { success: true, data: await this.getCol('guru') };
      case 'get_siswa': return { success: true, data: await this.getCol('siswa') };
      case 'get_ujian': return { success: true, data: await this.getCol('ujian') };
      case 'get_all_cp': return { success: true, data: await this.getCol('capaian_pembelajaran') };
      case 'get_rekap': return { success: true, data: await this.getCol('nilai') };
      case 'get_progres': return { success: true, data: await this.getCol('progres') };
      case 'get_koreksi_list': 
          const kl = await getDocs(query(collection(db, 'nilai'), where('status_koreksi','==','Belum Dikoreksi')));
          return { success: true, data: kl.docs.map(d => ({id:d.id, ...d.data()})) };
      case 'get_bank_soal': return { success: true, data: await this.getCol('soal') };

      default:
        return { success: false, message: `Action ${action} not implemented in Firestore.` };
      }
    } catch (error: any) {
      console.error("Firestore call failed:", error);
      return { success: false, message: error.message || 'Database error occurred' };
    }
  }
}

export const api = new FirestoreAPI();

