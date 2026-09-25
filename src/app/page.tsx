"use client";

import { useEffect, useState } from "react";
import BattleScreen from "@/components/screens/BattleScreen";

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // имитация инициализации + отключение контекстного меню
    const prevent = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", prevent);
    const t = setTimeout(() => setLoaded(true), 600);
    return () => {
      window.removeEventListener("contextmenu", prevent);
      clearTimeout(t);
    };
  }, []);

  return (
    <main className="fixed inset-0 w-screen h-screen bg-rune-bg overflow-hidden">
      {loaded ? (
        <BattleScreen />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
          <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-2xl tracking-widest">
            RUNE WARS
          </div>
          <div className="font-body text-rune-muted text-xs uppercase tracking-widest">
            Загрузка...
          </div>
          <div className="w-48 h-1 rounded-full bg-[#1f1638] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rune-gold to-rune-warm animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}
    </main>
  );
}
