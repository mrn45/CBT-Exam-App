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
    logo_instansi: ''
  });
  
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', nama: '', institusi: '' });
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);

  const fetchAdmins = async () => {
    const res = await api.call('get_admins', {});
    if (res.success) {
      setAdmins(res.data);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData({ 
        appName: settings.appName, 
        adminName: settings.adminName, 
        namaSekolah: settings.namaSekolah,
        logo_instansi: settings.logo_instansi || ''
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
        <div className="pt-4">
          <button type="submit" className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-8 rounded-full flex items-center justify-center gap-2 btn-touch shadow-[0_4px_15px_rgba(139,92,246,0.3)]">
            <Save className="w-5 h-5" /> Simpan Pengaturan
          </button>
        </div>
      </form>

      {/* Tambah Akun Admin / Tenant Baru */}
      <div className="mt-12 pt-8 border-t border-slate-200 relative z-10 p-1">
        <h4 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2"><Database className="w-5 h-5 text-indigo-500" /> Manajemen Multi-Instansi</h4>
        <p className="text-sm text-slate-500 mb-6">Tambahkan akun admin baru. Sistem akan secara virtual mengisolasi database agar admin baru dapat mengelola instansinya sendiri.</p>
        
        <button 
          onClick={() => setShowAdminModal(true)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-full flex items-center gap-2 transition-colors btn-touch text-sm mb-6"
        >
          <PlusCircle className="w-4 h-4" /> Tambah Akun Admin Utama
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {admins.map(admin => (
            <div key={admin.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{admin.nama}</p>
                <div className="flex gap-2 text-xs text-slate-500 mt-1">
                  <span>@{admin.username}</span>
                  {admin.institusi && (
                     <>
                        <span>•</span>
                        <span className="text-indigo-500 font-medium">{admin.institusi}</span>
                     </>
                  )}
                </div>
              </div>
              {admin.id !== user?.id && (
                <button 
                  onClick={async () => {
                    if(confirm('Yakin ingin menghapus admin (dan datanya)? Aksi ini tidak dapat dikembalikan.')) {
                      const res = await api.call('delete_admin', { id: admin.id });
                      if(res.success) {
                        toast(res.message, 'success');
                        fetchAdmins();
                      }
                    }
                  }}
                  className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors btn-touch"
                >
                  Hapus
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {showAdminModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Tambah Admin & Database Baru</h3>
            <p className="text-sm text-slate-500 mb-6">Buat kredensial login admin untuk instansi baru.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nama Instansi</label>
                <input type="text" value={newAdmin.institusi} onChange={e => setNewAdmin({...newAdmin, institusi: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm" placeholder="Contoh: SMA Negeri 1 Vimala" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nama Admin</label>
                <input type="text" value={newAdmin.nama} onChange={e => setNewAdmin({...newAdmin, nama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm" placeholder="Contoh: Budi Santoso" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Username Admin</label>
                <input type="text" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm" placeholder="admin.vimala" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm" />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowAdminModal(false)} 
                className="flex-1 bg-slate-100 py-3 rounded-full hover:bg-slate-200 font-semibold text-slate-700 btn-touch text-sm"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  if(!newAdmin.username || !newAdmin.password || !newAdmin.institusi) {
                     toast('Data harus lengkap', 'warning'); return;
                  }
                  setIsSubmittingAdmin(true);
                  try {
                     const res = await api.call('tambah_admin_baru', newAdmin);
                     if (res.success) {
                        toast(res.message, 'success');
                        setShowAdminModal(false);
                        setNewAdmin({ username: '', password: '', nama: '', institusi: '' });
                        fetchAdmins();
                     } else {
                        toast('Gagal: ' + res.message, 'error');
                     }
                  } catch (err: any) {
                     toast('Error: ' + err.message, 'error');
                  } finally {
                     setIsSubmittingAdmin(false);
                  }
                }} 
                disabled={isSubmittingAdmin}
                className="flex-1 bg-indigo-600 py-3 rounded-full hover:bg-indigo-700 text-white font-semibold btn-touch shadow-lg text-sm disabled:opacity-50"
              >
                {isSubmittingAdmin ? 'Memproses...' : 'Buat Database & Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
