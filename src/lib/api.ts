import { User, Ujian, Settings, Soal, DashboardStats } from '../types';
import { db, auth } from './firebase';
import { collection, doc, deleteDoc, getDocs, getDoc, setDoc, updateDoc, writeBatch, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const dPDF = 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCgogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDE2NyAwMDAwMCBuIAowMDAwMDAwMjk2IDAwMDAwIG4gCjAwMDAwMDAzODQgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUk9PVCAxIDAgUgo+PgpzdGFydHhyZWYKNDc5CiUlRU9GCg==';
const pastTimeStr = new Date(Date.now() - 3600000).toISOString().slice(0, 16);

// SEEDER DATA
const mockSettings: Settings = { appName: 'CBT SMART APP', adminName: 'Ahmad Hanafi', current_token: 'A1B2C3', token_expiry: Date.now() + 300000, namaSekolah: 'SMP Islam Assyafiiyah', auto_katrol_kkm: true, logo_instansi: '', fitur_katrol: true };
const mockUsers = [ 
  { id: 'U1', username: 'admin', password: '51001n', role: 'Admin', nama: 'Administrator' }
];
const mockKelas: any[] = [];
const mockMapel: any[] = [];
const mockGuru: any[] = [];
const mockSiswa: any[] = [];
const mockUjian: any[] = [];
const mockSoal: any[] = [];

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
      await b.commit();
      console.log("Seed complete.");
    } else {
      const u2Snap = await getDoc(doc(db, 'users', 'U2'));
      if (u2Snap.exists()) {
        console.log("Old mocks detected. Cleaning up...");
        const b = writeBatch(db);
        b.delete(doc(db, 'users', 'U2'));
        b.delete(doc(db, 'users', 'U3'));
        b.delete(doc(db, 'users', 'U4'));
        b.delete(doc(db, 'guru', 'G1'));
        b.delete(doc(db, 'siswa', 'S1'));
        b.delete(doc(db, 'siswa', 'S2'));
        b.delete(doc(db, 'kelas', 'K1'));
        b.delete(doc(db, 'kelas', 'K2'));
        b.delete(doc(db, 'mapel', 'M1'));
        b.delete(doc(db, 'mapel', 'M2'));
        b.delete(doc(db, 'ujian', 'UJ1'));
        b.delete(doc(db, 'soal', 'Soal1'));
        b.delete(doc(db, 'soal', 'Soal2'));
        b.delete(doc(db, 'soal', 'Soal3'));
        b.delete(doc(db, 'soal', 'Soal4'));
        b.delete(doc(db, 'soal', 'Soal5'));
        b.update(doc(db, 'users', 'U1'), { password: '51001n' });
        await b.commit();
        console.log("Cleanup complete.");
      }
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
    else if (action === 'get_log_aktivitas') colName = 'log_aktivitas';
    
    if (colName) {
      const q = colName === 'log_aktivitas' ? query(collection(db, colName), orderBy('timestamp', 'desc')) : collection(db, colName);
      return onSnapshot(q, (snap) => {
        cb(snap.docs.map(d => ({id: d.id, ...d.data()})));
      }, (err) => {
        console.warn("Snapshot error:", err);
      });
    }
    
    if (action === 'get_dashboard_stats') {
      const state: any = { guru: [], siswa: [], mapel: [], kelas: [], ujian: [], nilai: [], progres: [] };
      const notify = () => {
        const perfMap: Record<string, {total: number, count: number}> = {};
        state.nilai.forEach((n: any) => {
           const s = state.siswa.find((siswa: any) => siswa.id === n.id_siswa || siswa.nis === n.id_siswa || siswa.username === n.id_siswa);
           if (s && s.id_kelas) {
              const kName = s.id_kelas === 'ALL' ? 'Semua' : (state.kelas.find((k:any) => k.id === s.id_kelas)?.nama || s.id_kelas);
              if (!perfMap[kName]) perfMap[kName] = { total: 0, count: 0 };
              const score = Number(n.nilai_katrol) || Number(n.nilai_asli) || 0;
              perfMap[kName].total += score;
              perfMap[kName].count++;
           }
        });
        const kelas_performance = Object.keys(perfMap).map(kName => ({
           name: kName,
           average: Math.round(perfMap[kName].total / perfMap[kName].count)
        }));

        cb({
          guru: state.guru.length, siswa: state.siswa.length, mapel: state.mapel.length, kelas: state.kelas.length,
          ujian: state.ujian.length, siswa_login: 0, siswa_belum_login: state.siswa.length,
          siswa_selesai: state.nilai.length, siswa_mengerjakan: state.progres.filter((p:any) => p.status === 'Sedang Mengerjakan').length,
          kelas_performance: kelas_performance.sort((a,b) => b.average - a.average)
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

  async call(action: string, payload: any = {}): Promise<{ success: boolean; data?: any; message?: string; require_token?: boolean; temp_data?: any; force_submit?: boolean }> {
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

      case 'add_activity_log':
        await setDoc(doc(collection(db, 'log_aktivitas')), {
          id_user: payload.id_user,
          nama_user: payload.nama_user,
          role: payload.role,
          aktivitas: payload.aktivitas,
          timestamp: Date.now()
        });
        return { success: true };

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
      
      case 'login': {
        const usernameStr = String(payload.username || '').trim();
        const passwordStr = String(payload.password || '').trim();
        const usernameNum = Number(usernameStr);
        const usernamesToTry = isNaN(usernameNum) ? [usernameStr] : [usernameStr, usernameNum];

        const uSnap = await getDocs(query(collection(db, 'users'), where('username', 'in', usernamesToTry)));
        if (!uSnap.empty) {
          const matchedUser = uSnap.docs.find(d => String(d.data().password || '').trim() === passwordStr);
          if (matchedUser) {
            const u: any = { id: matchedUser.id, ...matchedUser.data() };
            if (u.role === 'Siswa') {
              const sSnap = await getDocs(query(collection(db, 'siswa'), where('username', 'in', usernamesToTry)));
              if (!sSnap.empty) {
                const s: any = sSnap.docs[0].data();
                return { success: true, require_token: true, temp_data: { ...u, id_siswa: sSnap.docs[0].id, id_kelas: s.id_kelas } };
              }
            }
            if (u.role === 'Pengawas') {
              const gSnap = await getDocs(query(collection(db, 'guru'), where('username', 'in', usernamesToTry)));
              if (!gSnap.empty) {
                const g: any = { id: gSnap.docs[0].id, ...gSnap.docs[0].data() };
                u.mengajar = g.mengajar; u.id = g.id;
              }
            }
            return { success: true, data: u };
          }
        }

        // Check Guru
        const gSnap = await getDocs(query(collection(db, 'guru'), where('username', 'in', usernamesToTry)));
        if (!gSnap.empty) {
          const matchedGuru = gSnap.docs.find(d => String(d.data().password || '').trim() === passwordStr);
          if (matchedGuru) {
            const g = { id: matchedGuru.id, ...matchedGuru.data() } as any;
            return { success: true, data: { id: g.id, username: g.username, role: 'Pengawas', nama: g.nama, mengajar: g.mengajar } };
          }
        }

        // Check Siswa
        const sSnap = await getDocs(query(collection(db, 'siswa'), where('username', 'in', usernamesToTry)));
        if (!sSnap.empty) {
          const matchedSiswa = sSnap.docs.find(d => String(d.data().password || '').trim() === passwordStr);
          if (matchedSiswa) {
            const s = { id: matchedSiswa.id, ...matchedSiswa.data() } as any;
            return { success: true, require_token: true, temp_data: { id: s.id, username: s.username, role: 'Siswa', nama: s.nama, id_siswa: s.id, id_kelas: s.id_kelas } };
          }
        }

        return { success: false, message: 'Akun salah / tidak ditemukan!' };
      }
      
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
        const [guru, siswa, mapel, kelas, ujian, nilai, progres, logs] = await Promise.all([
          this.getCol('guru'), this.getCol('siswa'), this.getCol('mapel'), this.getCol('kelas'), this.getCol('ujian'), this.getCol('nilai'), this.getCol('progres'), this.getCol('log_aktivitas')
        ]);

        const activeUjian = ujian.filter((u: any) => u.status === 'Aktif');
        const activeUjianIds = activeUjian.map((u: any) => String(u.id));

        const targetedSiswa = siswa.filter((s: any) => 
           activeUjian.some((u: any) => String(u.id_kelas) === 'ALL' || String(u.id_kelas) === String(s.id_kelas))
        );
        const targetedSiswaIds = new Set(targetedSiswa.map((s: any) => String(s.id)));

        const activeProgres = progres.filter((p: any) => p.status === 'Sedang Mengerjakan' && activeUjianIds.includes(String(p.id_ujian)));
        const mengerjakanIds = [...new Set(activeProgres.map((p: any) => String(p.id_siswa)))].filter(id => targetedSiswaIds.has(id));

        const activeNilai = nilai.filter((n: any) => activeUjianIds.includes(String(n.id_ujian)));
        const selesaiIds = [...new Set(activeNilai.map((n: any) => String(n.id_siswa)))].filter(id => targetedSiswaIds.has(id) && !mengerjakanIds.includes(id));

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayLogs = logs.filter((l: any) => l.aktivitas === 'Login ke dalam sistem' && l.timestamp >= todayStart.getTime() && l.role === 'Siswa');
        const loggedInIds = new Set(todayLogs.map((l: any) => String(l.id_user)));
        
        const telahLoginIds = new Set([...loggedInIds, ...mengerjakanIds, ...selesaiIds]);
        const telahLoginCount = [...targetedSiswaIds].filter(id => telahLoginIds.has(id)).length;
        const belumLoginCount = targetedSiswa.length - telahLoginCount;

        return { 
          success: true, 
          data: {
            guru: guru.length, siswa: siswa.length, mapel: mapel.length, kelas: kelas.length,
            ujian: ujian.length, 
            siswa_login: telahLoginCount, 
            siswa_belum_login: belumLoginCount,
            siswa_selesai: selesaiIds.length, 
            siswa_mengerjakan: mengerjakanIds.length
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

      case 'force_submit_peserta':
        const fsQ = await getDocs(query(collection(db, 'progres'), where('id_ujian', '==', payload.id_ujian), where('id_siswa', '==', payload.id_siswa)));
        if (!fsQ.empty) {
          await updateDoc(doc(db, 'progres', fsQ.docs[0].id), { force_submit: true });
        }
        return { success: true };

      case 'check_progres_status':
        const cpQ = await getDocs(query(collection(db, 'progres'), where('id_ujian', '==', payload.id_ujian), where('id_siswa', '==', payload.id_siswa)));
        if (!cpQ.empty) {
          const progData = cpQ.docs[0].data();
          if (progData.force_submit) {
            return { success: true, force_submit: true };
          }
        }
        return { success: true, force_submit: false };

      case 'sync_progres':
        const cq = await getDocs(query(collection(db, 'progres'), where('id_ujian', '==', payload.id_ujian), where('id_siswa', '==', payload.id_siswa)));
        if (!cq.empty) {
          const progDoc = cq.docs[0];
          const progData = progDoc.data();
          if (progData.force_submit) {
            return { success: true, force_submit: true };
          }
          const updates: any = {};
          if (payload.terjawab !== undefined) updates.terjawab = payload.terjawab;
          
          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, 'progres', progDoc.id), updates);
          }
        }
        return { success: true, force_submit: false };

      case 'submit_ujian':
        const ujianDoc = await getDoc(doc(db, 'ujian', payload.id_ujian));
        let kunciJawaban: Record<string, string> = {};
        let bobotJawaban: Record<string, number> = {};
        let jml_soal_pg = 0;
        
        if (ujianDoc.exists()) {
          kunciJawaban = ujianDoc.data().kunci_jawaban || {};
          bobotJawaban = ujianDoc.data().bobot_jawaban || {};
          jml_soal_pg = Number(ujianDoc.data().jml_soal) || 0;
        }
        
        const hasCustomWeights = Object.keys(bobotJawaban).length > 0;
        let totalWeight = 0;
        if (hasCustomWeights) {
          for (let i = 1; i <= jml_soal_pg; i++) {
            const w = Number(bobotJawaban[i]) || 1;
            totalWeight += w;
          }
        }

        let bn = 0;
        let earnedWeight = 0;
        for (let idS in payload.jawaban) {
          if (!idS.startsWith('essay_')) {
            const noMatch = idS.match(/\d+/);
            if (noMatch) {
              const no = parseInt(noMatch[0], 10);
              const isCorrect = kunciJawaban[no] && payload.jawaban[idS] === kunciJawaban[no];
              if (isCorrect) {
                bn++;
                if (hasCustomWeights) {
                  earnedWeight += Number(bobotJawaban[no]) || 1;
                }
              }
            }
          }
        }
        
        let score = 0;
        if (hasCustomWeights) {
          score = Math.round((totalWeight > 0) ? (earnedWeight / totalWeight) * 100 : 0);
        } else {
          score = Math.round((jml_soal_pg > 0) ? (bn / jml_soal_pg) * 100 : 0);
        }
        
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
      let msg = error.message || 'Database error occurred';
      if (error.code === 'resource-exhausted' || msg.includes('Quota limit exceeded')) {
         msg = "Error: Quota server harian telah habis. Silakan coba kembali besok atau hubungi administrator.";
      }
      return { success: false, message: msg };
    }
  }
}

export const api = new FirestoreAPI();

