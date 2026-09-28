// RUNE WARS — загрузчик PNG-ассетов с прогрессом и fallback

const ASSET_BASE = "/assets/";

export const ASSET_LIST: { id: string; path: string }[] = [
  // Фоны
  { id: "bg-crypt", path: "bg-crypt.png" },
  { id: "bg-menu", path: "bg-menu.png" },
  { id: "bg-victory", path: "bg-victory.png" },
  { id: "bg-defeat", path: "bg-defeat.png" },
  { id: "bg-camp", path: "bg-camp.png" },
  { id: "bg-inventory", path: "bg-inventory.png" },
  // Герои
  { id: "hero-warrior", path: "hero-warrior.png" },
  { id: "hero-mage", path: "hero-mage.png" },
  { id: "hero-priestess", path: "hero-priestess.png" },
  { id: "hero-rogue", path: "hero-rogue.png" },
  { id: "hero-paladin", path: "hero-paladin.png" },
  { id: "hero-necromancer", path: "hero-necromancer.png" },
  // Враги (Крипта Гоблинов)
  { id: "enemy-goblin_warrior", path: "enemy-goblin-warrior.png" },
  { id: "enemy-goblin_archer", path: "enemy-goblin-archer.png" },
  { id: "enemy-slime", path: "enemy-slime.png" },
  { id: "enemy-goblin_shaman", path: "enemy-goblin-shaman.png" },
  { id: "boss-goblin_king", path: "boss-goblin-king.png" },
  // Логотип
  { id: "logo", path: "logo.png" },
];

class AssetLoaderClass {
  cache: Map<string, HTMLImageElement> = new Map();
  loaded = 0;
  total = ASSET_LIST.length;
  onProgress: ((loaded: number, total: number) => void) | null = null;

  async loadAll(): Promise<void> {
    this.loaded = 0;
    this.total = ASSET_LIST.length;
    const promises = ASSET_LIST.map((asset) => this.loadOne(asset.id, asset.path));
    await Promise.all(promises);
  }

  private loadOne(id: string, path: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(id, img);
        this.loaded++;
        this.onProgress?.(this.loaded, this.total);
        resolve();
      };
      img.onerror = () => {
        // fallback: не загружено — рисуем процедурно
        this.loaded++;
        this.onProgress?.(this.loaded, this.total);
        resolve();
      };
      img.src = ASSET_BASE + path;
    });
  }

  get(id: string): HTMLImageElement | null {
    return this.cache.get(id) ?? null;
  }

  /** Получить ассет для героя по archetype. */
  getHero(archetype: string): HTMLImageElement | null {
    return this.get(`hero-${archetype}`) ?? null;
  }

  /** Получить ассет для врага по archetype. */
  getEnemy(archetype: string): HTMLImageElement | null {
    const id = `enemy-${archetype}`.replace("_", "-");
    const direct = this.get(id);
    if (direct) return direct;
    // fallback на boss-goblin_king для боссов
    if (archetype.includes("goblin_king")) return this.get("boss-goblin_king");
    return null;
  }

  /** Получить фон по dungeonId. */
  getBackground(dungeonId: number): HTMLImageElement | null {
    const map: Record<number, string> = {
      1: "bg-crypt",
      2: "bg-crypt", // пока переиспользуем
      3: "bg-crypt",
      4: "bg-crypt",
      5: "bg-crypt",
    };
    return this.get(map[dungeonId] ?? "bg-crypt");
  }
}

export const AssetLoader = new AssetLoaderClass();
