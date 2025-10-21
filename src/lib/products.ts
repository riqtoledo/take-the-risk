import productsData from "@/data/products.json";

export type Review = {
  user: string;
  rating: number;
  comment?: string;
};

export type ProductPromotion = {
  title: string;
  subtitle?: string;
};

export type ProductSales = {
  percentage: number;
  count: number;
};

export type Product = {
  id: string;
  name: string;
  shortDescription?: string;
  description?: string;
  price: number;
  oldPrice?: number;
  shippingPrice?: number;
  images?: string[];
  badgeLabel?: string;
  promotion?: ProductPromotion;
  sales?: ProductSales;
  reviews?: Review[];
  relatedIds?: string[];
};

type RawProduct = Omit<Product, "images"> & {
  images?: string[];
};

const resolveAssetPath = (asset: string): string => {
  if (!asset) return asset;
  if (asset.startsWith("@assets/")) {
    const relativePath = asset.replace("@assets/", "../assets/");
    return new URL(relativePath, import.meta.url).href;
  }
  return asset;
};

const normalizeProduct = (raw: RawProduct): Product => ({
  ...raw,
  images: raw.images?.map((asset) => resolveAssetPath(asset)),
});

const products: Product[] = ((productsData as { products?: RawProduct[] })?.products || []).map(normalizeProduct);

export const getAllProducts = (): Product[] => products;

export const getProductById = (id: string): Product | undefined =>
  products.find((p) => p.id === id);

export const getRelatedProducts = (id: string): Product[] => {
  const p = getProductById(id);
  if (!p || !p.relatedIds) return [];
  return p.relatedIds.map((rid) => getProductById(rid)).filter(Boolean) as Product[];
};

export const getReviews = (id: string): Review[] => getProductById(id)?.reviews || [];

export default {
  getAllProducts,
  getProductById,
  getRelatedProducts,
  getReviews,
};

// Helper: generate n random reviews (names and ratings) — used when product has no reviews
const randomNames = ["Ana", "Bruno", "Carlos", "Mariana", "João", "Valéria", "Pedro", "Lucas", "Fernanda", "Camila", "Rafael", "Juliana", "Marcos", "Sofia", "Gabriel", "Isabela"];

export const generateRandomReviews = (count = 3): Review[] => {
  const out: Review[] = [];
  for (let i = 0; i < count; i++) {
    const name = randomNames[Math.floor(Math.random() * randomNames.length)];
    const rating = Math.floor(Math.random() * 5) + 1; // 1..5
    out.push({ user: name, rating, comment: "" });
  }
  return out;
};

// Deterministic PRNG based on mulberry32
const mulberry32 = (a: number) => () => {
  let t = a += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const generateDeterministicReviews = (id: string, count = 3): Review[] => {
  // Simple hash of id to produce a seed
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  const rnd = mulberry32(seed);
  const out: Review[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rnd() * randomNames.length);
    const rating = Math.floor(rnd() * 5) + 1;
    out.push({ user: randomNames[idx], rating, comment: "" });
  }
  return out;
};
