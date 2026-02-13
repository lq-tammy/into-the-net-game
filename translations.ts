
import { TranslationStrings } from './types';

export const translations: Record<string, TranslationStrings> = {
  zh: {
    title: '自投罗网',
    start: '开始游戏',
    score: '得分',
    ammo: '弹药',
    gameOver: '任务失败',
    win: '人类胜利',
    restart: '再玩一次',
    language: '语言',
    round: '波次',
    mission: '保卫城市，阻击鸟族',
    instructions: '点击屏幕发射捕鸟网拦截飞鸟',
  },
  en: {
    title: 'Into The Net',
    start: 'Start Game',
    score: 'Score',
    ammo: 'Ammo',
    gameOver: 'Mission Failed',
    win: 'Humanity Wins',
    restart: 'Play Again',
    language: 'Language',
    round: 'Wave',
    mission: 'Protect cities from the bird invasion',
    instructions: 'Click to launch nets and intercept birds',
  },
  es: {
    title: 'Hacia la Red',
    start: 'Empezar',
    score: 'Puntos',
    ammo: 'Munición',
    gameOver: 'Misión Fallida',
    win: 'Victoria Humana',
    restart: 'Jugar de nuevo',
    language: 'Idioma',
    round: 'Oleada',
    mission: 'Protege las ciudades de la invasión de aves',
    instructions: 'Haz clic para lanzar redes e interceptar aves',
  }
};
