import { useState, useEffect, useRef } from 'react';
import { Ujian } from '../types';
import { useApp } from '../lib/context';
import { api } from '../lib/api';
import { formatTime } from '../lib/utils';
import { toast } from './ui/Toast';
import { FileText, Send, AlertTriangle } from 'lucide-react';

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  return url;
};

export function ExamRoom({ exam, onComplete }: { exam: Ujian, onComplete: () => void }) {
  const { user } = useApp();
  const [timeLeft, setTimeLeft] = useState(exam.durasi * 60);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const violationCountRef = useRef(0);
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);

  const [unansweredList, setUnansweredList] = useState<number[]>([]);

  // Sync answersRef with answers state
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const forceSubmit = async (reason: string = 'Waktu habis, jawaban terkirim otomatis!') => {
    setSubmitting(true);
    await api.call('submit_ujian', {
      id_ujian: exam.id,
      id_siswa: user?.id_siswa,
      jawaban: answersRef.current,
      jml_essay: exam.jml_essay
    });
    toast(reason, 'info');
    onComplete();
  };

  // Derive questions based strictly on exam structure info for this lightweight replica
  const pgQuestions = Array.from({ length: exam.jml_soal }, (_, i) => ({
    id: `Soal${i + 1}`,
    nomor: i + 1,
  }));
  const essayQuestions = Array.from({ length: exam.jml_essay }, (_, i) => ({
    id: `essay_${i + 1}`,
    nomor: exam.jml_soal + i + 1,
  }));

  const options = exam.jml_opsi === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
  const totalQuestions = exam.jml_soal + exam.jml_essay;
  const answeredCount = Object.keys(answers).filter(k => answers[k] && answers[k].trim() !== '').length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100) || 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          forceSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.id_siswa) {
      api.call('update_terjawab', {
        id_ujian: exam.id,
        id_siswa: user.id_siswa,
        terjawab: answeredCount
      });
    }
  }, [answeredCount, exam.id, user?.id_siswa]);

  useEffect(() => {
    // Camera Setup
    let stream: MediaStream | null = null;
    let snapshotTimer: any = null;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraGranted(true);

        // Function to take and send snapshot
        const takeSnapshot = async () => {
          if (videoRef.current && videoRef.current.readyState === 4 && user?.id_siswa && exam?.id) {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 120;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const base64Img = canvas.toDataURL('image/jpeg', 0.4);
              const res = await api.call('update_camera_snapshot', {
                 id_ujian: exam.id,
                 id_siswa: user.id_siswa,
                 snapshot: base64Img
              });
              if (res.force_submit) {
                forceSubmit('Ujian dihentikan paksa oleh Admin/Pengawas.');
              }
            }
          }
        };

        // Take first snapshot quickly
        setTimeout(takeSnapshot, 1000);

        // Start taking snapshots without delay (every 5 seconds)
        snapshotTimer = setInterval(takeSnapshot, 3000);
      } catch (err) {
        console.error("Camera access denied or error:", err);
        setCameraGranted(false);
      }
    };
    startCamera();

    const handleViolation = (message: string) => {
      violationCountRef.current += 1;
      if (violationCountRef.current > 3) {
        forceSubmit('Anda melanggar aturan lebih dari 3 kali. Ujian dihentikan otomatis!');
      } else {
        toast(`Peringatan ${violationCountRef.current}: ${message}`, 'error');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Anda terdeteksi keluar dari layar ujian tab/aplikasi!');
      }
    };
    
    const handleBlur = () => {
      setTimeout(() => {
        if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
          return;
        }
        handleViolation('Anda terdeteksi mengklik di luar browser atau tab ujian!');
      }, 0);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (snapshotTimer) {
        clearInterval(snapshotTimer);
      }
    };
  }, []);

  const handleAnswer = (id: string, val: string) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmit = async () => {
    const timeUsed = (exam.durasi * 60) - timeLeft;
    const minTime = (Number(exam.min_kumpul) || 0) * 60;
    
    if (timeUsed < minTime) {
      toast(`Belum mencapai batas minimal waktu kumpul (${formatTime(minTime - timeUsed)} lagi)`, 'warning');
      return;
    }

    const unanswered: number[] = [];
    pgQuestions.forEach(q => {
      if (!answers[q.id] || answers[q.id].trim() === '') unanswered.push(q.nomor);
    });
    essayQuestions.forEach(q => {
      if (!answers[q.id] || answers[q.id].trim() === '') unanswered.push(q.nomor);
    });
    setUnansweredList(unanswered);

    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    const res = await api.call('submit_ujian', {
      id_ujian: exam.id,
      id_siswa: user?.id_siswa,
      jawaban: answers,
      jml_essay: exam.jml_essay
    });
    if (res.success) {
      toast("Lembar jawaban berhasil dikumpulkan", "success");
      onComplete();
    } else {
      toast("Gagal mengumpulkan", "error");
      setSubmitting(false);
    }
  };

  if (cameraGranted === false) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Akses Kamera Ditolak</h1>
        <p className="text-slate-600 mb-8 max-w-md text-base sm:text-lg leading-relaxed font-medium">
          Anda wajib mengizinkan akses kamera untuk mengikuti ujian. Silakan izinkan dari pengaturan browser atau perangkat Anda, lalu muat ulang halaman ini.
        </p>
        <button onClick={() => window.location.reload()} className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-95 text-base sm:text-lg">
          Saya Telah Mengizinkan Kamera
        </button>
      </div>
    );
  }

  if (cameraGranted === null) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin mb-6 shadow-sm" />
        <p className="text-slate-800 font-bold text-xl sm:text-2xl tracking-tight mb-2">Pengecekan Keamanan...</p>
        <p className="text-slate-500 font-medium">Sistem sedang meminta akses kamera untuk pengawasan ujian. Mohon berikan izin saat browser memintanya.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col lg:flex-row gap-2 lg:gap-4 p-2 lg:p-4 overflow-hidden">
      
      {/* PDF View (Mocked with IFrame using Data URL) */}
      <div className="w-full h-[45vh] lg:h-auto lg:flex-1 lg:flex-[3] bg-slate-50 rounded-2xl border border-slate-200 shadow-none flex flex-col overflow-hidden shrink-0">
        <div className="bg-white border-b border-slate-200 text-slate-900 px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center shrink-0">
          <span className="font-semibold text-xs sm:text-sm flex items-center"><FileText className="w-4 h-4 text-violet-500 mr-2" /> NASKAH SOAL</span>
          <div className="text-[10px] sm:text-xs bg-slate-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-200 text-slate-500 truncate max-w-[150px] sm:max-w-none">
            {exam.judul}
          </div>
        </div>
        <div className="flex-1 bg-slate-50 flex items-center justify-center p-1.5 sm:p-2 relative overflow-hidden">
          <iframe 
            src={getEmbedUrl(exam.file_pdf)} 
            className="w-full h-full bg-white rounded-xl shadow-inner border-0"
            title="Naskah Soal"
          />
        </div>
      </div>

      {/* Control Panel & LJK */}
      <div className="flex-1 w-full lg:w-[420px] lg:flex-none bg-white rounded-2xl border border-slate-200 shadow-none flex flex-col overflow-hidden relative shrink-0">
        <div className="bg-white border-b border-slate-200 text-slate-900 p-3 sm:p-5 shrink-0 flex flex-col gap-3 sm:gap-4 relative z-10 sticky top-0">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-violet-400 tracking-tight text-base sm:text-lg">LJK DIGITAL</h4>
            <div className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl font-mono text-base sm:text-lg font-bold border ${timeLeft < 300 ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-pulse' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex justify-between text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Progres</span>
              <span>{answeredCount} / {totalQuestions} Terjawab</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 sm:h-2.5 shadow-inner overflow-hidden">
              <div className="bg-violet-500 h-2 sm:h-2.5 rounded-full smooth-transition" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-violet-600 text-white font-medium py-2 sm:py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-violet-700 btn-touch text-sm sm:text-base transition-colors"
          >
            {submitting ? 'Memproses...' : <><Send className="w-4 h-4" /> Kumpulkan Jawaban</>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-slate-50 relative shadow-inner">
          <div className="space-y-3">
            {/* PG */}
            {pgQuestions.map((q) => (
              <div key={q.id} className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-none flex items-center gap-3 sm:gap-4 hover:border-violet-500 smooth-transition">
                <span className="font-semibold bg-slate-200 border border-slate-200 px-2 sm:px-3 py-1.5 rounded-xl text-xs w-14 sm:w-16 text-center shrink-0 text-slate-700">
                  No. {q.nomor}
                </span>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap flex-1 justify-around sm:justify-start">
                  {options.map((opt) => (
                    <label key={opt} className="relative cursor-pointer flex group">
                      <input 
                        type="radio" 
                        name={q.id} 
                        value={opt} 
                        className="absolute opacity-0 w-0 h-0 radio-ljk"
                        checked={answers[q.id] === opt}
                        onChange={() => handleAnswer(q.id, opt)}
                      />
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 flex items-center justify-center font-bold text-xs sm:text-sm group-hover:border-violet-500 smooth-transition bg-slate-50 text-slate-500">
                        {opt}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Essay */}
            {essayQuestions.map((q) => (
              <div key={q.id} className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-none mb-3">
                <span className="font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs inline-block">
                  Essay No. {q.nomor}
                </span>
                <textarea 
                  className="w-full h-24 sm:h-28 bg-slate-50 border border-slate-200 mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-xl font-medium text-xs sm:text-sm text-slate-700 outline-none focus:border-violet-500 focus:bg-white resize-none custom-scrollbar smooth-transition"
                  placeholder="Ketik jawaban essay di sini..."
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-sm shadow-2xl overflow-hidden relative text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {unansweredList.length > 0 ? "Ada Soal Kosong!" : "Selesai Ujian?"}
            </h3>
            <div className="text-sm text-slate-500 mb-8 mt-2">
              {unansweredList.length > 0 ? (
                <div className="text-left bg-red-50 p-3 rounded-xl border border-red-100">
                  <p className="mb-2 text-red-600 font-semibold text-center">Terdapat {unansweredList.length} soal yang belum dijawab!</p>
                  <p className="text-xs text-red-500 text-center mb-1">Nomor soal:</p>
                  <p className="font-mono text-sm text-center text-red-700 font-bold overflow-hidden text-ellipsis px-2 max-h-20 custom-scrollbar overflow-y-auto">{unansweredList.join(', ')}</p>
                  <p className="text-xs text-center text-slate-500 mt-4">Apakah Anda yakin tetap ingin mengumpulkan?</p>
                </div>
              ) : (
                "Pastikan semua jawaban LJK sudah terisi dengan benar. LJK akan disubmit dan tidak dapat diubah lagi."
              )}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl btn-touch transition-colors text-sm"
                disabled={submitting}
              >
                Kembali
              </button>
              <button 
                onClick={confirmSubmit}
                className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl btn-touch transition-colors shadow-lg text-sm"
                disabled={submitting}
              >
                Tetap Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Submit Warning Header */}
      {timeLeft <= 10 && timeLeft > 0 && !showConfirm && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[70] bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-pulse pointer-events-none border-2 border-red-400">
           <AlertTriangle className="w-8 h-8 opacity-90" />
           <div className="flex flex-col items-start gap-0.5">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-90">Auto Kumpul</p>
              <p className="text-xl sm:text-3xl font-black">{timeLeft} Detik</p>
           </div>
        </div>
      )}

      {/* Hidden Camera Element for Snapshot */}
      <div className="fixed top-0 left-0 w-[1px] h-[1px] overflow-hidden opacity-10 pointer-events-none z-[-50]">
        <video 
          ref={videoRef}
          className="w-10 h-10 object-cover"
          autoPlay 
          playsInline 
          muted 
        />
      </div>

      {/* Live Monitoring Indicator */}
      <div className="fixed bottom-4 left-4 z-[40] bg-white border border-slate-200 shadow-lg rounded-2xl p-3 flex items-center gap-3 pointer-events-none fade-in">
        <div className="relative flex h-3 w-3 sm:h-4 sm:w-4 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-red-500 shrink-0"></span>
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">LIVE UJIAN</p>
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Monitoring Aktif</p>
        </div>
      </div>

    </div>
  );
}
