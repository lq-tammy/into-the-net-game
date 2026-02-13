
export type Language = 'zh' | 'en' | 'es';

export interface Point {
  x: number;
  y: number;
}

export type BirdType = 'small' | 'medium' | 'large';

export interface Bird extends Point {
  id: string;
  targetX: number;
  targetY: number;
  speed: number;
  type: BirdType;
  radius: number;
  points: number;
  color: string;
  isHit: boolean;
}

export interface Net extends Point {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  radius: number;
  isExploding: boolean;
  explosionRadius: number;
  maxExplosionRadius: number;
  explosionTimer: number;
}

export interface Launcher extends Point {
  id: number;
  ammo: number;
  maxAmmo: number;
  isDestroyed: boolean;
}

export interface City extends Point {
  id: number;
  isDestroyed: boolean;
}

export interface GameState {
  score: number;
  round: number;
  isGameOver: boolean;
  isWin: boolean;
  isPaused: boolean;
}

export interface TranslationStrings {
  title: string;
  start: string;
  score: string;
  ammo: string;
  gameOver: string;
  win: string;
  restart: string;
  language: string;
  round: string;
  mission: string;
  instructions: string;
}
