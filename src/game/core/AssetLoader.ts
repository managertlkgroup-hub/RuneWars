// RUNE WARS — загрузчик PNG-ассетов с прогрессом и fallback

const ASSET_BASE = "/assets/";

export const ASSET_LIST: { id: string; path: string }[] = [
  // Фоны (12)
  { id: "bg-crypt", path: "bg-crypt.png" },
  { id: "bg-bones", path: "bg-bones.png" },
  { id: "bg-flooded", path: "bg-flooded.png" },
  { id: "bg-shadow", path: "bg-shadow.png" },
  { id: "bg-forge", path: "bg-forge.png" },
  { id: "bg-menu", path: "bg-menu.png" },
  { id: "bg-victory", path: "bg-victory.png" },
  { id: "bg-defeat", path: "bg-defeat.png" },
  { id: "bg-camp", path: "bg-camp.png" },
  { id: "bg-inventory", path: "bg-inventory.png" },
  { id: "bg-shop", path: "bg-shop.png" },
  { id: "bg-reward", path: "bg-reward.png" },
  // Герои (6)
  { id: "hero-warrior", path: "hero-warrior.png" },
  { id: "hero-mage", path: "hero-mage.png" },
  { id: "hero-priestess", path: "hero-priestess.png" },
  { id: "hero-rogue", path: "hero-rogue.png" },
  { id: "hero-paladin", path: "hero-paladin.png" },
  { id: "hero-necromancer", path: "hero-necromancer.png" },
  // Враги Крипта Гоблинов (5)
  { id: "enemy-goblin_warrior", path: "enemy-goblin-warrior.png" },
  { id: "enemy-goblin_archer", path: "enemy-goblin-archer.png" },
  { id: "enemy-slime", path: "enemy-slime.png" },
  { id: "enemy-goblin_shaman", path: "enemy-goblin-shaman.png" },
  { id: "boss-goblin_king", path: "boss-goblin-king.png" },
  // Враги Кости Древних (5)
  { id: "enemy-skeleton_warrior", path: "enemy-skeleton-warrior.png" },
  { id: "enemy-skeleton_archer", path: "enemy-skeleton-archer.png" },
  { id: "enemy-skeleton_mage", path: "enemy-skeleton-mage.png" },
  { id: "enemy-bone_slime", path: "enemy-bone-slime.png" },
  { id: "boss-lich", path: "boss-lich.png" },
  // Враги Затонувший Зал (5)
  { id: "enemy-water_golem", path: "enemy-water-golem.png" },
  { id: "enemy-mutant_fish", path: "enemy-mutant-fish.png" },
  { id: "enemy-blue_slime", path: "enemy-blue-slime.png" },
  { id: "enemy-drowned_zombie", path: "enemy-drowned-zombie.png" },
  { id: "boss-stone_golem", path: "boss-stone-golem.png" },
  // Враги Обитель Теней (5)
  { id: "enemy-shadow_creature", path: "enemy-shadow-creature.png" },
  { id: "enemy-ghost", path: "enemy-ghost.png" },
  { id: "enemy-lesser_demon", path: "enemy-lesser-demon.png" },
  { id: "enemy-nightmare_horse", path: "enemy-nightmare-horse.png" },
  { id: "boss-dark_priest", path: "boss-dark-priest.png" },
  // Враги Сердце Кузни (3 + boss)
  { id: "enemy-fire_elemental", path: "enemy-fire-elemental.png" },
  { id: "enemy-magma_golem", path: "enemy-magma-golem.png" },
  { id: "boss-ancient_master", path: "boss-ancient-master.png" },
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

  getHero(archetype: string): HTMLImageElement | null {
    return this.get(`hero-${archetype}`) ?? null;
  }

  getEnemy(archetype: string): HTMLImageElement | null {
    // пробуем прямой id
    const direct = this.get(`enemy-${archetype}`);
    if (direct) return direct;
    // пробуем boss-{archetype}
    const boss = this.get(`boss-${archetype}`);
    if (boss) return boss;
    return null;
  }

  /** Фон по dungeonId (1-5). */
  getBackground(dungeonId: number): HTMLImageElement | null {
    const map: Record<number, string> = {
      1: "bg-crypt",
      2: "bg-bones",
      3: "bg-flooded",
      4: "bg-shadow",
      5: "bg-forge",
    };
    return this.get(map[dungeonId] ?? "bg-crypt");
  }
}

export const AssetLoader = new AssetLoaderClass();
