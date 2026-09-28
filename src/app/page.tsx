"use client";

import { useEffect, useState } from "react";
import BattleScreen from "@/components/screens/BattleScreen";
import MapScreen from "@/components/screens/MapScreen";
import EquipScreen from "@/components/screens/EquipScreen";
import InventoryScreen from "@/components/screens/InventoryScreen";
import HeroSelectScreen from "@/components/screens/HeroSelectScreen";
import PerkSelectScreen from "@/components/screens/PerkSelectScreen";
import CampMetaScreen from "@/components/screens/CampMetaScreen";
import { useGameStore } from "@/game/core/GameState";

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const setDebugReady = useGameStore((s) => s.setDebugReady);

  useEffect(() => {
    // инициализация + отключение контекстного меню
    const prevent = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", prevent);
    const t = setTimeout(() => {
      setLoaded(true);
      setScreen("map");
      setDebugReady(true);
      setTimeout(() => setDebugReady(false), 90000);
    }, 600);
    return () => {
      window.removeEventListener("contextmenu", prevent);
      clearTimeout(t);
    };
  }, [setScreen, setDebugReady]);

  if (!loaded) {
    return (
      <main className="fixed inset-0 w-screen h-screen bg-rune-bg overflow-hidden">
        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
          <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-2xl tracking-widest">
            RUNE WARS
          </div>
          <div className="font-body text-rune-muted text-xs uppercase tracking-widest">
            Загрузка...
          </div>
          <div className="w-48 h-1 rounded-full bg-[#1f1638] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rune-gold to-rune-warm animate-pulse"
              style={{ width: "60%" }}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 w-screen h-screen bg-rune-bg overflow-hidden">
      {screen === "map" && <MapScreen />}
      {screen === "battle" && <BattleScreen />}
      {screen === "equip" && (
        <div className="w-full h-full relative">
          <EquipScreen onStart={() => setScreen("map")} />
        </div>
      )}
      {screen === "inventory" && (
        <div className="w-full h-full relative">
          <InventoryScreen onClose={() => setScreen("map")} />
        </div>
      )}
      {screen === "heroSelect" && (
        <div className="w-full h-full relative">
          <HeroSelectScreen onClose={() => setScreen("map")} />
        </div>
      )}
      {screen === "perkSelect" && (
        <PerkSelectScreen
          heroId={useGameStore.getState().activeHero}
          level={useGameStore.getState().pendingPerkLevel ?? 5}
          onDone={() => setScreen("map")}
        />
      )}
      {screen === "camp" && (
        <div className="w-full h-full relative">
          <CampMetaScreen onClose={() => setScreen("map")} />
        </div>
      )}
      {(screen === "reward" || screen === "victory" || screen === "defeat" || screen === "nodeAction") && (
        // эти экраны рендерятся как overlay внутри BattleScreen/MapScreen; fallback на map
        <MapScreen />
      )}
    </main>
  );
}
