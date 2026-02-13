
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
}

export const GameContainer: React.FC<Props> = ({ lang, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const gameStateRef = useRef({
    score: 0,
    round: 1,
    isGameOver: false,
    isWin: false,
    birds: [] as Bird[],
    nets: [] as Net[],
    launchers: [] as Launcher[],
    cities: [] as City[],
    particles: [] as Particle[],
    spawnTimer: 0,
    winScoreThreshold: 2500,
    shake: 0,
  });

  const [uiState, setUiState] = useState({
    score: 0,
    round: 1,
    gameOver: false,
    win: false,
    ammo: [0, 0, 0],
    isShaking: false,
  });

  const t = translations[lang];

  const initGame = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    gameStateRef.current = {
      score: 0,
      round: 1,
      isGameOver: false,
      isWin: false,
      birds: [],
      nets: [],
      particles: [],
      launchers: [
        { id: 0, x: w * 0.1, y: h - 60, ammo: 25, maxAmmo: 25, isDestroyed: false },
        { id: 1, x: w * 0.5, y: h - 60, ammo: 50, maxAmmo: 50, isDestroyed: false },
        { id: 2, x: w * 0.9, y: h - 60, ammo: 25, maxAmmo: 25, isDestroyed: false },
      ],
      cities: [
        { id: 0, x: w * 0.25, y: h - 40, isDestroyed: false },
        { id: 1, x: w * 0.4, y: h - 40, isDestroyed: false },
        { id: 2, x: w * 0.6, y: h - 40, isDestroyed: false },
        { id: 3, x: w * 0.75, y: h - 40, isDestroyed: false },
      ],
      spawnTimer: 0,
      winScoreThreshold: 2500,
      shake: 0,
    };
    
    setUiState({
      score: 0,
      round: 1,
      gameOver: false,
      win: false,
      ammo: [25, 50, 25],
      isShaking: false,
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        const w = window.innerWidth;
        const h = window.innerHeight;
        gameStateRef.current.launchers.forEach((l, i) => {
           l.x = [w*0.1, w*0.5, w*0.9][i] || l.x;
           l.y = h - 60;
        });
        gameStateRef.current.cities.forEach((c, i) => {
           c.x = [w*0.25, w*0.4, w*0.6, w*0.75][i] || c.x;
           c.y = h - 40;
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    initGame();
    return () => window.removeEventListener('resize', handleResize);
  }, [initGame]);

  useEffect(() => {
    let animationFrameId: number;

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        gameStateRef.current.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1.0,
          color,
        });
      }
    };

    const update = () => {
      const g = gameStateRef.current;
      if (g.isGameOver || g.isWin) return;

      // Update Screen Shake
      if (g.shake > 0) g.shake *= 0.9;
      if (g.shake < 0.1) g.shake = 0;

      // 1. Spawning
      g.spawnTimer++;
      const baseSpawnRate = Math.max(15, 80 - Math.floor(g.score / 120));
      if (g.spawnTimer >= baseSpawnRate) {
        const w = window.innerWidth;
        const targets = [...g.launchers.filter(l => !l.isDestroyed), ...g.cities.filter(c => !c.isDestroyed)];
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          const scoreMod = Math.min(0.4, g.score / 6000); 
          const rand = Math.random();
          let type: BirdType = 'small', radius = 6, points = 15, color = '#4ade80', speedMult = 0.7;
          if (rand > (0.92 - scoreMod)) { type = 'large'; radius = 15; points = 35; color = '#fbbf24'; speedMult = 1.6; }
          else if (rand > (0.65 - scoreMod)) { type = 'medium'; radius = 10; points = 20; color = '#f87171'; speedMult = 1.1; }
          const baseSpeed = 1.3 + (g.score / 1000);
          g.birds.push({
            id: Math.random().toString(36).substr(2, 9),
            x: Math.random() * w, y: -40, targetX: target.x, targetY: target.y,
            speed: (baseSpeed * speedMult) + (Math.random() * 0.3),
            type, radius, points, color, isHit: false,
          });
        }
        g.spawnTimer = 0;
      }

      // 2. Update Birds
      for (let i = g.birds.length - 1; i >= 0; i--) {
        const b = g.birds[i];
        const dx = b.targetX - b.x, dy = b.targetY - b.y, dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 6) {
          const l = g.launchers.find(l => !l.isDestroyed && Math.abs(l.x - b.x) < 45 && Math.abs(l.y - b.y) < 70);
          if (l) { l.isDestroyed = true; g.shake = 20; }
          const c = g.cities.find(c => !c.isDestroyed && Math.abs(c.x - b.x) < 35 && Math.abs(c.y - b.y) < 55);
          if (c) { c.isDestroyed = true; g.shake = 15; }
          spawnParticles(b.x, b.y, '#ffffff', 15);
          g.birds.splice(i, 1);
        } else {
          b.x += (dx / dist) * b.speed;
          b.y += (dy / dist) * b.speed;
        }
      }

      // 3. Update Nets
      for (let i = g.nets.length - 1; i >= 0; i--) {
        const n = g.nets[i];
        if (!n.isExploding) {
          n.progress += 0.055;
          if (n.progress >= 1) { n.progress = 1; n.isExploding = true; }
          n.x = n.startX + (n.targetX - n.startX) * n.progress;
          n.y = n.startY + (n.targetY - n.startY) * n.progress;
        } else {
          n.explosionTimer++;
          const duration = 30, t = n.explosionTimer / duration; 
          if (t <= 0.4) n.explosionRadius = n.maxExplosionRadius * (t / 0.4);
          else if (t <= 1) n.explosionRadius = n.maxExplosionRadius * (1 - (t - 0.4) / 0.6);
          else { g.nets.splice(i, 1); continue; }

          for (let j = g.birds.length - 1; j >= 0; j--) {
            const b = g.birds[j];
            const bDist = Math.sqrt((b.x - n.x)**2 + (b.y - n.y)**2);
            if (bDist < n.explosionRadius + b.radius) {
              g.score += b.points;
              spawnParticles(b.x, b.y, b.color, 10);
              g.birds.splice(j, 1);
              if (b.type === 'large') g.shake = Math.max(g.shake, 8);
            }
          }
        }
      }

      // 4. Update Particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Gravity
        p.life -= 0.02;
        if (p.life <= 0) g.particles.splice(i, 1);
      }

      // 5. Game Rules
      if (g.score >= g.winScoreThreshold) g.isWin = true;
      if (g.launchers.every(l => l.isDestroyed) || g.cities.every(c => c.isDestroyed)) g.isGameOver = true;

      const roundNum = Math.floor(g.score / 600) + 1;
      if (g.round !== roundNum) {
        g.round = roundNum;
        g.launchers.forEach(l => { if (!l.isDestroyed) l.ammo = Math.min(l.maxAmmo, l.ammo + 15); });
      }

      setUiState({
        score: g.score, round: g.round, gameOver: g.isGameOver, win: g.isWin,
        ammo: g.launchers.map(l => l.ammo),
        isShaking: g.shake > 2,
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
      if (g.shake > 0) {
        ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
      }

      // Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      // Stars
      ctx.fillStyle = '#ffffff';
      for(let i=0; i<80; i++) {
        const x = (i * 211.3) % w, y = (i * 357.7) % h;
        ctx.globalAlpha = 0.2 + Math.sin(Date.now()/700 + i)*0.2;
        ctx.fillRect(x, y, (i%4===0?2:1), (i%4===0?2:1));
      }
      ctx.globalAlpha = 1;

      // Cities
      g.cities.forEach(c => {
        if (c.isDestroyed) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(c.x - 20, c.y + 15, 40, 25);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(c.x - 25, c.y, 50, 40);
          ctx.fillStyle = '#facc15';
          ctx.globalAlpha = 0.7;
          for(let r=0; r<3; r++) for(let col=0; col<2; col++) ctx.fillRect(c.x - 18 + col*24, c.y + 5 + r*12, 12, 8);
          ctx.globalAlpha = 1;
        }
      });

      // Launchers
      g.launchers.forEach((l, idx) => {
        const color = ['#3b82f6', '#a855f7', '#3b82f6'][idx];
        if (l.isDestroyed) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.moveTo(l.x-30, l.y+40); ctx.lineTo(l.x+30, l.y+40); ctx.lineTo(l.x, l.y+10); ctx.fill();
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(l.x - 15, l.y + 10, 30, 40);
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(l.x, l.y, 18, Math.PI, 0); ctx.fill();
          ctx.lineWidth = 6; ctx.strokeStyle = color;
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x, l.y - 20); ctx.stroke();
        }
      });

      // Birds
      g.birds.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 12; ctx.shadowColor = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = b.color; ctx.lineWidth = b.radius/4;
        const wO = Math.sin(Date.now() * 0.012) * (b.radius * 1.5);
        ctx.beginPath(); ctx.moveTo(b.x - b.radius*1.8, b.y - wO);
        ctx.quadraticCurveTo(b.x, b.y - b.radius, b.x + b.radius*1.8, b.y - wO); ctx.stroke();
      });

      // Nets
      g.nets.forEach(n => {
        if (!n.isExploding) {
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)'; ctx.setLineDash([2, 4]);
          ctx.beginPath(); ctx.moveTo(n.startX, n.startY); ctx.lineTo(n.targetX, n.targetY); ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const opacity = 1 - (n.explosionTimer / 30);
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.explosionRadius);
          grad.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.8})`);
          grad.addColorStop(0.4, `rgba(59, 130, 246, ${opacity * 0.4})`);
          grad.addColorStop(1, `rgba(30, 58, 138, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.explosionRadius, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = `rgba(147, 197, 253, ${opacity})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.explosionRadius, 0, Math.PI*2); ctx.stroke();
        }
      });

      // Particles
      g.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      });
      ctx.globalAlpha = 1;

      ctx.restore();
    };

    const frame = () => { update(); draw(); animationFrameId = requestAnimationFrame(frame); };
    animationFrameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    const g = gameStateRef.current;
    if (g.isGameOver || g.isWin) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    if (clientY < 100) return;

    let bestL: Launcher | null = null, minDist = Infinity;
    g.launchers.forEach(l => {
      if (!l.isDestroyed && l.ammo > 0) {
        const d = Math.abs(l.x - clientX);
        if (d < minDist) { minDist = d; bestL = l; }
      }
    });

    if (bestL) {
      (bestL as Launcher).ammo--;
      g.nets.push({
        id: Math.random().toString(36).substr(2, 9),
        x: bestL.x, y: bestL.y, startX: bestL.x, startY: bestL.y,
        targetX: clientX, targetY: clientY, progress: 0, radius: 4,
        isExploding: false, explosionRadius: 0, maxExplosionRadius: 75, explosionTimer: 0,
      });
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-black" onMouseDown={handleInteraction} onTouchStart={handleInteraction}>
      <canvas ref={canvasRef} />
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none select-none">
        <div className={`bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md transition-transform ${uiState.score > 0 ? 'scale-105' : 'scale-100'}`}>
          <div className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{t.score}</div>
          <div className="text-4xl font-black text-white tabular-nums tracking-tight">{uiState.score}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider">{t.round} {uiState.round}</span>
          </div>
        </div>
        <div className="flex gap-3">
          {uiState.ammo.map((count, i) => {
            const isDestroyed = gameStateRef.current.launchers[i]?.isDestroyed;
            return (
              <div key={i} className={`px-4 py-3 rounded-xl border backdrop-blur-md transition-all duration-300 ${isDestroyed ? 'opacity-30 bg-red-900/20 border-red-500/50 grayscale' : 'bg-slate-900/60 border-slate-700/50'}`}>
                 <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">UNIT 0{i+1}</div>
                 <div className={`text-2xl font-black ${count < 10 && !isDestroyed ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>{isDestroyed ? '--' : count}</div>
              </div>
            );
          })}
        </div>
      </div>
      {(uiState.gameOver || uiState.win) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div className="bg-slate-900/90 p-12 rounded-[2.5rem] border border-slate-700 shadow-2xl text-center max-w-sm w-full mx-4">
            <h2 className={`text-5xl font-black mb-4 tracking-tighter ${uiState.win ? 'text-green-400' : 'text-red-500'}`}>{uiState.win ? t.win : t.gameOver}</h2>
            <div className="text-slate-400 text-lg mb-8">{uiState.score} POINTS COLLECTED</div>
            <button onClick={() => initGame()} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-2xl transition-all shadow-xl shadow-blue-600/30">{t.restart}</button>
            <button onClick={onExit} className="w-full py-4 mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all">{lang === 'zh' ? '主菜单' : 'MENU'}</button>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 h-1.5 bg-slate-900/50 w-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(100, (uiState.score / 2500) * 100)}%` }} />
      </div>
    </div>
  );
};
