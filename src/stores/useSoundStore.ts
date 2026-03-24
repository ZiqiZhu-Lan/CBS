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
  timerDuration: number; isTimerActive: boolean;
  user: User | null; isLoggedIn: boolean; isLoginModalOpen: boolean;
  lastActiveIds: number[]; lang: Lang;
  isMuted: boolean; prevVolume: number;
  _savePreferences: () => void;
  tick: () => void;
  rehydrateAudio: () => void;
  toggleSound: (id: number) => void;
  updateSoundVolume: (id: number, vol: number) => void;
  toggleGlobalPlay: () => void;
  toggleMute: () => void;
  updateGlobalVolume: (vol: number) => void;
  setTimerDuration: (m: number) => void;
  applyPreset: (type: PresetType) => void;
  saveCustomPreset: (slot: number) => void;
  applyCustomPreset: (slot: number) => void;
  clearCustomPreset: (slot: number) => void;
  applyUrlMix: (qs: string) => void;
  resetMix: () => void;
  login: (u: string, p?: string) => boolean;
  register: (u: string, p?: string) => boolean;
  logout: () => void;
  deleteAccount: () => void;
  toggleLoginModal: (open?: boolean) => void;
  setLang: (lang: Lang) => void;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const SK_USERS = 'silence_users_db';
const SK_CURR = 'silence_curr_user';
const SK_LANG = 'silence_global_lang';
const FADE_DUR = 2000;
const NAME_TO_ID: Record<string, number> = { rain: 1, cricket: 2, waves: 3, thunder: 4, fire: 5, wind: 6, birds: 7, woodcrack: 8 };

const BASE: Omit<Sound, 'isPlaying' | 'volume'>[] = [
  { id: 1, name: 'Rain', name_es: 'LLUVIA DE LA PRADERA', name_ca: 'PLUJA DE LA PRADERIA', audioUrl: rainFile },
  { id: 2, name: 'Cricket', name_es: 'NOCHE DE GRILLOS', name_ca: 'NIT DE GRILLS', audioUrl: cricketFile },
  { id: 3, name: 'Waves', name_es: 'MAREA SERENA', name_ca: 'MAREA SERENA', audioUrl: wavesFile },
  { id: 4, name: 'Thunder', name_es: 'TORMENTA LEJANA', name_ca: 'TEMPESTA LLUNYANA', audioUrl: thunderFile },
  { id: 5, name: 'Fire', name_es: 'HOGUERA INVERNAL', name_ca: 'FOGUERA HIVERNAL', audioUrl: fireFile },
  { id: 6, name: 'Wind', name_es: 'BRISA DEL VALLE', name_ca: 'BRISA DE LA VALL', audioUrl: windFile },
  { id: 7, name: 'Birds', name_es: 'CANTO DEL ALBA', name_ca: "CANT DE L'ALBA", audioUrl: birdFile },
  { id: 8, name: 'Woodcrack', name_es: 'SUSPIROS DE MADERA', name_ca: 'SOSPIRS DE FUSTA', audioUrl: woodcrackFile },
];

const PRESETS: Record<PresetType, { vols: Record<number, number>; time: number }> = {
  focus: { vols: { 1: 65, 6: 35 }, time: 60 },
  relax: { vols: { 3: 50, 7: 40 }, time: 30 },
  sleep: { vols: { 5: 45, 1: 30 }, time: 60 },
  meditate: { vols: { 6: 45, 7: 35, 8: 15 }, time: 15 },
  reading: { vols: { 1: 55, 5: 60, 4: 20 }, time: 45 },
};

/* ── Audio Helpers ─────────────────────────────────────────────────────── */

const howls: Record<number, Howl> = {};
const mixVol = (s: number, g: number) => (s * g) / 10000;
const hashPwd = (p: string) => SHA256(p).toString();
const safeParse = <T,>(key: string, fb: T): T => { try { return JSON.parse(localStorage.getItem(key)!) || fb; } catch { return fb; } };
const freshSounds = (): Sound[] => BASE.map(s => ({ ...s, volume: 50, isPlaying: false }));
const mapSounds = (sounds: Sound[], fn: (s: Sound) => Partial<Sound>): Sound[] => sounds.map(s => ({ ...s, ...fn(s) }));

const playHowl = (h: Howl, targetVol: number) => {
  h.off('fade');
  if (!h.playing()) { h.volume(0); h.play(); }
  h.fade(h.volume(), targetVol, FADE_DUR);
};

const stopHowl = (h: Howl) => {
  h.off('fade');
  if (h.playing()) {
    h.fade(h.volume(), 0, FADE_DUR);
    h.once('fade', () => { if (h.volume() <= 0.01) h.stop(); });
  }
};

const stopAll = () => Object.values(howls).forEach(stopHowl);

const ensureHowl = (id: number, url: string, vol: number, gVol: number): Howl => {
  if (!howls[id]) howls[id] = new Howl({ src: [url], html5: false, loop: true, volume: mixVol(vol, gVol) });
  return howls[id];
};

const fromPrefs = (prefs: UserPreferences) => {
  const sounds = BASE.map(def => ({ ...def, volume: 50, isPlaying: false, ...prefs.soundStates?.find(st => st.id === def.id) }));
  return {
    globalVolume: prefs.globalVolume ?? 80,
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
  localStorage.setItem(SK_CURR, JSON.stringify(user));
};

const restoreState = () => {
  const user = safeParse<User | null>(SK_CURR, null);
  const lang = safeParse<Lang>(SK_LANG, 'ca');
  const base = { user, lang, isLoggedIn: !!user };
  return user?.preferences
    ? { ...base, ...fromPrefs(user.preferences) }
    : { ...base, globalVolume: 80, timerDuration: 15, sounds: freshSounds(), isGlobalPlaying: false, lastActiveIds: [] as number[] };
};

const applyVolConfig = (get: () => AppState, set: (p: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void, vols: Record<number, number>, timer?: { active: boolean; duration: number }) => {
  stopAll();
  set(state => ({
    sounds: mapSounds(state.sounds, s => ({ isPlaying: s.id in vols, volume: vols[s.id] ?? s.volume })),
    isGlobalPlaying: true,
    lastActiveIds: Object.keys(vols).map(Number),
    ...(timer ? { isTimerActive: timer.active, timerDuration: timer.duration } : {}),
  }));
  get().rehydrateAudio();
  get()._savePreferences();
};

/* ── Store ─────────────────────────────────────────────────────────────── */

export const useSoundStore = create<AppState>((set, get) => ({
  ...restoreState(),
  isTimerActive: false,
  isLoginModalOpen: false,
  isMuted: false,
  prevVolume: 80,

  _savePreferences: () => {
    const { isLoggedIn, user, globalVolume, timerDuration, lastActiveIds, sounds } = get();
    if (!isLoggedIn || !user) return;
    persistUser({
      ...user,
      preferences: {
        globalVolume, timerDuration, lastActiveIds,
        soundStates: sounds.map(({ id, volume, isPlaying }) => ({ id, volume, isPlaying })),
        customPresets: user.preferences?.customPresets,
      },
    });
  },

  tick: () => {
    const state = get();
    if (!state.isTimerActive) return;
    if (state.timerDuration <= 1 / 60) {
      stopAll();
      set({ timerDuration: 0, isTimerActive: false, isGlobalPlaying: false, sounds: mapSounds(state.sounds, () => ({ isPlaying: false })) });
    } else {
      set({ timerDuration: state.timerDuration - 1 / 60 });
    }
  },

  rehydrateAudio: () => {
    const { sounds, globalVolume } = get();
    sounds.forEach(s => {
      if (s.isPlaying && s.audioUrl)
        playHowl(ensureHowl(s.id, s.audioUrl, s.volume, globalVolume), mixVol(s.volume, globalVolume));
    });
  },

  toggleSound: (id) => {
    if (!get().sounds.find(s => s.id === id)?.audioUrl) return;
    set(s => {
      const upd = s.sounds.map(track => {
        if (track.id !== id) return track;
        const playing = !track.isPlaying;
        const h = ensureHowl(id, track.audioUrl, track.volume, s.globalVolume);
        playing ? playHowl(h, mixVol(track.volume, s.globalVolume)) : stopHowl(h);
        return { ...track, isPlaying: playing };
      });
      return { sounds: upd, isGlobalPlaying: upd.some(t => t.isPlaying) };
    });
    get()._savePreferences();
  },

  updateSoundVolume: (id, vol) => {
    howls[id]?.volume(mixVol(vol, get().globalVolume));
    set(s => ({ sounds: s.sounds.map(t => t.id === id ? { ...t, volume: vol } : t) }));
    get()._savePreferences();
  },

  toggleMute: () => {
    const { globalVolume, isMuted, prevVolume, sounds } = get();
    const targetVol = isMuted ? (prevVolume > 0 ? prevVolume : 80) : 0;
    set({ prevVolume: isMuted ? prevVolume : globalVolume, globalVolume: targetVol, isMuted: !isMuted });
    sounds.forEach(s => { howls[s.id]?.volume(mixVol(s.volume, targetVol)); });
    get()._savePreferences();
  },

  updateGlobalVolume: (vol) => {
    set({ globalVolume: vol, isMuted: vol === 0 });
    get().sounds.forEach(s => { howls[s.id]?.volume(mixVol(s.volume, vol)); });
    get()._savePreferences();
  },

  setTimerDuration: (m) => {
    set({ timerDuration: m, isTimerActive: m > 0 });
    get()._savePreferences();
  },

  toggleGlobalPlay: () => {
    const state = get();
    if (state.isGlobalPlaying) {
      const curr = state.sounds.filter(s => s.isPlaying).map(s => s.id);
      stopAll();
      set({ isGlobalPlaying: false, isTimerActive: false, sounds: mapSounds(state.sounds, () => ({ isPlaying: false })), lastActiveIds: curr.length ? curr : state.lastActiveIds });
    } else {
      const ids = state.lastActiveIds?.length ? state.lastActiveIds : [1];
      set({ isGlobalPlaying: true, sounds: mapSounds(state.sounds, s => ({ isPlaying: ids.includes(s.id) })) });
      get().rehydrateAudio();
    }
    get()._savePreferences();
  },

  applyPreset: (type) => {
    const conf = PRESETS[type];
    if (conf) applyVolConfig(get, set, conf.vols, { active: true, duration: conf.time });
  },

  saveCustomPreset: (slot) => {
    const { user, sounds } = get();
    if (!user) return;
    const active = sounds.filter(s => s.isPlaying);
    if (!active.length) return;
    const vols = Object.fromEntries(active.map(s => [s.id, s.volume]));
    const prefs = user.preferences || { globalVolume: 80, timerDuration: 15, soundStates: [], lastActiveIds: [] };
    set({ user: { ...user, preferences: { ...prefs, customPresets: { ...(prefs.customPresets || {}), [slot]: vols } } } });
    get()._savePreferences();
  },

  applyCustomPreset: (slot) => {
    const vols = get().user?.preferences?.customPresets?.[slot];
    if (vols) applyVolConfig(get, set, vols);
  },

  clearCustomPreset: (slot) => {
    const { user } = get();
    if (!user?.preferences?.customPresets) return;
    const customPresets = { ...user.preferences.customPresets };
    delete customPresets[slot];
    set({ user: { ...user, preferences: { ...user.preferences, customPresets } } });
    get()._savePreferences();
  },

  applyUrlMix: (qs) => {
    if (!qs) return;
    const vols = Object.fromEntries(
      Array.from(new URLSearchParams(qs).entries())
        .map(([k, v]) => [NAME_TO_ID[k.toLowerCase()], parseInt(v, 10)])
        .filter(([id, v]) => id && !isNaN(v as number) && (v as number) >= 0 && (v as number) <= 100)
    );
    if (Object.keys(vols).length) applyVolConfig(get, set, vols);
  },

  resetMix: () => {
    stopAll();
    set({ sounds: mapSounds(get().sounds, () => ({ isPlaying: false, volume: 50 })), globalVolume: 80, isGlobalPlaying: false, isTimerActive: false, timerDuration: 15, lastActiveIds: [] });
    get()._savePreferences();
  },

  login: (u, p) => {
    if (!p) return false;
    const found = safeParse<User[]>(SK_USERS, []).find(usr => usr.username === u && usr.password === hashPwd(p));
    if (!found) return false;
    set({ user: found, isLoggedIn: true, isLoginModalOpen: false, ...(found.preferences ? fromPrefs(found.preferences) : {}) });
    if (found.preferences) get().rehydrateAudio();
    localStorage.setItem(SK_CURR, JSON.stringify(found));
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
    set({ user: nu, isLoggedIn: true, isLoginModalOpen: false, lastActiveIds: [], timerDuration: 15 });
    return true;
  },

  logout: () => {
    stopAll();
    localStorage.removeItem(SK_CURR);
    set({ user: null, isLoggedIn: false, sounds: freshSounds(), globalVolume: 80, isGlobalPlaying: false, timerDuration: 15, isTimerActive: false, lastActiveIds: [] });
  },

  deleteAccount: () => {
    const { user, logout } = get();
    if (!user) return;
    localStorage.setItem(SK_USERS, JSON.stringify(safeParse<User[]>(SK_USERS, []).filter(u => u.username !== user.username)));
    logout();
  },

  toggleLoginModal: (open?) => set(s => ({ isLoginModalOpen: open ?? !s.isLoginModalOpen })),
  setLang: (lang) => { localStorage.setItem(SK_LANG, JSON.stringify(lang)); set({ lang }); },
}));