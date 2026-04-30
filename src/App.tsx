// 文件路径: src/App.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import { useSoundStore } from './stores/useSoundStore';
import type { Sound, PresetType, Lang } from './stores/useSoundStore';
import { FiPlay, FiPause, FiVolume2, FiClock, FiX, FiUser, FiLogOut, FiChevronDown, FiUserX, FiGlobe, FiShare2, FiDownload, FiSend, FiVideo } from 'react-icons/fi';
import { TbCloudRain, TbWind, TbFlame, TbCloudStorm } from 'react-icons/tb';
import { GiDove, GiCricket, GiBigWave, GiTreeBranch } from 'react-icons/gi';
import { motion, AnimatePresence, useScroll, useTransform, Variants, useSpring, useMotionValue } from 'framer-motion';
import { Howler } from 'howler';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

import rainBg from './assets/images/rain-on-grasst.png';
import wavesBg from './assets/images/waves.png';
import fireBg from './assets/images/bonfire.png';
import windBg from './assets/images/wind.png';
import birdBg from './assets/images/bird.png';
import cricketBg from './assets/images/cricket.png';
import thunderBg from './assets/images/thunder.png';
import woodcrackBg from './assets/images/woodcrack.png';
import logoImg from './assets/images/logo-512x512.png';

const dict: Record<Lang, Record<string, string>> = {
  ca: {
    estado: 'ESTAT', activo: 'ACTIU', espera: 'ESPERA', pistas: 'PISTES', volumen: 'VOLUM',
    hero1: 'MOLDEJA LA TEVA', hero2: 'ATMOSFERA', subtitle: 'Llisca per explorar el teu espai immersiu',
    login: 'INICIA SESSIÓ', logout: 'Tanca sessió', deleteAcc: 'Eliminar compte',
    joinUs: 'UNEIX-TE', welcomeBack: 'BENVINGUT', username: "NOM D'USUARI", password: 'CONTRASENYA',
    register: "REGISTRA'T", errCredentials: 'Credencials invàlides', errUserExists: "L'usuari ja existeix",
    errEmpty: 'Introdueix usuari i contrasenya', alreadyHave: 'Ja tens un compte?', newHere: 'Ets nou aquí?',
    signIn: 'Inicia sessió', createAcc: 'Crea un compte', dangerZone: 'ZONA DE PERILL',
    deleteConfirm: 'Estàs segur que vols eliminar el teu compte permanentment?', cannotUndo: 'Aquesta acció no es pot desfer.',
    cancel: 'CANCEL·LAR', delete: 'ELIMINAR', standby: 'EN ESPERA', timer: 'TIMER', min: 'MIN',
    share: 'COMPARTIR', copied: 'ENLLAÇ COPIAT', noActive: 'CAP SO ACTIU', reset: 'RESTABLIR',
    myMixes: 'ELS MEUS MIXOS', saveMix: 'DESA', mix: 'MIX', noActiveToSave: 'ACTIVA ALGUN SO PRIMER', saved: 'DESAT',
    legalTitle: 'Informació Legal',
    disclaimer: 'Aquest projecte no està associat amb cap projecte original i és exclusivament amb finalitats educatives.',
    terms: 'Termes', privacy: 'Privadesa',
    changeLang: 'CANVIAR IDIOMA', userMenu: "MENÚ D'USUARI", ignot: "L'IGNOT",
    shareDesc: 'ESCANEJA PER ESCOLTAR', download: 'DESCARREGAR', shareApp: 'COMPARTIR', nativeShare: 'NATIVE SHARE',
  },
  es: {
    estado: 'ESTADO', activo: 'ACTIVO', espera: 'ESPERA', pistas: 'PISTAS', volumen: 'VOLUMEN',
    hero1: 'MOLDEA TU', hero2: 'ATMÓSFERA', subtitle: 'Desliza para explorar tu espacio inmersivo',
    login: 'INICIAR SESIÓN', logout: 'Cerrar sesión', deleteAcc: 'Eliminar cuenta',
    joinUs: 'ÚNETE', welcomeBack: 'BIENVENIDO', username: 'USUARIO', password: 'CONTRASEÑA',
    register: 'REGISTRARSE', errCredentials: 'Credenciales inválidas', errUserExists: 'El usuario ya existe',
    errEmpty: 'Por favor, introduce usuario y contraseña', alreadyHave: '¿Ya tienes cuenta?', newHere: '¿Nuevo aquí?',
    signIn: 'Inicia sesión', createAcc: 'Crear cuenta', dangerZone: 'ZONA DE PELIGRO',
    deleteConfirm: '¿Estás seguro de que deseas eliminar tu cuenta permanentemente?', cannotUndo: 'Esta acción no se puede deshacer.',
    cancel: 'CANCELAR', delete: 'ELIMINAR', standby: 'ESPERA', timer: 'TIMER', min: 'MIN',
    share: 'COMPARTIR', copied: 'ENLACE COPIADO', noActive: 'NINGÚN SONIDO ACTIVO', reset: 'REINICIAR',
    myMixes: 'MIS MIXES', saveMix: 'GUARDAR', mix: 'MIX', noActiveToSave: 'ACTIVA ALGÚN SONIDO PRIMERO', saved: 'GUARDADO',
    legalTitle: 'Información Legal',
    disclaimer: 'Este proyecto no asociado con ningún proyecto original y es exclusivamente para fines educativos.',
    terms: 'Términos', privacy: 'Privacidad',
    changeLang: 'CAMBIAR IDIOMA', userMenu: 'MENÚ DE USUARIO', ignot: 'IGNÓTO',
    shareDesc: 'ESCANEA PARA ESCUCHAR', download: 'DESCARGAR', shareApp: 'COMPARTIR', nativeShare: 'NATIVE SHARE',
  },
};

const bgMap: Record<number, string> = { 1: rainBg, 2: cricketBg, 3: wavesBg, 4: thunderBg, 5: fireBg, 6: windBg, 7: birdBg, 8: woodcrackBg };
const iconMap: Record<number, React.ReactNode> = { 1: <TbCloudRain />, 2: <GiCricket />, 3: <GiBigWave />, 4: <TbCloudStorm />, 5: <TbFlame />, 6: <TbWind />, 7: <GiDove />, 8: <GiTreeBranch /> };
const authorMap: Record<number, { name: string; url: string }> = {
  1: { name: 'Mjeno', url: 'https://freesound.org/people/Mjeno/sounds/399275/?' },
  2: { name: 'Defelozedd94', url: 'https://freesound.org/people/Defelozedd94/sounds/522298/' },
  3: { name: 'mmiron', url: 'https://freesound.org/people/mmiron/sounds/130432/' },
  4: { name: 'TRP', url: 'https://freesound.org/people/TRP/sounds/717845/' },
  5: { name: 'amether', url: 'https://freesound.org/people/amether/sounds/189237/' },
  6: { name: 'santiago.torres1314', url: 'https://freesound.org/people/santiago.torres1314/sounds/677563/' },
  7: { name: 'klankbeeld', url: 'https://freesound.org/people/klankbeeld/sounds/810338/?' },
  8: { name: 'kyles', url: 'https://freesound.org/people/kyles/sounds/637746/' },
};

const themeColorMap: Record<number, string> = {
  1: '90, 140, 180', 2: '110, 90, 150', 3: '0, 120, 200', 4: '140, 100, 220',
  5: '220, 80, 20', 6: '160, 190, 190', 7: '220, 160, 80', 8: '160, 110, 60',
};

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];
const trans = (delay = 0, duration = 1.5): any => ({ duration, delay, ease });
const txtVar: Variants = { hidden: { y: '120%', rotate: 2 }, show: { y: '0%', rotate: 0, transition: trans(0, 1.2) } };
const fadeUp = (d = 0): any => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: trans(d) });
const modalAnim = (s = 0.9, y = 30, dur = 0.4) => ({
  initial: { scale: s, opacity: 0, y }, animate: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: s, opacity: 0, y }, transition: trans(0, dur),
});

const zenQuotes = [
  "En el ruido, encuentra tu ancla.",
  "Escucha el silencio.",
  "Respira. Pausa. Siente.",
  "El mundo se desvanece."
];

const useDict = () => dict[useSoundStore(s => s.lang)];

const useToast = (duration: number): [string, (msg: string) => void] => {
  const [msg, setMsg] = useState('');
  const show = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(''), duration); }, [duration]);
  return [msg, show];
};

const useIdle = (ms: number) => {
  const [idle, setIdle] = useState(false);
  const [quote, setQuote] = useState('');

  useEffect(() => {
    let t: NodeJS.Timeout;
    const reset = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => { setQuote(zenQuotes[Math.floor(Math.random() * zenQuotes.length)]); setIdle(true); }, ms);
    };
    const events = ['mousemove', 'keydown', 'click'] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { events.forEach(e => window.removeEventListener(e, reset)); clearTimeout(t); };
  }, [ms]);

  return { idle, quote };
};

const loadImg = (src: string): Promise<HTMLImageElement> => new Promise(res => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => res(img);
  img.src = src;
});

const ShareModal = () => {
  const { isShareModalOpen: isOpen, toggleShareModal, sounds, lang } = useSoundStore();
  const d = dict[lang];
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileExt, setFileExt] = useState('mp4'); 
  const isRecordingRef = useRef(false);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    if (!isOpen) {
      setVideoUrl(null);
      setIsRecording(false);
      setIsTranscoding(false);
      setProgress(0);
      isRecordingRef.current = false;
    }
  }, [isOpen]);

  const startRecording = async () => {
    setIsRecording(true);
    setIsTranscoding(false);
    setProgress(0);
    isRecordingRef.current = true;

    const safeSounds = (sounds || []).filter(s => s && typeof s === 'object' && 'volume' in s);
    const active = safeSounds.filter(s => s.isPlaying).sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0));
    const mainImg = active.length > 0 ? await loadImg(bgMap[active[0].id]) : null;

    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1920; 
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let audioCtx = Howler.ctx;
    if (!audioCtx) {
        setIsRecording(false); 
        return; 
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    const dest = audioCtx.createMediaStreamDestination();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256; 

    Howler.masterGain.connect(analyser);
    analyser.connect(audioCtx.destination); 
    Howler.masterGain.connect(dest);        

    const canvasStream = (canvas as any).captureStream(30);
    
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) {
        canvasStream.addTrack(audioTrack);
    }

    const mimeType = [
      'video/webm;codecs=vp9',
      'video/webm'
    ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    const recorder = new MediaRecorder(canvasStream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    
    recorder.onstop = async () => {
      setIsRecording(false);
      setIsTranscoding(true);
      const webmBlob = new Blob(chunks, { type: mimeType });

      try {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg.loaded) {
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
          await ffmpeg.load({
            coreURL: `${baseURL}/ffmpeg-core.js`,
            wasmURL: `${baseURL}/ffmpeg-core.wasm`,
          });
        }

        ffmpeg.on('progress', ({ progress: p }) => setProgress(p));

        await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
        
        await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'copy', '-c:a', 'aac', 'output.mp4']);

        const fileData = await ffmpeg.readFile('output.mp4');
        const mp4Blob = new Blob([fileData as any], { type: 'video/mp4' });

        setVideoUrl(URL.createObjectURL(mp4Blob));
        setFileExt('mp4');
      } catch (err) {
        console.error("Transcoding failed, falling back to webm:", err);
        setVideoUrl(URL.createObjectURL(webmBlob));
        setFileExt('webm');
      } finally {
        setIsTranscoding(false);
        isRecordingRef.current = false;
        
        try {
            Howler.masterGain.disconnect(dest);
            Howler.masterGain.disconnect(analyser);
        } catch(e) {}
      }
    };

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let frameId: number;
    const draw = () => {
      if (!isRecordingRef.current) return;
      frameId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 1080, 1920);
      if (mainImg) {
        const imgRatio = mainImg.width / mainImg.height; const boxRatio = 1080 / 1920;
        let dw = 1080, dh = 1920, dx = 0, dy = 0;
        if (imgRatio > boxRatio) { dw = 1920 * imgRatio; dx = -(dw - 1080) / 2; }
        else { dh = 1080 / imgRatio; dy = -(dh - 1920) / 2; }
        ctx.drawImage(mainImg, dx, dy, dw, dh);
        ctx.fillStyle = 'rgba(5, 5, 5, 0.75)'; ctx.fillRect(0, 0, 1080, 1920);
      }
      const cx = 540, cy = 800, r = 250;
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255.0; const h = v * 200; const angle = (i / bufferLength) * Math.PI * 2;
        const x1 = cx + Math.cos(angle) * r; const y1 = cy + Math.sin(angle) * r;
        const x2 = cx + Math.cos(angle) * (r + h); const y2 = cy + Math.sin(angle) * (r + h);
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.font = '500 28px "Helvetica Neue", Helvetica, Arial, sans-serif'; ctx.letterSpacing = '10px'; ctx.textAlign = 'center'; ctx.fillText('CBS-SILENCE', cx, cy + 10);
      
      ctx.textAlign = 'left';
      const bottomY = 1400;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.font = '400 24px "Helvetica Neue", Helvetica, Arial, sans-serif'; ctx.letterSpacing = '6px';
      ctx.fillText(lang === 'ca' ? 'LA TEVA ATMOSFERA' : 'TU ATMÓSFERA', 120, bottomY);

      const leftColX = 120; const rightColX = 540; const listStartY = bottomY + 80;
      active.forEach((s, idx) => {
        const name = (lang === 'ca' ? s.name_ca : s.name_es).split(' ')[0];
        const volStr = (s.volume || 0).toString();
        const isRight = idx % 2 !== 0; const baseX = isRight ? rightColX : leftColX;
        const y = listStartY + Math.floor(idx / 2) * 60;
        ctx.font = '600 28px "Helvetica Neue", Helvetica, Arial, sans-serif'; ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.letterSpacing = '4px'; ctx.fillText(name, baseX, y);
        ctx.font = '400 28px monospace'; ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.letterSpacing = '0px'; ctx.fillText(volStr, baseX + 260, y);
      });
    };

    draw();
    recorder.start();

    let elapsed = 0;
    const totalTime = 15000;
    const intervalId = setInterval(() => {
      elapsed += 100;
      setProgress(elapsed / totalTime);
      if (elapsed >= totalTime) {
        clearInterval(intervalId);
        recorder.stop();
        cancelAnimationFrame(frameId);
      }
    }, 100);
  };

  const handleNativeShare = async () => {
    if (!navigator.share || !videoUrl) return;
    try {
      const blob = await (await fetch(videoUrl)).blob();
      const file = new File([blob], `silence-mix.${fileExt}`, { type: blob.type });
      await navigator.share({
        title: 'CBS-SILENCE',
        text: 'Escucha mi atmósfera.',
        files: [file]
      });
    } catch (err) {}
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="modal-overlay" onClick={() => !isRecording && !isTranscoding && toggleShareModal(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="modal-content share-modal-content" onClick={e => e.stopPropagation()} {...modalAnim(0.95, 20, 0.4)}>
            <h2 id="share-title">{d.shareApp}</h2>
            <div className="video-container">
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay loop className="share-video-preview" />
              ) : isRecording || isTranscoding ? (
                <div className="recording-status">
                  <div className="pulsing-record-dot" />
                  <span>{isTranscoding ? 'TRANSCODING MP4...' : 'RECORDING...'}</span>
                  <div className="record-progress-bar" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
                </div>
              ) : (
                <button className="btn-auth-submit btn-start-record" onClick={startRecording}>
                  <FiVideo size={20} /> START 15S RECORDING
                </button>
              )}
            </div>
            {videoUrl && (
              <div className="share-actions">
                <a className="btn-auth-submit btn-cancel" href={videoUrl} download={`silence-mix.${fileExt}`}>
                  <FiDownload size={16} /> {d.download}
                </a>
                {'share' in navigator && (
                  <button className="btn-auth-submit" onClick={handleNativeShare}>
                    <FiSend size={16} /> {d.nativeShare}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const CustomCursor = ({ idle }: { idle: boolean }) => {
  const x = useMotionValue(-100), y = useMotionValue(-100);
  const trailX = useSpring(x, { stiffness: 600, damping: 25, mass: 0.2 });
  const trailY = useSpring(y, { stiffness: 600, damping: 25, mass: 0.2 });
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (idle) return;
    
    let last = false;
    const onMove = (e: MouseEvent) => {
      x.set(e.clientX - 10); y.set(e.clientY - 10);
      const h = !!(e.target as HTMLElement).closest('button, a, select, input, .sound-editorial-card, .vol-wrapper, .card-vol-hit-area, .preset-btn, .document-logo');
      if (h !== last) setHover(last = h);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [x, y, idle]);

  if (idle) return null;

  return (
    <>
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>
      <div className="cursor-goo-container">
        <motion.div className="custom-cursor-trail" aria-hidden="true" style={{ x: trailX, y: trailY }} animate={{ scale: hover ? 0 : 1 }} />
        <motion.div className="custom-cursor" aria-hidden="true" style={{ x, y }} animate={{ scale: hover ? 1.5 : 1, opacity: hover ? 0.3 : 1 }} transition={{ duration: 0.3 }} />
      </div>
    </>
  );
};

const StatusMonitor = () => {
  const { sounds, isGlobalPlaying, lang } = useSoundStore();
  const d = dict[lang];
  const safeSounds = (sounds || []).filter(s => s && typeof s === 'object' && 'volume' in s);
  const active = safeSounds.filter(s => s.isPlaying);
  const cnt = active.length;
  const avg = cnt ? Math.round(active.reduce((a, s) => a + Number(s.volume || 0), 0) / cnt) : 0;
  const cls = (on: boolean) => `hud-val ${on ? 'hud-val--on' : 'hud-val--off'}`;

  return (
    <div className="hidden-mobile hud-pill" aria-live="polite" aria-atomic="true">
      <div className="hud-corner hud-corner--tl" aria-hidden="true" />
      <div className="hud-corner hud-corner--br" aria-hidden="true" />
      <div className="hud-cell">
        <span className="hud-label">{d.estado}</span>
        <span className={cls(isGlobalPlaying)}>{isGlobalPlaying ? d.activo : d.espera}</span>
      </div>
      <div className="hud-sep" aria-hidden="true" />
      <div className="hud-cell">
        <span className="hud-label">{d.pistas}</span>
        <span className={cls(cnt > 0)}>
          <span className="hud-big">{cnt.toString().padStart(2, '0')}</span>/<span className="hud-sub">{safeSounds.length.toString().padStart(2, '0')}</span>
        </span>
      </div>
      <div className="hud-sep" aria-hidden="true" />
      <div className="hud-cell">
        <span className="hud-label">{d.volumen}</span>
        <span className={cls(cnt > 0)}>
          <span className="hud-big">{avg.toString().padStart(2, '0')}</span><span className="hud-sub">%</span>
        </span>
      </div>
    </div>
  );
};

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) => {
  const d = useDict();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="modal-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 200000 }}>
          <motion.div className="modal-content confirm-delete-modal" onClick={e => e.stopPropagation()} {...modalAnim()} role="dialog" aria-modal="true" aria-labelledby="danger-zone-title">
            <div className="danger-corner danger-corner--tl" aria-hidden="true" />
            <div className="danger-corner danger-corner--br" aria-hidden="true" />
            <h2 id="danger-zone-title">{d.dangerZone}</h2>
            <p className="confirm-delete-body">
              {d.deleteConfirm}
              <span className="confirm-delete-sub">{d.cannotUndo}</span>
            </p>
            <div className="confirm-delete-actions">
              <button className="btn-auth-submit btn-cancel" onClick={onClose} aria-label={d.cancel}>{d.cancel}</button>
              <button className="btn-auth-submit btn-danger" onClick={onConfirm} aria-label={d.delete}>{d.delete}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const LoginModal = () => {
  const { isLoginModalOpen: isOpen, toggleLoginModal: toggle, login, register, lang } = useSoundStore();
  const d = dict[lang];
  const [f, setF] = useState({ u: '', p: '', err: '', isReg: false });

  useEffect(() => { if (isOpen) setF({ u: '', p: '', err: '', isReg: false }); }, [isOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.u || !f.p) return setF(s => ({ ...s, err: d.errEmpty }));
    if (!(f.isReg ? register(f.u, f.p) : login(f.u, f.p)))
      setF(s => ({ ...s, err: f.isReg ? d.errUserExists : d.errCredentials }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="modal-overlay" onClick={() => toggle(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="modal-content" onClick={e => e.stopPropagation()} {...modalAnim(0.9, 50, 0.6)} role="dialog" aria-modal="true" aria-labelledby="login-title">
            <button className="modal-close" onClick={() => toggle(false)} aria-label="Close modal"><FiX size={24} aria-hidden="true" /></button>
            <h2 id="login-title">{f.isReg ? d.joinUs : d.welcomeBack}</h2>
            <form onSubmit={submit}>
              <div className="input-group">
                <input autoFocus value={f.u} onChange={e => setF({ ...f, u: e.target.value })} placeholder={d.username} aria-label={d.username} />
              </div>
              <div className="input-group">
                <input type="password" value={f.p} onChange={e => setF({ ...f, p: e.target.value })} placeholder={d.password} aria-label={d.password} />
              </div>
              {f.err && <div className="error-msg" role="alert">{f.err}</div>}
              <button type="submit" className="btn-auth-submit">{f.isReg ? d.register : d.login}</button>
            </form>
            <div className="auth-switch">
              {f.isReg ? d.alreadyHave : d.newHere}{' '}
              <button className="link-btn" onClick={() => setF({ ...f, isReg: !f.isReg, err: '' })}>
                <span>{f.isReg ? d.signIn : d.createAcc}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface SoundCardProps {
  s: Sound; i: number; isDim: boolean; hovered: number | null; lang: Lang;
  setHovered: (id: number | null) => void; toggleSound: (id: number) => void; updateSoundVolume: (id: number, vol: number) => void;
}

const SoundCard = React.memo(({ s, i, isDim, hovered, setHovered, toggleSound, updateSoundVolume, lang }: SoundCardProps) => {
  const label = lang === 'ca' ? s.name_ca : s.name_es;
  const author = authorMap[s.id];

  return (
    <div style={{ marginTop: i % 2 ? 120 : 0 }}>
      <motion.div
        initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.1 }}
        variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: trans((i % 2) * 0.15, 0.8) } }}
      >
        <motion.div
          className={`sound-editorial-card ${s.isPlaying ? 'is-playing' : ''}`}
          onMouseEnter={() => setHovered(s.id)}
          onMouseLeave={() => setHovered(null)}
          animate={{ opacity: isDim ? 0.55 : 1, scale: isDim ? 0.97 : 1, filter: isDim ? 'blur(2px)' : 'blur(0px)' }}
          transition={{ duration: 0.4 }}
          style={{ '--theme-color-rgb': themeColorMap[s.id] || '255,255,255' } as React.CSSProperties}
        >
            <div className="card-bg-container" aria-hidden="true">
              <motion.div
                className="card-bg-image"
                style={{ backgroundImage: `url(${bgMap[s.id]})` } as any}
                animate={{ scale: s.isPlaying ? 1.05 : 1, filter: s.isPlaying ? 'grayscale(0%)' : 'grayscale(100%) brightness(0.4)' }}
                transition={{ duration: 2 }}
              />
              <div className="card-overlay" />
            </div>
            <div className="card-content">
              <div className="card-top">
                <div className="icon-wrap" aria-hidden="true">{iconMap[s.id]}</div>
                <button onClick={() => toggleSound(s.id)} className="btn-circular-play" aria-label={`${s.isPlaying ? 'Pause' : 'Play'} ${label}`} aria-pressed={s.isPlaying}>
                  <motion.div animate={{ rotate: s.isPlaying ? 360 : 0 }}>
                    {s.isPlaying ? <FiPause size={20} aria-hidden="true" /> : <FiPlay size={20} className="play-offset" aria-hidden="true" />}
                  </motion.div>
                </button>
              </div>
              <div className="card-bottom">
                <h2 className="card-title">{label}</h2>
                <h4 className="card-eng-title" aria-hidden="true">{s.name.toUpperCase()}</h4>
                {author?.name && (
                  <div className="card-credit">
                    AUDIO BY{' '}
                    <a href={author.url} target="_blank" rel="noopener noreferrer" aria-label={`Audio credit to ${author.name}`}>{author.name}</a>
                  </div>
                )}
                <AnimatePresence>
                  {(s.isPlaying || hovered === s.id) && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 15 }} exit={{ opacity: 0, height: 0 }}>
                      <div className="card-vol-hit-area">
                        <input
                          type="range" min="0" max="100" value={s.volume}
                          onChange={e => updateSoundVolume(s.id, parseInt(e.target.value))}
                          className="card-vol-slider"
                          style={{ '--vol': `${s.volume}%` } as any}
                          aria-label={`Volume for ${label}`}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
        </motion.div>
      </motion.div>
    </div>
  );
});

const fmtTime = (s: number): string => {
  const total = Math.max(0, Math.ceil(s * 60));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
};

export default function App() {
  const store = useSoundStore();
  const d = dict[store.lang];
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [hovered, setHovered] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [timerPreset, setTimerPreset] = useState(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [logoRipple, setLogoRipple] = useState(false);
  const triggerRipple = () => {
    if (logoRipple) return;
    setLogoRipple(true);
    setTimeout(() => setLogoRipple(false), 1200);
  };
  
  const { idle, quote } = useIdle(30000);

  const [shareToastMsg, showShareToast] = useToast(3000);
  const [globalToastMsg, showGlobalToast] = useToast(1500);
  const [trackToastMsg, showTrackToast] = useToast(2000);

  const heroY = useTransform(smooth, [0, 0.4], [0, -250]);
  const heroOp = useTransform(smooth, [0, 0.3], [1, 0]);
  const heroSc = useTransform(smooth, [0, 0.4], [1, 0.9]);
  const arrowOp = useTransform(smooth, [0, 0.05], [1, 0]);

  const timerProgress = store.initialTimerDuration > 0
    ? Math.min(100, Math.max(0, ((store.initialTimerDuration - store.timerDuration) / store.initialTimerDuration) * 100))
    : 0;

  useEffect(() => {
    if (window.location.search) {
      store.applyUrlMix(window.location.search);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const t = store.isTimerActive && store.timerDuration > 0 ? setInterval(store.tick, 1000) : null;
    return () => { if (t) clearInterval(t); };
  }, [store.isTimerActive, store.timerDuration, store.tick]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'SILENCE / 01', artist: 'Immersive Atmosphere', album: 'Custom Background Sound',
      artwork: [{ src: '/logo192.png', sizes: '192x192', type: 'image/png' }, { src: '/logo512.png', sizes: '512x512', type: 'image/png' }]
    });
    navigator.mediaSession.setActionHandler('play', () => { const s = useSoundStore.getState(); if (!s.isGlobalPlaying) s.toggleGlobalPlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { const s = useSoundStore.getState(); if (s.isGlobalPlaying) s.toggleGlobalPlay(); });
  }, []);

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = store.isGlobalPlaying ? 'playing' : 'paused';
  }, [store.isGlobalPlaying]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const state = useSoundStore.getState();
      if (e.code === 'Space') { e.preventDefault(); state.toggleGlobalPlay(); showGlobalToast(!state.isGlobalPlaying ? 'PLAY' : 'PAUSE'); return; }
      if (e.code === 'KeyM') { e.preventDefault(); state.toggleMute(); showGlobalToast(!state.isMuted ? 'MUTE' : 'UNMUTE'); return; }
      const m = e.code.match(/^(?:Digit|Numpad)([1-8])$/);
      if (m) {
        e.preventDefault();
        const sound = state.sounds[parseInt(m[1], 10) - 1];
        if (sound) { state.toggleSound(sound.id); showTrackToast(`[ ${sound.name.toUpperCase()} ${!sound.isPlaying ? 'ON' : 'OFF'} ]`); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGlobalToast, showTrackToast]);

  const handleTimer = (m: number) => { setTimerPreset(m); store.setTimerDuration(m); };

  const validAppSounds = (store.sounds || []).filter(s => s && typeof s === 'object' && 'volume' in s);

  const handleShareClick = () => {
    const active = validAppSounds.filter(s => s.isPlaying);
    if (!active.length) return showShareToast(d.noActive);
    store.toggleShareModal(true);
  };

  return (
    <>
      <CustomCursor idle={idle} />
      
      <div className={`zen-overlay ${idle ? 'active' : ''}`} aria-hidden="true">
        <p className="zen-text">{quote}</p>
      </div>

      <div className="page-wrapper">
        <LoginModal />
        <ShareModal />
        <ConfirmDeleteModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={() => { store.deleteAccount(); setShowDeleteConfirm(false); }} />

        <AnimatePresence>
          {globalToastMsg && (
            <motion.div className="global-toast" initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 1.05, x: '-50%', y: '-50%' }} transition={{ duration: 0.4, ease }}>
              [ {globalToastMsg} ]
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {trackToastMsg && (
            <motion.div className="toast-msg track-toast" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}>
              {trackToastMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`document-logo ${logoRipple ? 'ripple-active' : ''}`} aria-hidden="true" onClick={triggerRipple}>
          <img src={logoImg} alt="Silence Logo" className="logo-img" />
        </div>

        <motion.nav className="navbar" initial={{ y: -100 }} animate={{ y: 0 }} transition={trans()} aria-label="Main Navigation">
          <div className="nav-left"></div>
          <div className="nav-center"><StatusMonitor /></div>
          <div className="nav-right">
            <div className="share-anchor">
              <button onClick={handleShareClick} className="btn-icon nav-tooltip" aria-label={d.share}>
                <FiShare2 size={18} aria-hidden="true" />
              </button>
              <AnimatePresence>
                {shareToastMsg && (
                  <motion.div className="toast-msg share-toast" role="status" aria-live="polite" initial={{ opacity: 0, y: 10, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }} transition={{ duration: 0.3, ease }}>
                    {shareToastMsg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => store.setLang(store.lang === 'ca' ? 'es' : 'ca')} className="btn-icon btn-lang nav-tooltip" aria-label={d.changeLang}>
              <FiGlobe size={16} aria-hidden="true" /> {store.lang === 'ca' ? 'CA' : 'ES'}
            </button>

            {store.isLoggedIn ? (
              <div className="user-profile-container" ref={userMenuRef}>
                <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="btn-icon btn-user-menu nav-tooltip" aria-label={d.userMenu} aria-expanded={isUserMenuOpen}>
                  <FiUser aria-hidden="true" /> {store.user?.username}
                  <motion.div animate={{ rotate: isUserMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <FiChevronDown size={14} aria-hidden="true" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div className="dropdown-menu" initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2, ease }}>
                      <button className="dropdown-item" onClick={() => { store.logout(); setIsUserMenuOpen(false); }}>
                        <FiLogOut size={14} aria-hidden="true" /> {d.logout}
                      </button>
                      <button className="dropdown-item dropdown-item--danger" onClick={() => { setShowDeleteConfirm(true); setIsUserMenuOpen(false); }}>
                        <FiUserX size={14} aria-hidden="true" /> {d.deleteAcc}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={() => store.toggleLoginModal(true)} className="btn-login" aria-label={d.login}>{d.login}</button>
            )}
          </div>
        </motion.nav>

        <main className="main-content" role="main">
          <motion.section className="hero-section" style={{ y: heroY, opacity: heroOp, scale: heroSc } as any} aria-labelledby="hero-heading">
            <div aria-hidden="true">
              {[d.hero1, d.hero2].map((txt, i) => (
                <div key={i} className="hero-text-mask">
                  <motion.h1 variants={txtVar} initial="hidden" animate="show" transition={{ delay: i * 0.1 }}>{txt}</motion.h1>
                </div>
              ))}
            </div>
            <h1 id="hero-heading" className="sr-only">{d.hero1} {d.hero2}</h1>
            <motion.p className="hero-subtitle" {...fadeUp(0.4)}>{d.subtitle}</motion.p>

            <motion.div className="preset-modes" {...fadeUp(0.6)} aria-label="Preset Modes">
              {(['focus', 'relax', 'sleep', 'meditate', 'reading'] as PresetType[]).map(p => (
                <button key={p} onClick={() => store.applyPreset(p)} className="preset-btn" aria-label={`Preset ${p}`}>{p.toUpperCase()}</button>
              ))}
              <button onClick={() => { store.applyRandomMix(); triggerRipple(); }} className="preset-btn" aria-label="Random Mix">{d.ignot}</button>
              <div className="preset-divider" aria-hidden="true" />
              <button onClick={store.resetMix} className="preset-btn" aria-label="Reset all volumes and tracks">{d.reset}</button>
            </motion.div>

            {store.isLoggedIn && (
              <motion.div className="preset-modes custom-presets" {...fadeUp(0.7)} aria-label="Custom Presets">
                <span className="custom-presets-label">{d.myMixes}</span>
                {[1, 2, 3].map(slot => {
                  const hasMix = !!store.user?.preferences?.customPresets?.[slot];
                  return (
                    <div key={slot} className="custom-preset-slot">
                      {hasMix ? (
                        <>
                          <button onClick={() => store.applyCustomPreset(slot)} className="preset-btn" aria-label={`Apply Mix ${slot}`}>{d.mix} 0{slot}</button>
                          <button onClick={() => store.clearCustomPreset(slot)} className="btn-icon" style={{ opacity: 0.5, width: '24px' }} aria-label={`Clear Mix ${slot}`}><FiX size={16} /></button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            if (!validAppSounds.some(s => s.isPlaying)) return showShareToast(d.noActiveToSave);
                            store.saveCustomPreset(slot);
                            showShareToast(`${d.mix} 0${slot} ${d.saved}`);
                          }}
                          className="preset-btn preset-btn--dashed"
                          aria-label={`Save Mix ${slot}`}
                        >
                          + {d.saveMix} 0{slot}
                        </button>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            <motion.div className="scroll-indicator" style={{ opacity: arrowOp } as any} animate={{ y: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 2 }} aria-hidden="true">
              <FiChevronDown size={32} />
            </motion.div>
          </motion.section>

          <div className="sounds-gallery" aria-label="Sound Mixers">
            {validAppSounds.map((s, i) => (
              <SoundCard key={s.id || i} s={s} i={i} isDim={hovered !== null && hovered !== s.id} hovered={hovered} setHovered={setHovered} toggleSound={store.toggleSound} updateSoundVolume={store.updateSoundVolume} lang={store.lang} />
            ))}
          </div>
        </main>

        <motion.div className="dynamic-island-wrapper" initial={{ y: 150, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={trans(0.8)}>
          <div className="dynamic-pill" role="region" aria-label="Global Controls">
            <AnimatePresence>
              {store.isTimerActive && store.initialTimerDuration > 0 && (
                <motion.div className="timer-progress-bar" style={{ width: `${timerProgress}%` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ opacity: { duration: 0.4 } }} aria-hidden="true" />
              )}
            </AnimatePresence>
            <div className="pill-left">
              <div className="master-play-wrap">
                <button onClick={store.toggleGlobalPlay} className={`pill-master-btn ${store.isGlobalPlaying ? 'active' : ''}`} aria-label={store.isGlobalPlaying ? 'Pause global audio' : 'Play global audio'} aria-pressed={store.isGlobalPlaying}>
                  {store.isGlobalPlaying ? <FiPause size={18} aria-hidden="true" /> : <FiPlay size={18} className="play-offset" aria-hidden="true" />}
                </button>
              </div>
              <div className="pill-status" aria-live="polite">
                {store.isTimerActive && (
                  <>
                    <div className="timer-corner timer-corner--tl" aria-hidden="true" />
                    <div className="timer-corner timer-corner--br" aria-hidden="true" />
                  </>
                )}
                <span className="pill-label">{store.isGlobalPlaying || store.isTimerActive ? d.activo : d.standby}</span>
                {store.isTimerActive && <span className="pill-time" role="timer">{fmtTime(store.timerDuration)}</span>}
              </div>
            </div>
            <div className="pill-divider" aria-hidden="true" />
            <div className="pill-center">
              <FiClock size={16} color="rgba(255,255,255,0.4)" aria-hidden="true" />
              <select value={timerPreset} onChange={e => handleTimer(parseInt(e.target.value))} className="clean-select" aria-label={d.timer}>
                <option value={0}>{d.timer}</option>
                {[1, 5, 15, 30, 60].map(m => <option key={m} value={m}>{m} {d.min}</option>)}
              </select>
            </div>
            <div className="pill-divider hidden-mobile" aria-hidden="true" />
            <div className="pill-right hidden-mobile">
              <FiVolume2 size={18} color="rgba(255,255,255,0.6)" className="vol-icon" aria-hidden="true" />
              <div className="vol-wrapper">
                <input type="range" min="0" max="100" value={store.globalVolume} onChange={e => store.updateGlobalVolume(parseInt(e.target.value))} className="vol-slider" style={{ '--vol': `${store.globalVolume}%` } as any} aria-label="Global Volume" />
              </div>
            </div>
          </div>
        </motion.div>

        <footer className="legal-footer">
          <div className="legal-footer-content">
            <h3 className="legal-title">{d.legalTitle}</h3>
            <p className="legal-desc">{d.disclaimer}</p>
            <div className="legal-links"><span>© 2026 SILENCE / 01</span></div>
          </div>
        </footer>
      </div>
    </>
  );
}