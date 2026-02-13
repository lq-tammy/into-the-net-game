
import React, { useState } from 'react';
import { GameContainer } from './components/GameContainer';
import { Language } from './types';
import { translations } from './translations';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const [gameStarted, setGameStarted] = useState(false);

  const t = translations[lang];

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <div className="absolute top-4 right-4 flex gap-2">
          {(['zh', 'en', 'es'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded border transition-colors ${
                lang === l ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <h1 className="text-6xl font-black mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-indigo-600 animate-pulse">
          {t.title}
        </h1>
        
        <div className="max-w-md text-center space-y-4 mb-8">
          <p className="text-xl text-blue-200 font-medium">{t.mission}</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            {t.instructions}
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs text-left bg-slate-800/50 p-4 rounded-lg border border-slate-700">
             <div>🚀 {lang === 'zh' ? '两侧发射器: 20发' : lang === 'es' ? 'Laterales: 20' : 'Side Launchers: 20'}</div>
             <div>🔥 {lang === 'zh' ? '中央发射器: 40发' : lang === 'es' ? 'Centro: 40' : 'Center Launcher: 40'}</div>
             <div>🎯 {lang === 'zh' ? '得分 1000 判定成功' : lang === 'es' ? '1000 pts para ganar' : 'Reach 1000 pts to win'}</div>
             <div>🏙️ {lang === 'zh' ? '基地全毁判定失败' : lang === 'es' ? 'Bases destruidas = Fin' : 'All bases destroyed = Fail'}</div>
          </div>
        </div>

        <button
          onClick={() => setGameStarted(true)}
          className="group relative px-12 py-4 bg-blue-600 hover:bg-blue-500 rounded-full font-bold text-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(37,99,235,0.4)]"
        >
          {t.start}
          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 blur group-hover:opacity-40 transition-opacity"></div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      <GameContainer lang={lang} onExit={() => setGameStarted(false)} />
    </div>
  );
};

export default App;
