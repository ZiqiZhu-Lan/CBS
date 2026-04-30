// 文件路径: src/stores/useSoundStore.ts
import { create } from 'zustand';
import { Howl } from 'howler';
import SHA256 from 'crypto-js/sha256';

import rainFile from '../sounds/rain-on-grasst.mp3';
import wavesFile from '../sounds/waves.mp3';
import fireFile from '../sounds/bonfire.mp3';
import windFile from '../sounds/wind.mp3';
import birdFile from '../sounds/bird.mp3';
import cricketFile from '../sounds/cricket.mp3';
import thunderFile from '../sounds/thunder.mp3';
import woodcrackFile from '../sounds/woodcrack.mp3';

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface SoundState { id: number; volume: number; isPlaying: boolean }
export interface UserPreferences {
  globalVolume: number;
  timerDuration: number;
  soundStates: SoundState[];
  lastActiveIds: number[];
  customPresets?: Record<number, Record<number, number>>;
}
export interface Sound extends SoundState { name: string; name_es: string; name_ca: string; audioUrl: string }
export interface User { id: string; username: string; password?: string; preferences?: UserPreferences }
export type PresetType = 'focus' | 'relax' | 'sleep' | 'meditate' | 'reading';
export type Lang = 'ca' | 'es';

export interface AppState {
  sounds: Sound[]; globalVolume: number; isGlobalPlaying: boolean;
  isMuted: boolean; isTimerActive: boolean; timerDuration: number;
  initialTimerDuration: number; isLoggedIn: boolean;
  user: User | null; isLoginModalOpen: boolean; isShareModalOpen: boolean;
  lastActiveIds: number[]; lang: Lang;
  
  toggleSound: (id: number) => void;
  updateSoundVolume: (id: number, volume: number) => void;
  toggleGlobalPlay: () => void;
  updateGlobalVolume: (volume: number) => void;
  toggleMute: () => void;
  setTimerDuration: (minutes: number) => void;
  tick: () => void;
  applyPreset: (type: PresetType) => void;
  applyCustomPreset: (slot: number) => void;
  saveCustomPreset: (slot: number) => void;
  clearCustomPreset: (slot: number) => void;
  applyRandomMix: () => void;
  resetMix: () => void;
  applyUrlMix: (qs: string) => void;
  login: (u: string, p: string) => boolean;
  register: (u: string, p: string) => boolean;
  logout: () => void;
  deleteAccount: () => void;
  toggleLoginModal: (open: boolean) => void;
  toggleShareModal: (open: boolean) => void;
  rehydrateAudio: () => void;
  setLang: (l: Lang) => void;
}

/* ── Config & Data ─────────────────────────────────────────────────────── */

const SOUNDS_DATA = [
  { id: 1, name: 'rain', name_es: 'LLUVIA', name_ca: 'PLUJA', audioUrl: rainFile },
  { id: 2, name: 'cricket', name_es: 'GRILLO', name_ca: 'GRILL', audioUrl: cricketFile },
  { id: 3, name: 'waves', name_es: 'OLAS', name_ca: 'ONES', audioUrl: wavesFile },
  { id: 4, name: 'thunder', name_es: 'TRUENO', name_ca: 'TRO', audioUrl: thunderFile },
  { id: 5, name: 'fire', name_es: 'FUEGO', name_ca: 'FOC', audioUrl: fireFile },
  { id: 6, name: 'wind', name_es: 'VIENTO', name_ca: 'VENT', audioUrl: windFile },
  { id: 7, name: 'birds', name_es: 'PÁJAROS', name_ca: 'OCELLS', audioUrl: birdFile },
  { id: 8, name: 'woodcrack', name_es: 'MADERA CRUJIENDO', name_ca: 'FUSTA CRUIXINT', audioUrl: woodcrackFile },
];

const PRESETS: Record<PresetType, Partial<Record<number, number>>> = {
  focus: { 1: 40, 6: 30, 8: 10 },
  relax: { 3: 50, 7: 30, 6: 20 },
  sleep: { 1: 30, 4: 20, 6: 10 },
  meditate: { 3: 40, 2: 20, 5: 15 },
  reading: { 1: 25, 5: 35, 8: 15 },
};

const SK_USERS = 'cbs_users';
const SK_CURR = 'cbs_curr_user';
const SK_LANG = 'cbs_lang';

/* ── Validation Utilities (核心修复：严格的数据清洗墙) ─────────────── */

// 检查单个 SoundState 是否有效，如果缺失关键属性或类型不符，直接抛弃
const isValidSoundState = (s: any): s is SoundState => {
  if (!s || typeof s !== 'object') return false;
  if (typeof s.id !== 'number' || isNaN(s.id)) return false;
  if (typeof s.volume !== 'number' || isNaN(s.volume)) return false;
  if (typeof s.isPlaying !== 'boolean') return false;
  return true;
};

// 重建 Sound 数组，遇到非法状态数据会重置回默认值
const reconstructSounds = (states?: any[]): Sound[] => {
  const safeStates = Array.isArray(states) ? states.filter(isValidSoundState) : [];
  return SOUNDS_DATA.map(d => {
    const s = safeStates.find(x => x.id === d.id);
    return {
      ...d,
      volume: s ? Math.max(0, Math.min(100, s.volume)) : 50,
      isPlaying: s ? s.isPlaying : false
    };
  });
};

/* ── Utilities ─────────────────────────────────────────────────────────── */

const hashPwd = (p: string) => SHA256(p).toString();
const safeParse = <T>(k: string, def: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : def;
  } catch { return def; }
};

const freshSounds = (): Sound[] => SOUNDS_DATA.map(s => ({ ...s, volume: 50, isPlaying: false }));
const mapIds = (s: SoundState[]) => s.filter(x => x.isPlaying).map(x => x.id);

let howls: Record<number, Howl> = {};

const initAudio = (id: number, url: string, loop = true) => {
  if (!howls[id]) {
    howls[id] = new Howl({ src: [url], loop, html5: true, preload: true, volume: 0 });
  }
  return howls[id];
};

const updateAudioVol = (id: number, vol: number, isPlaying: boolean, globalVol: number, globalPlay: boolean, muted: boolean) => {
  const h = howls[id];
  if (!h) return;
  const target = (isPlaying && globalPlay && !muted) ? (vol / 100) * (globalVol / 100) : 0;
  
  if (target > 0) {
    if (!h.playing()) {
      h.volume(0);
      h.play();
      h.fade(0, target, 500);
    } else {
      h.fade(h.volume(), target, 200);
    }
  } else {
    if (h.playing()) {
      h.fade(h.volume(), 0, 500);
      h.once('fade', () => { if (h.volume() === 0) h.pause(); });
    }
  }
};

const stopAll = () => Object.values(howls).forEach(h => { h.fade(h.volume(), 0, 500); h.once('fade', () => h.stop()); });

const syncAudio = (s: AppState) => {
  s.sounds.forEach(snd => updateAudioVol(snd.id, snd.volume, snd.isPlaying, s.globalVolume, s.isGlobalPlaying, s.isMuted));
};

const toStates = (sounds: Sound[]): SoundState[] =>
  sounds.map(s => ({ id: s.id, volume: s.volume, isPlaying: s.isPlaying }));

/* ── Store ─────────────────────────────────────────────────────────────── */

const INITIAL_LANG: Lang = (localStorage.getItem(SK_LANG) as Lang) || 'ca';
const RESET_STATE = { globalVolume: 100, isGlobalPlaying: false, isMuted: false, isTimerActive: false, timerDuration: 0, initialTimerDuration: 0, lastActiveIds: [] };

export const useSoundStore = create<AppState>((set, get) => {
  // 从 LocalStorage 中读取用户信息和偏好
  const savedUser = safeParse<User | null>(SK_CURR, null);
  
  // 严格重构 sounds 数组，防止脏数据注入
  let initialSounds = freshSounds();
  if (savedUser?.preferences?.soundStates) {
     initialSounds = reconstructSounds(savedUser.preferences.soundStates);
  }

  const fromPrefs = (p: UserPreferences) => ({
    globalVolume: typeof p.globalVolume === 'number' ? Math.max(0, Math.min(100, p.globalVolume)) : 100,
    timerDuration: typeof p.timerDuration === 'number' ? Math.max(0, p.timerDuration) : 0,
    initialTimerDuration: typeof p.timerDuration === 'number' ? Math.max(0, p.timerDuration) : 0,
    sounds: reconstructSounds(p.soundStates),
    lastActiveIds: Array.isArray(p.lastActiveIds) ? p.lastActiveIds.filter(id => typeof id === 'number') : [],
  });

  const update = (patch: Partial<AppState>) => {
    set(s => {
      const next = { ...s, ...patch };
      if (next.user && Object.keys(patch).some(k => ['sounds', 'globalVolume', 'timerDuration', 'lastActiveIds'].includes(k))) {
        next.user = {
          ...next.user,
          preferences: {
            globalVolume: next.globalVolume,
            timerDuration: next.timerDuration,
            soundStates: toStates(next.sounds),
            lastActiveIds: next.lastActiveIds,
            customPresets: next.user.preferences?.customPresets,
          }
        };
        // 保存时去除所有敏感信息（如密码）并深度验证
        const users = safeParse<User[]>(SK_USERS, []);
        const idx = users.findIndex(u => u.username === next.user?.username);
        if (idx !== -1) {
           users[idx] = { ...users[idx], preferences: next.user.preferences };
           localStorage.setItem(SK_USERS, JSON.stringify(users));
        }
        localStorage.setItem(SK_CURR, JSON.stringify(next.user));
      }
      syncAudio(next);
      return next;
    });
  };

  return {
    ...RESET_STATE,
    user: savedUser,
    isLoggedIn: !!savedUser,
    isLoginModalOpen: false,
    isShareModalOpen: false,
    lang: INITIAL_LANG,
    sounds: initialSounds,
    ...(savedUser?.preferences ? fromPrefs(savedUser.preferences) : {}),

    setLang: l => { localStorage.setItem(SK_LANG, l); set({ lang: l }); },
    
    toggleSound: id => update({
      sounds: get().sounds.map(s => s.id === id ? { ...s, isPlaying: !s.isPlaying } : s),
      isGlobalPlaying: true
    }),
    
    updateSoundVolume: (id, v) => update({
      sounds: get().sounds.map(s => s.id === id ? { ...s, volume: Math.max(0, Math.min(100, v)) } : s)
    }),
    
    toggleGlobalPlay: () => {
      const s = get();
      if (!s.isGlobalPlaying && s.sounds.every(x => !x.isPlaying) && s.lastActiveIds.length) {
        update({ isGlobalPlaying: true, sounds: s.sounds.map(snd => s.lastActiveIds.includes(snd.id) ? { ...snd, isPlaying: true } : snd) });
      } else {
        update({ isGlobalPlaying: !s.isGlobalPlaying, lastActiveIds: s.isGlobalPlaying ? mapIds(s.sounds) : s.lastActiveIds });
      }
    },
    
    updateGlobalVolume: v => update({ globalVolume: Math.max(0, Math.min(100, v)) }),
    
    toggleMute: () => update({ isMuted: !get().isMuted }),
    
    setTimerDuration: m => update({ timerDuration: m * 60, initialTimerDuration: m * 60, isTimerActive: m > 0 }),
    
    tick: () => {
      const s = get();
      if (s.timerDuration <= 0) return;
      if (s.timerDuration === 1) update({ timerDuration: 0, isTimerActive: false, isGlobalPlaying: false, lastActiveIds: mapIds(s.sounds), sounds: s.sounds.map(snd => ({ ...snd, isPlaying: false })) });
      else update({ timerDuration: s.timerDuration - 1 });
    },
    
    applyPreset: p => update({
      isGlobalPlaying: true,
      sounds: get().sounds.map(s => PRESETS[p][s.id] !== undefined ? { ...s, isPlaying: true, volume: PRESETS[p][s.id]! } : { ...s, isPlaying: false })
    }),

    applyCustomPreset: slot => {
      const s = get();
      const cp = s.user?.preferences?.customPresets?.[slot];
      if (!cp) return;
      update({
        isGlobalPlaying: true,
        sounds: s.sounds.map(snd => cp[snd.id] !== undefined ? { ...snd, isPlaying: true, volume: cp[snd.id] } : { ...snd, isPlaying: false })
      });
    },

    saveCustomPreset: slot => {
      const s = get();
      if (!s.user) return;
      const act = s.sounds.filter(snd => snd.isPlaying);
      if (!act.length) return;
      const conf = act.reduce((acc, snd) => ({ ...acc, [snd.id]: snd.volume }), {} as Record<number, number>);
      
      const newPrefs = { ...s.user.preferences, customPresets: { ...(s.user.preferences?.customPresets || {}), [slot]: conf } } as UserPreferences;
      
      const u = { ...s.user, preferences: newPrefs };
      set({ user: u });
      
      const users = safeParse<User[]>(SK_USERS, []);
      const idx = users.findIndex(usr => usr.username === u.username);
      if (idx !== -1) {
        users[idx] = u;
        localStorage.setItem(SK_USERS, JSON.stringify(users));
      }
      localStorage.setItem(SK_CURR, JSON.stringify(u));
    },

    clearCustomPreset: slot => {
      const s = get();
      if (!s.user || !s.user.preferences?.customPresets) return;
      const cps = { ...s.user.preferences.customPresets };
      delete cps[slot];
      
      const newPrefs = { ...s.user.preferences, customPresets: cps };
      const u = { ...s.user, preferences: newPrefs };
      set({ user: u });
      
      const users = safeParse<User[]>(SK_USERS, []);
      const idx = users.findIndex(usr => usr.username === u.username);
      if (idx !== -1) {
        users[idx] = u;
        localStorage.setItem(SK_USERS, JSON.stringify(users));
      }
      localStorage.setItem(SK_CURR, JSON.stringify(u));
    },
    
    applyRandomMix: () => {
      const mix: Record<number, number> = {};
      const count = Math.floor(Math.random() * 3) + 2;
      const available = [...SOUNDS_DATA.map(d => d.id)];
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * available.length);
        mix[available[idx]] = Math.floor(Math.random() * 60) + 20;
        available.splice(idx, 1);
      }
      update({
        isGlobalPlaying: true,
        sounds: get().sounds.map(s => mix[s.id] !== undefined ? { ...s, isPlaying: true, volume: mix[s.id] } : { ...s, isPlaying: false })
      });
    },

    resetMix: () => update({
      isGlobalPlaying: false,
      sounds: get().sounds.map(s => ({ ...s, isPlaying: false, volume: 50 }))
    }),
    
    applyUrlMix: qs => {
      const p = new URLSearchParams(qs);
      const m = p.get('m');
      if (!m) return;
      try {
        const d = JSON.parse(atob(m));
        if (typeof d !== 'object') return;
        update({
          isGlobalPlaying: true,
          sounds: get().sounds.map(s => d[s.id] !== undefined ? { ...s, isPlaying: true, volume: Math.max(0, Math.min(100, Number(d[s.id]))) } : { ...s, isPlaying: false })
        });
      } catch (e) {}
    },
    
    login: (u, p) => {
      if (!p) return false;
      const found = safeParse<User[]>(SK_USERS, []).find(usr => usr.username === u && usr.password === hashPwd(p));
      if (!found) return false;
      
      // 登录时清洗旧偏好数据
      let cleanPrefs = {};
      if (found.preferences) {
        cleanPrefs = {
          globalVolume: typeof found.preferences.globalVolume === 'number' ? found.preferences.globalVolume : 100,
          timerDuration: typeof found.preferences.timerDuration === 'number' ? found.preferences.timerDuration : 0,
          soundStates: toStates(reconstructSounds(found.preferences.soundStates)),
          lastActiveIds: Array.isArray(found.preferences.lastActiveIds) ? found.preferences.lastActiveIds : [],
          customPresets: found.preferences.customPresets
        };
      }
      
      const safeUser = { ...found, preferences: cleanPrefs as UserPreferences };
      set({ user: safeUser, isLoggedIn: true, isLoginModalOpen: false, ...(safeUser.preferences ? fromPrefs(safeUser.preferences) : {}) });
      if (safeUser.preferences) get().rehydrateAudio();
      localStorage.setItem(SK_CURR, JSON.stringify(safeUser));
      return true;
    },
    
    register: (u, p) => {
      if (!p) return false;
      const users = safeParse<User[]>(SK_USERS, []);
      if (users.some(usr => usr.username === u)) return false;
      const nu: User = { id: Date.now().toString(), username: u, password: hashPwd(p) };
      users.push(nu);
      localStorage.setItem(SK_USERS, JSON.stringify(users));
      localStorage.setItem(SK_CURR, JSON.stringify(nu));
      set({ user: nu, isLoggedIn: true, isLoginModalOpen: false, lastActiveIds: [], timerDuration: 0, sounds: freshSounds() });
      return true;
    },
    
    logout: () => {
      stopAll();
      localStorage.removeItem(SK_CURR);
      set({ user: null, isLoggedIn: false, sounds: freshSounds(), ...RESET_STATE });
    },
    
    deleteAccount: () => {
      const { user, logout } = get();
      if (!user) return;
      localStorage.setItem(SK_USERS, JSON.stringify(safeParse<User[]>(SK_USERS, []).filter(u => u.username !== user.username)));
      logout();
    },
    
    toggleLoginModal: o => set({ isLoginModalOpen: o }),
    toggleShareModal: o => set({ isShareModalOpen: o }),
    rehydrateAudio: () => { get().sounds.forEach(s => initAudio(s.id, s.audioUrl)); syncAudio(get()); },
  };
});

// Initialize audio context lazily on first user interaction
const initCtx = () => {
  Howler.ctx || (Howler.ctx = new (window.AudioContext || (window as any).webkitAudioContext)());
  useSoundStore.getState().rehydrateAudio();
  ['click', 'touchstart', 'keydown'].forEach(e => document.removeEventListener(e, initCtx));
};
if (typeof document !== 'undefined') {
  ['click', 'touchstart', 'keydown'].forEach(e => document.addEventListener(e, initCtx, { once: true }));
}