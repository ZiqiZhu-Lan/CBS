// 文件路径: src/App.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import { useSoundStore } from './stores/useSoundStore';
import type { Sound, PresetType, Lang } from './stores/useSoundStore';
import { FiPlay, FiPause, FiVolume2, FiClock, FiX, FiUser, FiLogOut, FiChevronDown, FiUserX, FiGlobe, FiShare2 } from 'react-icons/fi';
import { TbCloudRain, TbWind, TbFlame, TbCloudStorm } from 'react-icons/tb';
import { GiDove, GiCricket, GiBigWave, GiTreeBranch } from 'react-icons/gi';
import { motion, AnimatePresence, useScroll, useTransform, Variants, useSpring, useMotionValue } from 'framer-motion';

import rainBg from './assets/images/rain-on-grasst.png';
import wavesBg from './assets/images/waves.png';
import fireBg from './assets/images/bonfire.png';
import windBg from './assets/images/wind.png';
import birdBg from './assets/images/bird.png';
import cricketBg from './assets/images/cricket.png';
import thunderBg from './assets/images/thunder.png';
import woodcrackBg from './assets/images/woodcrack.png';
import logoImg from './assets/images/logo-512x512.png';

/* ── i18n Dictionary ───────────────────────────────────────────────────── */

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
    myMixes: 'ELS MEUS MIXOS', saveMix: 'DESA', mix: 'MIX', noActiveToSave: 'ACTIVA ALGUN SO PRIMER', saved: 'DESAT'
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
    myMixes: 'MIS MIXES', saveMix: 'GUARDAR', mix: 'MIX', noActiveToSave: 'ACTIVA ALGÚN SONIDO PRIMERO', saved: 'GUARDADO'
  },
};

/* ── Static Maps ───────────────────────────────────────────────────────── */

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

/* ── Animation Presets ─────────────────────────────────────────────────── */

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];
const trans = (delay = 0, duration = 1.5): any => ({ duration, delay, ease });
const txtVar: Variants = { hidden: { y: '120%', rotate: 2 }, show: { y: '0%', rotate: 0, transition: trans(0, 1.2) } };
const fadeUp = (d = 0): any => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: trans(d) });
const modalAnim = (s = 0.9, y = 30, dur = 0.4) => ({
  initial: { scale: s, opacity: 0, y }, animate: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: s, opacity: 0, y }, transition: trans(0, dur),
});

/* ── Hooks ─────────────────────────────────────────────────────────────── */

const useDict = () => dict[useSoundStore(s => s.lang)];

const useToast = (duration: number): [string, (msg: string) => void] => {
  const [msg, setMsg] = useState('');
  const show = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(''), duration); }, [duration]);
  return [msg, show];
};

/* ── CustomCursor ──────────────────────────────────────────────────────── */

const CustomCursor = () => {
  const x = useMotionValue(-100), y = useMotionValue(-100);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let last = false;
    const onMove = (e: MouseEvent) => {
      x.set(e.clientX - 10); y.set(e.clientY - 10);
      const h = !!(e.target as HTMLElement).closest('button, a, select, input, .sound-editorial-card, .vol-wrapper, .card-vol-hit-area, .preset-btn, .navbar-logo');
      if (h !== last) setHover(last = h);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [x, y]);

  return <motion.div className="custom-cursor" aria-hidden="true" style={{ x, y }} animate={{ scale: hover ? 1.5 : 1, opacity: hover ? 0.3 : 1 }} transition={{ duration: 0.3 }} />;
};

/* ── StatusMonitor (HUD) ───────────────────────────────────────────────── */

const StatusMonitor = () => {
  const { sounds, isGlobalPlaying, lang } = useSoundStore();
  const d = dict[lang];
  const active = sounds.filter(s => s.isPlaying);
  const cnt = active.length;
  const avg = cnt ? Math.round(active.reduce((a, s) => a + s.volume, 0) / cnt) : 0;
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
          <span className="hud-big">{cnt.toString().padStart(2, '0')}</span>/<span className="hud-sub">{sounds.length.toString().padStart(2, '0')}</span>
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

/* ── ConfirmDeleteModal ────────────────────────────────────────────────── */

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

/* ── LoginModal ────────────────────────────────────────────────────────── */

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

/* ── SoundCard ─────────────────────────────────────────────────────────── */

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

/* ── Helpers ───────────────────────────────────────────────────────────── */

const fmtTime = (s: number): string => {
  const total = Math.max(0, Math.ceil(s * 60));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
};

/* ── App (Root) ────────────────────────────────────────────────────────── */

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
    setTimeout(() => setLogoRipple(false), 800);
  };

  const [shareToastMsg, showShareToast] = useToast(3000);
  const [globalToastMsg, showGlobalToast] = useToast(1500);
  const [trackToastMsg, showTrackToast] = useToast(2000);

  const heroY = useTransform(smooth, [0, 0.4], [0, -250]);
  const heroOp = useTransform(smooth, [0, 0.3], [1, 0]);
  const heroSc = useTransform(smooth, [0, 0.4], [1, 0.9]);
  const arrowOp = useTransform(smooth, [0, 0.05], [1, 0]);

  useEffect(() => {
    if (window.location.search) {
      store.applyUrlMix(window.location.search);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (e.code === 'Space') {
        e.preventDefault();
        state.toggleGlobalPlay();
        showGlobalToast(!state.isGlobalPlaying ? 'PLAY' : 'PAUSE');
        return;
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        state.toggleMute();
        showGlobalToast(!state.isMuted ? 'MUTE' : 'UNMUTE');
        return;
      }
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

  const handleShare = () => {
    const active = store.sounds.filter(s => s.isPlaying);
    if (!active.length) return showShareToast(d.noActive);
    const params = new URLSearchParams();
    active.forEach(s => params.set(s.name.toLowerCase(), s.volume.toString()));
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?${params}`).then(() => showShareToast(d.copied));
  };

  return (
    <div className="page-wrapper">
      <CustomCursor />
      <LoginModal />
      <ConfirmDeleteModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={() => { store.deleteAccount(); setShowDeleteConfirm(false); }} />

      {/* Channel B: global toast */}
      <AnimatePresence>
        {globalToastMsg && (
          <motion.div
            className="global-toast"
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 1.05, x: '-50%', y: '-50%' }}
            transition={{ duration: 0.4, ease }}
          >
            [ {globalToastMsg} ]
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel C: track toast */}
      <AnimatePresence>
        {trackToastMsg && (
          <motion.div
            className="toast-msg track-toast"
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
          >
            {trackToastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <motion.nav className="navbar" initial={{ y: -100 }} animate={{ y: 0 }} transition={trans()} aria-label="Main Navigation">
        <div 
          className={`navbar-logo ${logoRipple ? 'ripple-active' : ''}`} 
          aria-hidden="true" 
          onClick={triggerRipple}
        >
          <img src={logoImg} alt="Silence Logo" className="logo-img" />
        </div>
        <div className="nav-center"><StatusMonitor /></div>
        <div className="nav-right">

          <div className="share-anchor">
            <button onClick={handleShare} className="btn-icon" aria-label={d.share} title={d.share}>
              <FiShare2 size={18} aria-hidden="true" />
            </button>
            {/* Channel A: share toast */}
            <AnimatePresence>
              {shareToastMsg && (
                <motion.div
                  className="toast-msg share-toast"
                  role="status" aria-live="polite"
                  initial={{ opacity: 0, y: 10, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, y: 10, x: '-50%' }}
                  transition={{ duration: 0.3, ease }}
                >
                  {shareToastMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => store.setLang(store.lang === 'ca' ? 'es' : 'ca')} className="btn-icon btn-lang" aria-label="Change Language" title="Change Language">
            <FiGlobe size={16} aria-hidden="true" /> {store.lang === 'ca' ? 'CA' : 'ES'}
          </button>

          {store.isLoggedIn ? (
            <div className="user-profile-container" ref={userMenuRef}>
              <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="btn-icon btn-user-menu" aria-label="User Menu" aria-expanded={isUserMenuOpen}>
                <FiUser aria-hidden="true" /> {store.user?.username}
                <motion.div animate={{ rotate: isUserMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <FiChevronDown size={14} aria-hidden="true" />
                </motion.div>
              </button>
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    className="dropdown-menu"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease }}
                  >
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

      {/* Main */}
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
                          if (!store.sounds.some(s => s.isPlaying)) return showShareToast(d.noActiveToSave);
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

        {/* Sound Gallery */}
        <div className="sounds-gallery" aria-label="Sound Mixers">
          {store.sounds.map((s, i) => (
            <SoundCard key={s.id} s={s} i={i} isDim={hovered !== null && hovered !== s.id} hovered={hovered} setHovered={setHovered} toggleSound={store.toggleSound} updateSoundVolume={store.updateSoundVolume} lang={store.lang} />
          ))}
        </div>
      </main>

      {/* Dynamic Island */}
      <motion.div className="dynamic-island-wrapper" initial={{ y: 150, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={trans(0.8)}>
        <div className="dynamic-pill" role="region" aria-label="Global Controls">
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
              <input
                type="range" min="0" max="100" value={store.globalVolume}
                onChange={e => store.updateGlobalVolume(parseInt(e.target.value))}
                className="vol-slider"
                style={{ '--vol': `${store.globalVolume}%` } as any}
                aria-label="Global Volume"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}