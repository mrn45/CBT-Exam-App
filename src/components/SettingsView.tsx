import { useState, useEffect } from 'react';
import { useApp } from '../lib/context';
import { api } from '../lib/api';
import { toast } from './ui/Toast';
import { Settings, Save, PlusCircle, Database } from 'lucide-react';

export function SettingsView() {
  const { settings, refreshSettings, user } = useApp();
  const [formData, setFormData] = useState({ 
    appName: '', 
    adminName: '', 
    namaSekolah: '',
    logo_instansi: '',
    fitur_katrol: true,
    tampilkan_jawaban_benar: false,
    fitur_token: true
  });
  


  useEffect(() => {
    if (settings) {
      setFormData({ 
        appName: settings.appName, 
        adminName: settings.adminName, 
        namaSekolah: settings.namaSekolah,
        logo_instansi: settings.logo_instansi || '',
        fitur_katrol: settings.fitur_katrol !== false,
        tampilkan_jawaban_benar: settings.tampilkan_jawaban_benar === true,
        fitur_token: settings.fitur_token !== false
      });
    }
  }, [settings]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await api.call('save_settings', formData);
      if (res.success) {
        toast("Pengaturan berhasil disimpan.", "success");
        refreshSettings();
      } else {
        toast("Gagal: " + res.message, "error");
      }
    } catch (e: any) {
      toast("Error: " + e.message, "error");
    }
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-[2rem] p-8 shadow-none relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[80px] pointer-events-none"></div>
      
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl flex items-center justify-center shrink-0">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Pengaturan Sistem</h3>
          <p className="text-sm text-slate-500 mt-0.5">Konfigurasi preferensi aplikasi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10 p-1">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nama Aplikasi</label>
          <input 
            type="text" 
            value={formData.appName} 
            onChange={e => setFormData({...formData, appName: e.target.value})} 
            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nama Administrator</label>
          <input 
            type="text" 
            value={formData.adminName} 
            onChange={e => setFormData({...formData, adminName: e.target.value})} 
            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nama Instansi / Sekolah</label>
          <input 
            type="text" 
            value={formData.namaSekolah} 
            onChange={e => setFormData({...formData, namaSekolah: e.target.value})} 
            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">URL Logo Instansi</label>
          <input 
            type="text" 
            value={formData.logo_instansi} 
            onChange={e => setFormData({...formData, logo_instansi: e.target.value})} 
            placeholder="https://example.com/logo.png"
            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 smooth-transition" 
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">Fitur Katrol Nilai</label>
          <button
            type="button"
            onClick={() => setFormData({...formData, fitur_katrol: !formData.fitur_katrol})}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${formData.fitur_katrol ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.fitur_katrol ? 'transform translate-x-6' : ''}`} />
          </button>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="pr-4">
              <p className="text-sm font-semibold text-slate-800">Tampilkan Jawaban Benar</p>
              <p className="text-xs text-slate-500 mt-0.5">Jika aktif, rekap/nilai akhir di Pengawas menampilkan jumlah jawaban benar (bukan nilai asli) dan memunculkan input nilai ujian manual.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({...formData, tampilkan_jawaban_benar: !formData.tampilkan_jawaban_benar})}
              className={`w-12 h-6 flex items-center rounded-full p-1 shrink-0 transition-colors ${formData.tampilkan_jawaban_benar ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.tampilkan_jawaban_benar ? 'transform translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="pr-4">
              <p className="text-sm font-semibold text-slate-800">Fungsi Token Siswa</p>
              <p className="text-xs text-slate-500 mt-0.5">Jika dinonaktifkan, siswa tidak perlu memasukkan token ujian untuk login ke dalam sistem.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({...formData, fitur_token: !formData.fitur_token})}
              className={`w-12 h-6 flex items-center rounded-full p-1 shrink-0 transition-colors ${formData.fitur_token ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.fitur_token ? 'transform translate-x-6' : ''}`} />
            </button>
          </div>
        </div>
        <div className="pt-4">
          <button type="submit" className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-8 rounded-full flex items-center justify-center gap-2 btn-touch shadow-[0_4px_15px_rgba(139,92,246,0.3)]">
            <Save className="w-5 h-5" /> Simpan Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
}
