import { useState, useEffect } from 'react';
import { useApp } from '../lib/context';
import { 
  Layers, LogOut, Menu, X, LayoutDashboard, Users,
  GraduationCap, Target, FileText, PieChart, Settings,
  Radio, PenTool, Scale, BookOpen, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AdminHome } from './AdminHome';
import { StudentHome } from './StudentHome';
import { PengawasHome } from './PengawasHome';
import { GenericView } from './GenericView';
import { SettingsView } from './SettingsView';
import { ExamRoom } from './ExamRoom';
import { Ujian } from '../types';

export function Dashboard() {
  const { user, logout } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('home');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Exam specific state
  const [activeExam, setActiveExam] = useState<Ujian | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  // Lock Dashboard UI when exam is active
  if (activeExam) {
    return <ExamRoom exam={activeExam} onComplete={() => setActiveExam(null)} />;
  }

  // Menus configuration
  const menusAdmin = [
    { id: 'home', icon: LayoutDashboard, label: 'Dashboard Admin' },
    { type: 'label', label: 'Master Data' },
    { id: 'data_kelas', icon: Users, label: 'Data Kelas' },
    { id: 'data_mapel', icon: BookOpen, label: 'Mata Pelajaran' },
    { id: 'data_guru', icon: GraduationCap, label: 'Data Guru' },
    { id: 'data_siswa', icon: Users, label: 'Data Siswa' },
    { id: 'data_cp', icon: Target, label: 'Data CP' },
    { type: 'label', label: 'Manajemen Ujian' },
    { id: 'ujian', icon: FileText, label: 'Bank Ujian' },
    { id: 'monitor', icon: Radio, label: 'Live Monitor' },
    { id: 'rekap', icon: PieChart, label: 'Rekap Nilai' },
    { type: 'label', label: 'Sistem' },
    { id: 'log_aktivitas', icon: Activity, label: 'Log Aktivitas' },
    { id: 'settings', icon: Settings, label: 'Pengaturan' },
  ];

  const menusPengawas = [
    { id: 'home', icon: LayoutDashboard, label: 'Dashboard Pengawas' },
    { type: 'label', label: 'Aktivitas Ujian' },
    { id: 'input_cp', icon: Target, label: 'Input CP' },
    { id: 'monitor', icon: Radio, label: 'Live Monitor' },
    { id: 'koreksi', icon: PenTool, label: 'Koreksi Essay' },
    { id: 'katrol', icon: Scale, label: 'Nilai Akhir' },
  ];

  const menusSiswa = [
    { id: 'home', icon: LayoutDashboard, label: 'Beranda Ujian' },
  ];

  const activeMenus = user?.role === 'Admin' ? menusAdmin : user?.role === 'Pengawas' ? menusPengawas : menusSiswa;

  const renderContent = () => {
    switch (activeMenu) {
      case 'home':
        return user?.role === 'Admin' ? <AdminHome /> : user?.role === 'Siswa' ? <StudentHome onStartExam={setActiveExam} /> : <PengawasHome onNavigate={setActiveMenu} />;
      default:
        if (activeMenu === 'settings') return <div className="p-4 md:p-8 w-full flex justify-center"><SettingsView /></div>;
        return <div className="p-4 md:p-8 w-full flex justify-center"><GenericView menu={activeMenu} /></div>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex h-screen overflow-hidden bg-slate-50"
    >
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={cn(
          "w-[280px] glass-panel border-r border-slate-200 shadow-xl md:shadow-none fixed md:relative z-50 h-full flex flex-col transition-transform duration-300",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between md:justify-start gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)]">
              <Layers className="w-5 h-5" />
            </div>
            <span className="font-bold text-2xl text-slate-900 tracking-tight">CBT.</span>
          </div>
          <button onClick={toggleSidebar} className="md:hidden text-slate-500 hover:text-slate-900 bg-white border border-slate-200 w-8 h-8 rounded-full flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 mx-4 my-2 rounded-[1.5rem] bg-white border border-slate-200 flex items-center gap-3 shrink-0">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.nama || 'User')}&backgroundColor=4f46e5`} 
            alt="Avatar" 
            className="w-10 h-10 rounded-full border-2 border-violet-500 object-cover shrink-0 bg-slate-100"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.nama}</p>
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest truncate">{user?.role}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
          {activeMenus.map((item, idx) => {
            if (item.type === 'label') {
              return (
                <div key={`label-${idx}`} className="px-3 py-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4 mb-1">
                  {item.label}
                </div>
              );
            }
            if (item.id) {
              const Icon = item.icon!;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveMenu(item.id); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 outline-none text-sm",
                    isActive 
                      ? "bg-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
                      : "text-slate-500 hover:bg-slate-200 hover:text-slate-800 bg-transparent"
                  )}
                >
                  <Icon className={cn("w-5 h-5 mr-3 hidden md:block", isActive ? "text-violet-200" : "text-slate-500")} />
                  {item.label}
                </button>
              );
            }
            return null;
          })}
        </nav>

        <div className="p-4 shrink-0">
          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 py-3 rounded-full text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50">
        <header className="px-6 py-4 flex justify-between items-center z-30 sticky top-0 shrink-0 h-16">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="md:hidden text-slate-500 hover:text-slate-900 bg-white border border-slate-200 w-10 h-10 rounded-full flex items-center justify-center">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center capitalize">
              {activeMenu.replace('_', ' ')}
            </h2>
          </div>
          
          <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {currentTime.toLocaleTimeString('id-ID')}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeMenu}
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -15 }}
               transition={{ duration: 0.2 }}
             >
               {renderContent()}
             </motion.div>
           </AnimatePresence>
        </div>
      </main>

    </motion.div>
  );
}
