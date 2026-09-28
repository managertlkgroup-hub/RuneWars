// RUNE WARS — пул товаров магазина внутри забега

export interface ShopItemDef {
  id: string;
  name: string;
  description: string;
  basePrice: number; // базовая цена (будет +20%)
  icon: string; // ключ для ItemIcon/MapNodeIcon или эмодзи-заменитель
  // эффект — применяется при покупке
  effect: {
    kind: "heal" | "shield" | "rage" | "key" | "rune" | "redDamage" | "maxHp" | "regen";
    amount?: number;
  };
}

// Пул товаров (базовые цены из ТЗ)
export const SHOP_POOL: ShopItemDef[] = [
  {
    id: "potion_heal",
    name: "Зелье лечения",
    description: "+30 HP немедленно (вне боя, без капа).",
    basePrice: 30,
    icon: "heart",
    effect: { kind: "heal", amount: 30 },
  },
  {
    id: "potion_shield",
    name: "Зелье щита",
    description: "+20 щит в начале следующего боя (кап 50).",
    basePrice: 40,
    icon: "shield",
    effect: { kind: "shield", amount: 20 },
  },
  {
    id: "potion_rage",
    name: "Зелье ярости",
    description: "+40 ярости в начале следующего боя (кап 60).",
    basePrice: 35,
    icon: "rage",
    effect: { kind: "rage", amount: 40 },
  },
  {
    id: "key",
    name: "Ключ",
    description: "Открывает сундук без засады.",
    basePrice: 50,
    icon: "key",
    effect: { kind: "key", amount: 1 },
  },
  {
    id: "rune",
    name: "Случайная руна",
    description: "Случайная руна (только если есть слот < 3).",
    basePrice: 100,
    icon: "rune",
    effect: { kind: "rune" },
  },
  {
    id: "whetstone",
    name: "Точильный камень",
    description: "+1 к урону красных матчей до конца забега.",
    basePrice: 45,
    icon: "whetstone",
    effect: { kind: "redDamage", amount: 1 },
  },
  {
    id: "giant_heart",
    name: "Сердце гиганта",
    description: "+10 к макс HP и лечение на 10.",
    basePrice: 40,
    icon: "heart",
    effect: { kind: "maxHp", amount: 10 },
  },
  {
    id: "regen",
    name: "Регенерация",
    description: "+1 HP за ход до конца забега (пассив).",
    basePrice: 40,
    icon: "regen",
    effect: { kind: "regen", amount: 1 },
  },
];

export interface ShopOffer {
  def: ShopItemDef;
  price: number; // цена с наценкой (+20%)
  discounted: boolean; // есть скидка -20%
  originalPrice?: number; // цена до скидки
  sold: boolean;
}

const MARKUP = 1.2; // +20%
const DISCOUNT = 0.8; // -20%
const DISCOUNT_CHANCE = 0.1; // 10% шанс скидки на одну позицию
const MAX_SAME_PER_RUN = 2;

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Сгенерировать 3 товара для магазина. */
export function generateShopOffers(
  equippedRunesCount: number,
  shopPurchases: Record<string, number>
): ShopOffer[] {
  // фильтруем руны если слотов нет
  let pool = [...SHOP_POOL];
  if (equippedRunesCount >= 3) {
    pool = pool.filter((p) => p.id !== "rune");
  }
  // убираем товары, уже купленные MAX_SAME_PER_RUN раз
  pool = pool.filter((p) => (shopPurchases[p.id] ?? 0) < MAX_SAME_PER_RUN);

  const offers: ShopOffer[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    let def: ShopItemDef | undefined;
    let tries = 0;
    do {
      def = pool[Math.floor(Math.random() * pool.length)];
      tries++;
    } while (def && used.has(def.id) && tries < 20);
    if (!def) break;
    used.add(def.id);
    const baseWithMarkup = Math.round(def.basePrice * MARKUP);
    const discounted = Math.random() < DISCOUNT_CHANCE;
    const price = discounted ? Math.round(baseWithMarkup * DISCOUNT) : baseWithMarkup;
    offers.push({
      def,
      price,
      discounted,
      originalPrice: discounted ? baseWithMarkup : undefined,
      sold: false,
    });
  }
  return offers;
}
