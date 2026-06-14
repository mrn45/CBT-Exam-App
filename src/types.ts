export type Role = 'Admin' | 'Pengawas' | 'Siswa';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
  nama: string;
  id_kelas?: string;
  id_siswa?: string;
  id_mapel?: string;
  nama_kelas?: string;
  nama_mapel?: string;
}

export interface Ujian {
  id: string;
  id_mapel: string;
  id_kelas: string;
  judul: string;
  durasi: number;
  target_nilai: number;
  status: 'Aktif' | 'Nonaktif';
  file_pdf: string;
  jml_soal: number;
  jml_opsi: number;
  jml_essay: number;
  waktu_mulai: string;
  min_kumpul?: number;
  minimal_waktu?: number;
  nilai_kkm?: number;
  nama_kelas?: string;
  nama_mapel?: string;
  status_pengerjaan?: 'Selesai' | 'Mengerjakan' | 'Belum Mulai';
  jawaban_sementara?: Record<string, string>;
}

export interface Soal {
  id_soal: string;
  id_ujian: string;
  nomor: number;
  jawaban: string;
}

export interface Settings {
  appName: string;
  adminName: string;
  current_token: string;
  token_expiry: number;
  namaSekolah: string;
  auto_katrol_kkm: boolean;
  logo_instansi: string;
  fitur_katrol?: boolean;
  tampilkan_jawaban_benar?: boolean;
  fitur_token?: boolean;
}

export interface DashboardStats {
  guru: number;
  siswa: number;
  mapel: number;
  kelas: number;
  ujian: number;
  siswa_login: number;
  siswa_belum_login: number;
  siswa_selesai: number;
  siswa_mengerjakan: number;
  kelas_performance?: { name: string, average: number }[];
}
