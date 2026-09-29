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
import { getYandexSDK } from "@/game/core/YandexSDK";
import { getAudio } from "@/game/core/AudioEngine";
import { AssetLoader } from "@/game/core/AssetLoader";

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const setDebugReady = useGameStore((s) => s.setDebugReady);

  useEffect(() => {
    const prevent = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", prevent);
    const audioEngine = getAudio();
    if (typeof window !== "undefined") {
      (window as unknown as { __audioEngine?: typeof audioEngine }).__audioEngine = audioEngine;
    }
    const sdk = getYandexSDK();
    sdk.setupBlurFocus();

    // Предзагрузка ассетов
    AssetLoader.onProgress = (loaded, total) => {
      setProgress(loaded);
      setProgressTotal(total);
    };

    const t = setTimeout(async () => {
      // Загрузить PNG-ассеты
      await AssetLoader.loadAll();
      setLoaded(true);
      setScreen("map");

      // тикер времени (каждые 60 сек)
      setInterval(() => {
        useGameStore.getState().tickPlayTime(60);
      }, 60000);

      // Yandex SDK
      await sdk.init();
      sdk.loadingReady();
      setDebugReady(true);
      setTimeout(() => setDebugReady(false), 90000);
      const lang = sdk.getLang();
      console.log("[YandexSDK] language:", lang);

      // Player sync
      try {
        const playerData = await sdk.loadPlayerData(["accountGold", "heroLevels", "unlockedHeroes"]);
        if (playerData && playerData.accountGold !== undefined) {
          const st = useGameStore.getState();
          const playerGold = Number(playerData.accountGold) || 0;
          if (playerGold > st.accountGold) st.addGold(playerGold - st.accountGold);
        }
      } catch (e) {
        console.warn("[YandexSDK] player data sync failed", e);
      }
    }, 600);

    return () => {
      window.removeEventListener("contextmenu", prevent);
      clearTimeout(t);
    };
  }, [setScreen, setDebugReady]);

  if (!loaded) {
    const logo = AssetLoader.get("logo");
    return (
      <main className="fixed inset-0 w-screen h-screen bg-rune-bg overflow-hidden">
        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
          {logo ? (
            <img src="/assets/logo.png" alt="RUNE WARS" className="max-w-md w-full" />
          ) : (
            <div className="font-pixel text-rune-gold text-glow-gold text-base sm:text-2xl tracking-widest">
              RUNE WARS
            </div>
          )}
          <div className="font-body text-rune-muted text-xs uppercase tracking-widest">
            Загрузка... {progress}/{progressTotal || AssetLoader.total}
          </div>
          <div className="w-48 h-1 rounded-full bg-[#1f1638] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rune-gold to-rune-warm transition-all duration-300"
              style={{ width: `${progressTotal > 0 ? (progress / progressTotal) * 100 : 0}%` }}
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
        <MapScreen />
      )}
    </main>
  );
}
