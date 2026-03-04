// 文件路径: src/stores/useSoundStore.ts
import { create } from 'zustand';
import { Howl } from 'howler';
import SHA256 from 'crypto-js/sha256';

import rainFile  from '../sounds/rain-on-grasst.mp3';
import wavesFile from '../sounds/waves.mp3';
import fireFile  from '../sounds/bonfire.mp3';
import windFile  from '../sounds/wind.mp3';
import birdFile  from '../sounds/bird.mp3';

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface SoundState { id: number; volume: number; isPlaying: boolean }
export interface UserPreferences { 
  globalVolume: number; 
  timerDuration: number; 
  soundStates: SoundState[]; 
  lastActiveIds: number[];
  customPresets?: Record<number, Record<number, number>>; // 新增：保存自定义混音槽位
}
export interface Sound extends SoundState { name: string; name_es: string; name_ca: string; category: string; icon: string; audioUrl: string }
export interface User { id: string; username: string; password?: string; preferences?: UserPreferences }
export type PresetType = 'focus' | 'relax' | 'sleep';
export type Lang = 'ca' | 'es';

export interface AppState {
  sounds: Sound[]; globalVolume: number; isGlobalPlaying: boolean;
  timerDuration: number; isTimerActive: boolean;
  user: User | null; isLoggedIn: boolean; isLoginModalOpen: boolean;
  lastActiveIds: number[]; lang: Lang;
  _savePreferences: () => void;
  tick:              () => void;
  rehydrateAudio:    () => void;
  toggleSound:       (id: number) => void;
  updateSoundVolume: (id: number, vol: number) => void;
  toggleGlobalPlay:  () => void;
  updateGlobalVolume:(vol: number) => void;
  setTimerDuration:  (m: number) => void;
  toggleTimer:       () => void;
  applyPreset:       (type: PresetType) => void;
  saveCustomPreset:  (slot: number) => void; // 新增：保存专属预设
  applyCustomPreset: (slot: number) => void; // 新增：应用专属预设
  clearCustomPreset: (slot: number) => void; // 新增：清除专属预设
  applyUrlMix:       (qs: string) => void;
  resetMix:          () => void;
  login:             (u: string, p?: string) => boolean;
  register:          (u: string, p?: string) => boolean;
  logout:            () => void;
  deleteAccount:     () => void;
  toggleLoginModal:  (open?: boolean) => void;
  setLang:           (lang: Lang) => void;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const SK_USERS = 'silence_users_db';
const SK_CURR  = 'silence_curr_user';
const SK_LANG  = 'silence_global_lang';

const NAME_TO_ID: Record<string, number> = { rain: 1, waves: 3, fire: 5, wind: 6, birds: 7 };

const BASE: Omit<Sound, 'isPlaying' | 'volume'>[] = [
  { id: 1, name: 'Rain',  name_es: 'LLUVIA DE LA PRADERA', name_ca: 'PLUJA DE LA PRADERIA', category: 'nature', icon: '🌿', audioUrl: rainFile  },
  { id: 3, name: 'Waves', name_es: 'MAREA SERENA',         name_ca: 'MAREA SERENA',         category: 'nature', icon: '🌊', audioUrl: wavesFile },
  { id: 5, name: 'Fire',  name_es: 'HOGUERA INVERNAL',     name_ca: 'FOGUERA HIVERNAL',     category: 'nature', icon: '🔥', audioUrl: fireFile  },
  { id: 6, name: 'Wind',  name_es: 'BRISA DEL VALLE',      name_ca: 'BRISA DE LA VALL',     category: 'nature', icon: '💨', audioUrl: windFile  },
  { id: 7, name: 'Birds', name_es: 'CANTO DEL ALBA',       name_ca: "CANT DE L'ALBA",       category: 'nature', icon: '🕊️', audioUrl: birdFile  },
];

const PRESETS: Record<PresetType, { vols: Record<number, number>; time: number }> = {
  focus: { vols: { 1: 65, 6: 35 }, time: 60 },
  relax: { vols: { 3: 50, 7: 40 }, time: 30 },
  sleep: { vols: { 5: 45, 1: 30 }, time: 60 },
};

/* ── Helpers (Fade Logic) ──────────────────────────────────────────────── */

const howls: Record<number, Howl> = {};
const mixVol = (s: number, g: number) => s * g / 10000;
const hashPwd = (p: string) => SHA256(p).toString();
const FADE_DUR = 2000;

const playHowl = (h: Howl, targetVol: number) => {
  h.off('fade');
  if (!h.playing()) {
    h.volume(0);
    h.play();
  }
  h.fade(h.volume(), targetVol, FADE_DUR);
};

const stopHowl = (h: Howl) => {
  h.off('fade');
  if (h.playing()) {
    h.fade(h.volume(), 0, FADE_DUR);
    h.once('fade', () => {
      if (h.volume() <= 0.01) h.stop();
    });
  }
};

const safeParse = <T,>(key: string, fb: T): T => {
  try { return JSON.parse(localStorage.getItem(key)!) || fb; } catch { return fb; }
};

const freshSounds = (): Sound[] =>
  BASE.map(s => ({ ...s, volume: 50, isPlaying: false }));

const stopAll = () => {
  Object.values(howls).forEach(stopHowl);
};

const ensureHowl = (id: number, url: string, vol: number, gVol: number): Howl => {
  if (!howls[id]) howls[id] = new Howl({ src: [url], html5: false, loop: true, volume: mixVol(vol, gVol) });
  return howls[id];
};

const mapSounds = (sounds: Sound[], fn: (s: Sound) => Partial<Sound>): Sound[] =>
  sounds.map(s => ({ ...s, ...fn(s) }));

const fromPrefs = (prefs: UserPreferences) => {
  const sounds: Sound[] = BASE.map(def => {
    const saved = prefs.soundStates?.find(st => st.id === def.id);
    return saved ? { ...def, ...saved } : { ...def, volume: 50, isPlaying: false };
  });
  return {
    globalVolume: prefs.globalVolume,
    timerDuration: prefs.timerDuration || 15,
    sounds,
    isGlobalPlaying: sounds.some(s => s.isPlaying),
    lastActiveIds: prefs.lastActiveIds || [],
  };
};

const persistUser = (user: User) => {
  const users: User[] = safeParse(SK_USERS, []);
  const idx = users.findIndex(u => u.username === user.username);
  if (idx === -1) return;
  users[idx] = user;
  localStorage.setItem(SK_USERS, JSON.stringify(users));
  localStorage.setItem(SK_CURR,  JSON.stringify(user));
};

const restoreState = () => {
  const user = safeParse<User | null>(SK_CURR, null);
  const lang = safeParse<Lang>(SK_LANG, 'ca');
  const base = { user, lang, isLoggedIn: !!user };
  return user?.preferences
    ? { ...base, isLoggedIn: true, ...fromPrefs(user.preferences) }
    : { ...base, globalVolume: 80, timerDuration: 15, sounds: freshSounds(), isGlobalPlaying: false, lastActiveIds: [] as number[] };
};

/* ── Store ─────────────────────────────────────────────────────────────── */

export const useSoundStore = create<AppState>((set, get) => ({
  ...restoreState(),
  isTimerActive: false,
  isLoginModalOpen: false,

  _savePreferences() {
    const { user, sounds, globalVolume, timerDuration, isLoggedIn, lastActiveIds } = get();
    if (!isLoggedIn || !user) return;
    persistUser({
      ...user,
      preferences: {
        globalVolume, timerDuration, lastActiveIds,
        soundStates: sounds.map(({ id, volume, isPlaying }): SoundState => ({ id, volume, isPlaying })),
        customPresets: user.preferences?.customPresets, // 确保自定义槽位不被覆盖
      },
    });
  },

  tick() {
    const { timerDuration, isTimerActive, sounds } = get();
    if (!isTimerActive) return;
    if (timerDuration <= 1 / 60) {
      stopAll();
      set({ timerDuration: 0, isTimerActive: false, isGlobalPlaying: false, sounds: mapSounds(sounds, () => ({ isPlaying: false })) });
    } else {
      set({ timerDuration: timerDuration - 1 / 60 });
    }
  },

  rehydrateAudio() {
    const { sounds, globalVolume } = get();
    sounds.forEach(s => {
      if (s.isPlaying && s.audioUrl) {
        const h = ensureHowl(s.id, s.audioUrl, s.volume, globalVolume);
        playHowl(h, mixVol(s.volume, globalVolume));
      }
    });
  },

  toggleSound(id) {
    const { sounds, globalVolume } = get();
    if (!sounds.find(s => s.id === id)?.audioUrl) return;
    set(state => {
      const upd = state.sounds.map(s => {
        if (s.id !== id) return s;
        const playing = !s.isPlaying;
        const h = ensureHowl(id, s.audioUrl, s.volume, globalVolume);
        playing ? playHowl(h, mixVol(s.volume, globalVolume)) : stopHowl(h);
        return { ...s, isPlaying: playing };
      });
      return { sounds: upd, isGlobalPlaying: upd.some(s => s.isPlaying) };
    });
    get()._savePreferences();
  },

  updateSoundVolume(id, vol) {
    howls[id]?.volume(mixVol(vol, get().globalVolume));
    set(state => ({ sounds: state.sounds.map(s => s.id === id ? { ...s, volume: vol } : s) }));
    get()._savePreferences();
  },

  updateGlobalVolume(vol) {
    set({ globalVolume: vol });
    get().sounds.forEach(s => { howls[s.id]?.volume(mixVol(s.volume, vol)); });
    get()._savePreferences();
  },

  setTimerDuration(m) {
    set({ timerDuration: m, isTimerActive: m > 0 });
    get()._savePreferences();
  },

  toggleTimer() {
    const { isTimerActive, timerDuration } = get();
    set({ isTimerActive: !isTimerActive && timerDuration > 0 });
  },

  toggleGlobalPlay() {
    const { isGlobalPlaying, sounds, lastActiveIds } = get();
    if (isGlobalPlaying) {
      const curr = sounds.filter(s => s.isPlaying).map(s => s.id);
      stopAll();
      set({ isGlobalPlaying: false, isTimerActive: false, sounds: mapSounds(sounds, () => ({ isPlaying: false })), lastActiveIds: curr.length ? curr : lastActiveIds });
    } else {
      const ids = lastActiveIds?.length ? lastActiveIds : [1];
      set({ isGlobalPlaying: true, sounds: mapSounds(sounds, s => ({ isPlaying: ids.includes(s.id) })) });
      get().rehydrateAudio();
    }
    get()._savePreferences();
  },

  applyPreset(type) {
    const conf = PRESETS[type];
    if (!conf) return;
    stopAll();
    set({
      sounds: mapSounds(get().sounds, s => ({ isPlaying: s.id in conf.vols, volume: conf.vols[s.id] ?? s.volume })),
      isGlobalPlaying: true, isTimerActive: true, timerDuration: conf.time,
      lastActiveIds: Object.keys(conf.vols).map(Number),
    });
    get().rehydrateAudio();
    get()._savePreferences();
  },

  // ── 新增：自定义预设逻辑 ──────────────────────────────────────────────
  saveCustomPreset(slot) {
    const { user, sounds } = get();
    if (!user) return;
    
    const active = sounds.filter(s => s.isPlaying);
    if (!active.length) return; // 没有声音时不保存

    const vols: Record<number, number> = {};
    active.forEach(s => vols[s.id] = s.volume);

    const prefs = user.preferences || { globalVolume: 80, timerDuration: 15, soundStates: [], lastActiveIds: [] };
    const customPresets = { ...(prefs.customPresets || {}), [slot]: vols };

    set({ user: { ...user, preferences: { ...prefs, customPresets } } });
    get()._savePreferences();
  },

  applyCustomPreset(slot) {
    const { user, sounds } = get();
    const vols = user?.preferences?.customPresets?.[slot];
    if (!vols) return;

    stopAll();
    set({
      sounds: mapSounds(sounds, s => ({ isPlaying: s.id in vols, volume: vols[s.id] ?? s.volume })),
      isGlobalPlaying: true,
      lastActiveIds: Object.keys(vols).map(Number),
    });
    get().rehydrateAudio();
    get()._savePreferences();
  },

  clearCustomPreset(slot) {
    const { user } = get();
    if (!user?.preferences?.customPresets) return;
    
    const prefs = user.preferences;
    const customPresets = { ...prefs.customPresets };
    delete customPresets[slot];
    
    set({ user: { ...user, preferences: { ...prefs, customPresets } } });
    get()._savePreferences();
  },
  // ───────────────────────────────────────────────────────────────────────

  applyUrlMix(qs) {
    if (!qs) return;
    const params = new URLSearchParams(qs);
    const vols: Record<number, number> = {};
    params.forEach((val, key) => {
      const id = NAME_TO_ID[key.toLowerCase()];
      if (!id) return;
      const v = parseInt(val, 10);
      if (!isNaN(v) && v >= 0 && v <= 100) vols[id] = v;
    });
    if (!Object.keys(vols).length) return;
    stopAll();
    set(state => ({
      sounds: mapSounds(state.sounds, s => ({ isPlaying: s.id in vols, volume: s.id in vols ? vols[s.id] : s.volume })),
      isGlobalPlaying: true, lastActiveIds: Object.keys(vols).map(Number),
    }));
    get().rehydrateAudio();
    get()._savePreferences();
  },

  resetMix() {
    stopAll();
    set({
      sounds: mapSounds(get().sounds, () => ({ isPlaying: false, volume: 50 })),
      globalVolume: 80, isGlobalPlaying: false, isTimerActive: false, timerDuration: 15, lastActiveIds: [],
    });
    get()._savePreferences();
  },

  login(u, p) {
    if (!p) return false;
    const found = safeParse<User[]>(SK_USERS, []).find(
      usr => usr.username === u && usr.password === hashPwd(p),
    );
    if (!found) return false;
    set({ user: found, isLoggedIn: true, isLoginModalOpen: false, ...(found.preferences ? fromPrefs(found.preferences) : {}) });
    if (found.preferences) get().rehydrateAudio();
    localStorage.setItem(SK_CURR, JSON.stringify(found));
    return true;
  },

  register(u, p) {
    if (!p) return false;
    const users = safeParse<User[]>(SK_USERS, []);
    if (users.some(usr => usr.username === u)) return false;
    const nu: User = { id: Date.now().toString(), username: u, password: hashPwd(p) };
    users.push(nu);
    localStorage.setItem(SK_USERS, JSON.stringify(users));
    localStorage.setItem(SK_CURR,  JSON.stringify(nu));
    set({ user: nu, isLoggedIn: true, isLoginModalOpen: false, lastActiveIds: [], timerDuration: 15 });
    return true;
  },

  logout() {
    stopAll();
    localStorage.removeItem(SK_CURR);
    set({ user: null, isLoggedIn: false, sounds: freshSounds(), globalVolume: 80, isGlobalPlaying: false, timerDuration: 15, isTimerActive: false, lastActiveIds: [] });
  },

  deleteAccount() {
    const { user, logout } = get();
    if (!user) return;
    const users = safeParse<User[]>(SK_USERS, []).filter(u => u.username !== user.username);
    localStorage.setItem(SK_USERS, JSON.stringify(users));
    logout();
  },

  toggleLoginModal(open?) {
    set(s => ({ isLoginModalOpen: open ?? !s.isLoginModalOpen }));
  },

  setLang(lang) {
    localStorage.setItem(SK_LANG, JSON.stringify(lang));
    set({ lang });
  },
}));