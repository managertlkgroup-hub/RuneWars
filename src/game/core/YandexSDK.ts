// RUNE WARS — Yandex SDK обёртка (с fallback для dev-режима)
// Все вызовы SDK обёрнуты в try/catch → no-op если SDK недоступен

type YandexPlayer = {
  setData: (data: Record<string, unknown>) => Promise<void>;
  getData: (keys: string[]) => Promise<Record<string, unknown>>;
  getName: () => Promise<string>;
  getPhoto: (size: "small" | "medium" | "large") => Promise<string>;
};

type YandexSDK = {
  features: {
    LoadingAPI: { ready: () => void };
    GameplayAPI: { start: () => void; stop: () => void };
  };
  adv: {
    showFullscreenAdv: (opts: {
      callbacks?: {
        onOpen?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (error: unknown) => void;
      };
    }) => void;
    showRewardedVideo: (opts: {
      callbacks?: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: () => void;
        onError?: (error: unknown) => void;
      };
    }) => void;
  };
  getPayments: (opts: { signed: boolean }) => Promise<{
    getCatalog: () => Promise<{ id: string; title: string; price: string }[]>;
    purchase: (opts: { id: string }) => Promise<{ purchaseToken: string }>;
    consumePurchase: (token: string) => Promise<void>;
  }>;
  getPlayer: (opts: { scopes: boolean }) => Promise<YandexPlayer>;
  environment: {
    i18n: { lang: string };
    app: { id: string };
  };
};

declare global {
  interface Window {
    YaGames?: { init: () => Promise<YandexSDK> };
    ysdk?: YandexSDK;
  }
}

const SESSION_START = Date.now();
const FULLSCREEN_COOLDOWN = 3 * 60 * 1000; // 3 минуты
const EARLY_SESSION_BLOCK = 5 * 60 * 1000; // 5 минут с начала сессии

class YandexSDKWrapper {
  private ysdk: YandexSDK | null = null;
  private player: YandexPlayer | null = null;
  initialized = false;
  private lastFullscreenTime = 0;

  async init(): Promise<void> {
    try {
      if (typeof window === "undefined") {
        console.log("[YandexSDK] window undefined (SSR), skip");
        return;
      }
      if (!window.YaGames) {
        console.log("[YandexSDK] YaGames not available (dev mode), using fallback");
        return;
      }
      this.ysdk = await window.YaGames.init();
      window.ysdk = this.ysdk;
      this.initialized = true;
      console.log("[YandexSDK] initialized, lang:", this.getLang());
    } catch (e) {
      console.warn("[YandexSDK] init failed", e);
    }
  }

  /** Вызвать когда игра готова к игре (экран загрузки скрыт, ресурсы загружены). */
  loadingReady(): void {
    try {
      if (this.ysdk?.features?.LoadingAPI?.ready) {
        this.ysdk.features.LoadingAPI.ready();
        console.log("[YandexSDK] LoadingAPI.ready() called successfully");
      } else {
        console.log("[YandexSDK] LoadingAPI.ready() skipped (no SDK)");
      }
    } catch (e) {
      console.warn("[YandexSDK] LoadingAPI.ready() failed", e);
    }
  }

  /** Автоопределение языка. */
  getLang(): string {
    try {
      if (this.ysdk?.environment?.i18n?.lang) {
        return this.ysdk.environment.i18n.lang;
      }
    } catch {
      // ignore
    }
    return "ru"; // fallback
  }

  /** Получить игрока (гостевой режим обязателен). */
  async getPlayer(): Promise<YandexPlayer | null> {
    if (!this.ysdk) return null;
    try {
      if (!this.player) {
        this.player = await this.ysdk.getPlayer({ scopes: false });
      }
      return this.player;
    } catch (e) {
      console.warn("[YandexSDK] getPlayer failed", e);
      return null;
    }
  }

  // throttled save (не чаще 1 раза в 10 секунд)
  private lastSaveTime = 0;
  private pendingSave: Record<string, unknown> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_THROTTLE = 10 * 1000;

  /** Сохранить данные игрока (с throttle 10с). */
  async savePlayerData(data: Record<string, unknown>): Promise<void> {
    this.pendingSave = { ...this.pendingSave, ...data };
    const now = Date.now();
    if (now - this.lastSaveTime < this.SAVE_THROTTLE) {
      // запланировать отложенное сохранение
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        this.flushSave();
      }, this.SAVE_THROTTLE);
      return;
    }
    this.lastSaveTime = now;
    const player = await this.getPlayer();
    if (!player) return;
    try {
      await player.setData(this.pendingSave);
      this.pendingSave = null;
    } catch (e) {
      console.warn("[YandexSDK] setData failed", e);
    }
  }

  /** Принудительное сохранение накопленных данных. */
  async flushSave(): Promise<void> {
    if (!this.pendingSave) return;
    this.lastSaveTime = Date.now();
    const player = await this.getPlayer();
    if (!player) return;
    try {
      await player.setData(this.pendingSave);
      this.pendingSave = null;
    } catch (e) {
      console.warn("[YandexSDK] flushSave failed", e);
    }
  }

  /** Загрузить данные игрока. */
  async loadPlayerData(keys: string[]): Promise<Record<string, unknown> | null> {
    const player = await this.getPlayer();
    if (!player) return null;
    try {
      return await player.getData(keys);
    } catch (e) {
      console.warn("[YandexSDK] getData failed", e);
      return null;
    }
  }

  /** Показать полноэкранную рекламу (между этажами). */
  showFullscreenAdv(onClose?: () => void): void {
    try {
      const now = Date.now();
      // Ограничения: 1 раз в 3 минуты, никогда в первых 5 минутах
      if (now - SESSION_START < EARLY_SESSION_BLOCK) {
        console.log("[YandexSDK] Fullscreen blocked: early session (<5min)");
        return;
      }
      if (now - this.lastFullscreenTime < FULLSCREEN_COOLDOWN) {
        console.log("[YandexSDK] Fullscreen blocked: cooldown (<3min)");
        return;
      }
      if (!this.ysdk?.adv?.showFullscreenAdv) {
        console.log("[YandexSDK] Fullscreen skipped (no SDK)");
        return;
      }
      this.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: (wasShown: boolean) => {
            this.lastFullscreenTime = Date.now();
            console.log("[YandexSDK] Fullscreen closed, wasShown:", wasShown);
            onClose?.();
          },
          onError: (error: unknown) => {
            console.warn("[YandexSDK] Fullscreen error", error);
          },
        },
      });
    } catch (e) {
      console.warn("[YandexSDK] showFullscreenAdv failed", e);
    }
  }

  /** Показать rewarded видео за награду. */
  showRewardedVideo(
    onRewarded: () => void,
    onClose?: () => void
  ): void {
    try {
      // dev-fallback: если не в Yandex-окружении → выдать награду напрямую
      if (typeof window !== "undefined" && (window as unknown as { YandexGamesSDKEnvironment?: unknown }).YandexGamesSDKEnvironment === undefined) {
        console.log("[YandexSDK] Rewarded: dev mode → reward directly");
        onRewarded();
        onClose?.();
        return;
      }
      if (!this.ysdk?.adv?.showRewardedVideo) {
        console.log("[YandexSDK] Rewarded: no SDK → reward directly");
        onRewarded();
        onClose?.();
        return;
      }
      this.ysdk.adv.showRewardedVideo({
        callbacks: {
          onRewarded: () => {
            console.log("[YandexSDK] Rewarded: user earned reward");
            onRewarded();
          },
          onClose: () => {
            console.log("[YandexSDK] Rewarded closed");
            onClose?.();
          },
          onError: (error: unknown) => {
            console.warn("[YandexSDK] Rewarded error", error);
            // в случае ошибки — не выдаём награду (только если не dev)
          },
        },
      });
    } catch (e) {
      console.warn("[YandexSDK] showRewardedVideo failed", e);
    }
  }

  /** Пауза звука при потере фокуса вкладки. */
  setupBlurFocus(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("blur", () => {
      this.onPauseAudio();
    });
    window.addEventListener("focus", () => {
      this.onResumeAudio();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.onPauseAudio();
      else this.onResumeAudio();
    });
  }

  private onPauseAudio() {
    // делегируется в AudioEngine
    try {
      const audio = (window as unknown as { __audioEngine?: { suspendOnBlur: () => void } }).__audioEngine;
      audio?.suspendOnBlur();
    } catch {
      // ignore
    }
  }

  private onResumeAudio() {
    try {
      const audio = (window as unknown as { __audioEngine?: { resumeOnFocus: () => void } }).__audioEngine;
      audio?.resumeOnFocus();
    } catch {
      // ignore
    }
  }
}

// синглтон
let _instance: YandexSDKWrapper | null = null;
export function getYandexSDK(): YandexSDKWrapper {
  if (!_instance) _instance = new YandexSDKWrapper();
  return _instance;
}
