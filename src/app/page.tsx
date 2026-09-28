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

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const setDebugReady = useGameStore((s) => s.setDebugReady);

  useEffect(() => {
    // отключение контекстного меню (требование Яндекса)
    const prevent = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", prevent);

    // expose audio engine для blur/focus обработчика SDK
    if (typeof window !== "undefined") {
      (window as unknown as { __audioEngine?: typeof audioEngine }).__audioEngine = audioEngine;
    }

    // setup blur/focus аудио пауза (требование Яндекса 8.4)
    const sdk = getYandexSDK();
    sdk.setupBlurFocus();

    const t = setTimeout(async () => {
      setLoaded(true);
      setScreen("map");

      // Yandex SDK: инициализация
      await sdk.init();

      // LoadingAPI.ready() — игра готова, игрок может начать
      sdk.loadingReady();

      // Game Ready индикатор (90с)
      setDebugReady(true);
      setTimeout(() => setDebugReady(false), 90000);

      // автоопределение языка
      const lang = sdk.getLang();
      console.log("[YandexSDK] language:", lang);

      // синхронизация Player данных (если доступно)
      try {
        const playerData = await sdk.loadPlayerData([
          "accountGold",
          "heroLevels",
          "unlockedHeroes",
        ]);
        if (playerData) {
          const st = useGameStore.getState();
          // если Player имеет данные — загрузить их (приоритет над localStorage)
          if (playerData.accountGold !== undefined) {
            const playerGold = Number(playerData.accountGold) || 0;
            const localGold = st.accountGold;
            // взять максимум (в случае конфликта)
            if (playerGold > localGold) {
              st.addGold(playerGold - localGold);
            }
          }
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

  const audioEngine = getAudio();

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
        <MapScreen />
      )}
    </main>
  );
}
