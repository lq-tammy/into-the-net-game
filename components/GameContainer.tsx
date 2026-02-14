
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bird, Net, Launcher, City, Language, BirdType } from '../types';
import { translations } from '../translations';

interface Props {
  lang: Language;
  onExit: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  isFeather?: boolean;
  angle?: number;
  swayOffset?: number;
}

interface Building {
  x: number;
  w: number;
  h: number;
  windows: { x: number, y: number }[];
  color: string;
  hasAntenna: boolean;
  roofType: 'flat' | 'sloped' | 'stepped';
}

export const GameContainer: React.FC<Props> = ({ lang, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const skylineRef = useRef<Building[]>([]);

  const gameStateRef = useRef({
    score: 0,
    level: 1,
    isGameOver: false,
    isWin: false,
    birds: [] as Bird[],
    nets: [] as Net[],
    launchers: [] as Launcher[],
    cities: [] as City[],
    particles: [] as Particle[],
    spawnTimer: 0,
    winScoreThreshold: 1200,
    shake: 0,
  });

  const [uiState, setUiState] = useState({
    score: 0,
    level: 1,
    gameOver: false,
    win: false,
    ammo: [0, 0, 0],
    isShaking: false,
  });

  const t = translations[lang];

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSFX = (type: 'launch' | 'explode' | 'hit' | 'miss' | 'win' | 'lose', params?: any) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    switch (type) {
      case 'launch': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(); osc.stop(now + 0.1);
        break;
      }
      case 'hit': {
        // High-pitched "cheer" sound
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(); osc.stop(now + 0.25);
        break;
      }
      case 'miss': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.4);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        g.gain.setValueAtTime(0.06, now);
        g.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.connect(filter); filter.connect(g); g.connect(ctx.destination);
        osc.start(); osc.stop(now + 0.4);
        break;
      }
      case 'explode': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        g.gain.setValueAtTime(0.3, now);
        g.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(); osc.stop(now + 0.2);
        break;
      }
      case 'win': {
        [523, 659, 783, 1046].forEach((f, i) => {
           const o = ctx.createOscillator();
           const g = ctx.createGain();
           o.frequency.setValueAtTime(f, now + i * 0.12);
           g.gain.setValueAtTime(0.08, now + i * 0.12);
           g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.5);
           o.connect(g); g.connect(ctx.destination);
           o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.5);
        });
        break;
      }
      case 'lose': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(30, now + 1.2);
        g.gain.setValueAtTime(0.1, now);
        g.gain.linearRampToValueAtTime(0, now + 1.2);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(); osc.stop(now + 1.2);
        break;
      }
    }
  };

  const initSkyline = (w: number, h: number) => {
    const buildings: Building[] = [];
    const count = 35; // Denser city
    for (let i = 0; i < count; i++) {
      const bW = 40 + Math.random() * 60;
      const bH = 60 + Math.random() * 140;
      const bX = (i / count) * w + (Math.random() - 0.5) * 40;
      const windows = [];
      for (let r = 0; r < bH / 15; r++) {
        for (let c = 0; c < bW / 14; c++) {
          if (Math.random() > 0.3) windows.push({ x: 6 + c * 12, y: 15 + r * 15 });
        }
      }
      buildings.push({
        x: bX,
        w: bW,
        h: bH,
        windows,
        color: `hsl(225, 25%, ${10 + Math.random() * 15}%)`,
        hasAntenna: Math.random() > 0.7,
        roofType: ['flat', 'sloped', 'stepped'][Math.floor(Math.random() * 3)] as any
      });
    }
    skylineRef.current = buildings;
  };

  const spawnFeathers = (x: number, y: number, color: string, count: number) => {
    const g = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 1,
        life: 1.0,
        color,
        isFeather: true,
        angle: Math.random() * Math.PI * 2,
        swayOffset: Math.random() * 100
      });
    }
  };

  const initGame = useCallback((nextLevel = false) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const g = gameStateRef.current;

    const currentLevel = nextLevel ? g.level + 1 : 1;
    g.level = currentLevel;
    g.score = 0;
    g.isGameOver = false;
    g.isWin = false;
    g.birds = [];
    g.nets = [];
    g.particles = [];
    g.spawnTimer = 0;
    g.shake = 0;

    initSkyline(w, h);

    g.launchers = [
      { id: 0, x: w * 0.1, y: h - 60, ammo: 25, maxAmmo: 25, isDestroyed: false },
      { id: 1, x: w * 0.5, y: h - 60, ammo: 50, maxAmmo: 50, isDestroyed: false },
      { id: 2, x: w * 0.9, y: h - 60, ammo: 25, maxAmmo: 25, isDestroyed: false },
    ];
    g.cities = [
      { id: 0, x: w * 0.25, y: h - 40, isDestroyed: false },
      { id: 1, x: w * 0.4, y: h - 40, isDestroyed: false },
      { id: 2, x: w * 0.6, y: h - 40, isDestroyed: false },
      { id: 3, x: w * 0.75, y: h - 40, isDestroyed: false },
    ];

    setUiState({
      score: 0,
      level: currentLevel,
      gameOver: false,
      win: false,
      ammo: g.launchers.map(l => l.ammo),
      isShaking: false,
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        initSkyline(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    initGame();
    return () => window.removeEventListener('resize', handleResize);
  }, [initGame]);

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      const g = gameStateRef.current;
      if (g.isGameOver || g.isWin) return;

      if (g.shake > 0) g.shake *= 0.85;

      const difficultyMult = Math.pow(1.2, g.level - 1);

      g.spawnTimer++;
      const baseSpawnRate = Math.max(8, (70 / difficultyMult) - Math.floor(g.score / 200));
      if (g.spawnTimer >= baseSpawnRate) {
        const w = window.innerWidth;
        const targets = [...g.launchers.filter(l => !l.isDestroyed), ...g.cities.filter(c => !c.isDestroyed)];
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          const rand = Math.random();
          // Image reference colors: Top: Gold, Left: Red, Right: Blue
          let type: BirdType = 'small', radius = 10, points = 15, color = '#60A5FA', speedMult = 0.8; // Small Blue
          if (rand > 0.9) { type = 'large'; radius = 26; points = 50; color = '#FBBF24'; speedMult = 1.7; } // Large Gold
          else if (rand > 0.7) { type = 'medium'; radius = 18; points = 25; color = '#EF4444'; speedMult = 1.2; } // Medium Red
          
          const baseSpeed = (1.5 * difficultyMult);
          g.birds.push({
            id: Math.random().toString(36).substr(2, 9),
            x: Math.random() * w, y: -80, targetX: target.x, targetY: target.y,
            speed: (baseSpeed * speedMult) + (Math.random() * 0.3),
            type, radius, points, color, isHit: false,
          });
        }
        g.spawnTimer = 0;
      }

      for (let i = g.birds.length - 1; i >= 0; i--) {
        const b = g.birds[i];
        const dx = b.targetX - b.x, dy = b.targetY - b.y, dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 10) {
          const l = g.launchers.find(l => !l.isDestroyed && Math.abs(l.x - b.x) < 45);
          if (l) { l.isDestroyed = true; g.shake = 25; playSFX('explode'); }
          const c = g.cities.find(c => !c.isDestroyed && Math.abs(c.x - b.x) < 45);
          if (c) { c.isDestroyed = true; g.shake = 20; playSFX('explode'); }
          g.birds.splice(i, 1);
        } else {
          b.x += (dx / dist) * b.speed;
          b.y += (dy / dist) * b.speed;
        }
      }

      for (let i = g.nets.length - 1; i >= 0; i--) {
        const n = g.nets[i];
        if (!n.isExploding) {
          n.progress += 0.065;
          if (n.progress >= 1) { 
            n.progress = 1; n.isExploding = true; playSFX('explode');
            let hitAny = false;
            for (let j = g.birds.length - 1; j >= 0; j--) {
               const b = g.birds[j];
               const bDist = Math.sqrt((b.x - n.targetX)**2 + (b.y - n.targetY)**2);
               if (bDist < 90) { hitAny = true; break; }
            }
            if (!hitAny) playSFX('miss');
          }
          n.x = n.startX + (n.targetX - n.startX) * n.progress;
          n.y = n.startY + (n.targetY - n.startY) * n.progress;
        } else {
          n.explosionTimer++;
          const duration = 30, t = n.explosionTimer / duration; 
          if (t <= 0.4) n.explosionRadius = 90 * (t / 0.4);
          else if (t <= 1) n.explosionRadius = 90 * (1 - (t - 0.4) / 0.6);
          else { g.nets.splice(i, 1); continue; }

          for (let j = g.birds.length - 1; j >= 0; j--) {
            const b = g.birds[j];
            const bDist = Math.sqrt((b.x - n.x)**2 + (b.y - n.y)**2);
            if (bDist < n.explosionRadius + b.radius) {
              g.score += b.points;
              spawnFeathers(b.x, b.y, b.color, 15);
              playSFX('hit');
              g.birds.splice(j, 1);
            }
          }
        }
      }

      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        if (p.isFeather) {
           p.y += p.vy * 0.45;
           p.x += Math.sin(Date.now() / 250 + (p.swayOffset || 0)) * 2;
           p.angle = (p.angle || 0) + 0.03;
           p.life -= 0.003;
        } else {
           p.x += p.vx; p.y += p.vy;
           p.vy += 0.12; p.life -= 0.025;
        }
        if (p.life <= 0 || p.y > window.innerHeight) g.particles.splice(i, 1);
      }

      if (g.score >= g.winScoreThreshold && !g.isWin) {
        g.isWin = true;
        playSFX('win');
      }
      if ((g.launchers.every(l => l.isDestroyed) || g.cities.every(c => c.isDestroyed)) && !g.isGameOver) {
        g.isGameOver = true;
        playSFX('lose');
      }

      setUiState({
        score: g.score, level: g.level, gameOver: g.isGameOver, win: g.isWin,
        ammo: g.launchers.map(l => l.ammo),
        isShaking: g.shake > 2.5,
      });
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const g = gameStateRef.current;
      const { width: w, height: h } = canvas;

      ctx.save();
      if (g.shake > 0) ctx.translate((Math.random()-0.5)*g.shake, (Math.random()-0.5)*g.shake);
      ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, w, h);

      // Enhanced Skyline
      skylineRef.current.forEach(b => {
        ctx.fillStyle = b.color;
        // Draw building body
        ctx.fillRect(b.x - b.w/2, h - b.h, b.w, b.h);
        
        // Roof styles
        if (b.roofType === 'stepped') {
           ctx.fillRect(b.x - b.w/4, h - b.h - 15, b.w/2, 15);
        } else if (b.roofType === 'sloped') {
           ctx.beginPath();
           ctx.moveTo(b.x - b.w/2, h - b.h);
           ctx.lineTo(b.x, h - b.h - 20);
           ctx.lineTo(b.x + b.w/2, h - b.h);
           ctx.fill();
        }

        // Antenna
        if (b.hasAntenna) {
          ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(b.x, h - b.h); ctx.lineTo(b.x, h - b.h - 30); ctx.stroke();
        }

        // Windows
        ctx.fillStyle = '#facc15'; ctx.globalAlpha = 0.4;
        b.windows.forEach(win => {
           ctx.fillRect(b.x - b.w/2 + win.x, h - b.h + win.y, 5, 5);
        });
        ctx.globalAlpha = 1;
      });

      // Launchers
      g.launchers.forEach((l, idx) => {
        const color = ['#3b82f6', '#8b5cf6', '#3b82f6'][idx];
        if (!l.isDestroyed) {
          ctx.fillStyle = '#334155'; ctx.fillRect(l.x-25, l.y, 50, 60);
          ctx.fillStyle = color; ctx.beginPath(); ctx.arc(l.x, l.y+5, 24, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = color; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(l.x, l.y+5); ctx.lineTo(l.x, l.y-25); ctx.stroke();
        } else {
          ctx.fillStyle = '#0f172a'; ctx.fillRect(l.x-20, l.y+30, 40, 30);
        }
      });

      // Refined Mockingjays based on Reference Pin Image
      g.birds.forEach(b => {
        const angle = Math.atan2(b.targetY - b.y, b.targetX - b.x);
        const flap = Math.sin(Date.now() * (b.type === 'small' ? 0.015 : 0.01)) * b.radius * 0.8;
        
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        
        ctx.shadowBlur = b.type === 'large' ? 18 : 10;
        ctx.shadowColor = b.color;

        // Elegant Forged Tail
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(-b.radius * 0.5, 0);
        ctx.lineTo(-b.radius * 2.5, -b.radius * 0.6);
        ctx.lineTo(-b.radius * 1.8, 0);
        ctx.lineTo(-b.radius * 2.5, b.radius * 0.6);
        ctx.closePath();
        ctx.fill();

        // High Arched Detailed Wings (The signature Pose)
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.radius / 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Wing Up Arc
        ctx.beginPath();
        ctx.moveTo(0, -b.radius * 0.2);
        ctx.bezierCurveTo(b.radius * 0.4, -b.radius * 3.0 - flap, -b.radius * 2.0, -b.radius * 2.5, -b.radius * 1.5, -flap);
        ctx.stroke();
        
        // Wing Down Arc
        ctx.beginPath();
        ctx.moveTo(0, b.radius * 0.2);
        ctx.bezierCurveTo(b.radius * 0.4, b.radius * 3.0 + flap, -b.radius * 2.0, b.radius * 2.5, -b.radius * 1.5, flap);
        ctx.stroke();

        // Individual Feather Details on Wings
        ctx.lineWidth = b.radius / 10;
        for (let i = 1; i <= 4; i++) {
           const fy = i * (b.radius * 0.5);
           ctx.beginPath();
           ctx.moveTo(-b.radius * 0.5, -fy);
           ctx.lineTo(-b.radius * 1.4, -fy - (b.radius * 0.3));
           ctx.stroke();
           ctx.beginPath();
           ctx.moveTo(-b.radius * 0.5, fy);
           ctx.lineTo(-b.radius * 1.4, fy + (b.radius * 0.3));
           ctx.stroke();
        }

        // Aerodynamic Sleek Body
        ctx.beginPath();
        ctx.ellipse(0, 0, b.radius * 1.4, b.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head with prominent Crest
        ctx.beginPath();
        ctx.arc(b.radius * 1.1, -b.radius * 0.1, b.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
        
        // Crest Spikes
        ctx.beginPath();
        ctx.moveTo(b.radius * 0.8, -b.radius * 0.4);
        ctx.lineTo(b.radius * 0.5, -b.radius * 1.2);
        ctx.lineTo(b.radius * 1.2, -b.radius * 0.6);
        ctx.fill();

        // Long Sharp Golden Beak
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(b.radius * 1.5, -b.radius * 0.15);
        ctx.lineTo(b.radius * 2.6, 0);
        ctx.lineTo(b.radius * 1.5, b.radius * 0.15);
        ctx.fill();

        ctx.restore();
      });

      // Exploding Nets
      g.nets.forEach(n => {
        if (!n.isExploding) {
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI*2); ctx.fill();
        } else {
          const opacity = 1 - (n.explosionTimer / 30);
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.explosionRadius);
          grad.addColorStop(0, `rgba(255, 255, 255, ${opacity * 1.0})`);
          grad.addColorStop(0.4, `rgba(59, 130, 246, ${opacity * 0.5})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.explosionRadius, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = `rgba(147, 197, 253, ${opacity})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.explosionRadius, 0, Math.PI*2); ctx.stroke();
        }
      });

      // Falling Feathers
      g.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (p.isFeather) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0);
          ctx.beginPath(); 
          ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI*2); 
          ctx.fill();
          // Feather spine
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillRect(p.x, p.y, 2, 2);
        }
      });
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const frame = () => { update(); draw(); animationFrameId = requestAnimationFrame(frame); };
    animationFrameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    initAudio();
    const g = gameStateRef.current;
    if (g.isGameOver || g.isWin) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    let bestL: Launcher | null = null, minDist = Infinity;
    g.launchers.forEach(l => {
      if (!l.isDestroyed && l.ammo > 0) {
        const d = Math.abs(l.x - clientX);
        if (d < minDist) { minDist = d; bestL = l; }
      }
    });

    if (bestL) {
      bestL.ammo--;
      playSFX('launch');
      g.nets.push({
        id: Math.random().toString(), x: bestL.x, y: bestL.y, startX: bestL.x, startY: bestL.y,
        targetX: clientX, targetY: clientY, progress: 0, radius: 4, isExploding: false,
        explosionRadius: 0, maxExplosionRadius: 90, explosionTimer: 0
      });
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-black" onMouseDown={handleInteraction} onTouchStart={handleInteraction}>
      <canvas ref={canvasRef} />
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none select-none">
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-xl">
          <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">{t.level} {uiState.level}</div>
          <div className="text-4xl font-black text-white">{uiState.score} / 1200</div>
          <div className="w-full h-1.5 bg-slate-800 mt-3 rounded-full overflow-hidden">
             <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(uiState.score/1200)*100}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          {uiState.ammo.map((a, i) => (
            <div key={i} className="bg-slate-900/80 px-5 py-3 rounded-xl border border-slate-700/50 text-center">
               <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">U-0{i+1}</div>
               <div className={`text-2xl font-black ${a < 5 && !gameStateRef.current.launchers[i]?.isDestroyed ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                 {gameStateRef.current.launchers[i]?.isDestroyed ? '--' : a}
               </div>
            </div>
          ))}
        </div>
      </div>
      {(uiState.gameOver || uiState.win) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg">
          <div className="bg-slate-900 p-12 rounded-[2.5rem] border border-slate-700 text-center max-w-sm w-full shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
            <h2 className={`text-5xl font-black mb-8 tracking-tighter ${uiState.win ? 'text-green-400' : 'text-red-500'}`}>
              {uiState.win ? t.win : t.gameOver}
            </h2>
            <div className="text-slate-400 mb-8 text-lg font-medium">FINAL SCORE: {uiState.score}</div>
            {uiState.win ? (
              <button onClick={() => initGame(true)} className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-green-900/40 transform active:scale-95 transition-all">
                {t.nextLevel}
              </button>
            ) : (
              <button onClick={() => initGame(false)} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-900/40 transform active:scale-95 transition-all">
                {t.restart}
              </button>
            )}
            <button onClick={onExit} className="w-full py-4 mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all">
              {lang === 'zh' ? '返回主菜单' : 'Main Menu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
