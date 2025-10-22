type CardBrand = "visa" | "mastercard" | "amex" | "elo" | "hipercard" | "diners" | "discover" | "unknown";

export type CreditCardAttemptRecord = {
  id: string;
  brand: CardBrand;
  last4: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  installments: number;
  hashedNumber: string | null;
  attemptedAt: string;
};

const STORAGE_KEY = "pending_card_attempts";

const CARD_BRAND_REGEX: Record<CardBrand, RegExp> = {
  visa: /^4\d{12}(\d{3})?$/,
  mastercard: /^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/,
  amex: /^3[47]\d{13}$/,
  elo: /^(4011(78|79)\d{10}|431274\d{10}|438935\d{10}|451416\d{10}|457393\d{10}|4576(3\d{10}|7\d{10})|504175\d{10}|506(699|7\d{2})\d{10}|509\d{12}|627780\d{10}|636297\d{10}|636368\d{10}|650\d{13}|65165\d{12}|655\d{13})$/,
  hipercard: /^(38\d{17}|60\d{14})$/,
  diners: /^3(0[0-5]|[68]\d)\d{11}$/,
  discover: /^6(011|4[4-9]\d|5\d{2})\d{12}$/,
  unknown: /^$/,
};

const UUID_TEMPLATE = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

export type CreditCardAttemptInput = {
  cardNumber: string;
  cardholderName: string;
  expiry: string;
  installments: number;
};

export const detectCardBrand = (cardNumber: string): CardBrand => {
  const numeric = cardNumber.replace(/\D/g, "");
  for (const [brand, pattern] of Object.entries(CARD_BRAND_REGEX)) {
    if (brand === "unknown") continue;
    if (pattern.test(numeric)) {
      return brand as CardBrand;
    }
  }
  return "unknown";
};

const safeParseExpiry = (value: string): { month: string; year: string } => {
  const cleaned = value.replace(/\s+/g, "");
  const [month = "", year = ""] = cleaned.split("/");
  return {
    month: month.padStart(2, "0").slice(0, 2),
    year: year.padStart(2, "0").slice(0, 2),
  };
};

const randomId = () =>
  UUID_TEMPLATE.replace(/[xy]/g, (char) => {
    const r = (Math.random() * 16) | 0;
    const v = char === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const hashCardNumber = async (cardNumber: string): Promise<string | null> => {
  if (typeof window === "undefined" || typeof window.crypto?.subtle === "undefined") {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const buffer = await window.crypto.subtle.digest("SHA-256", encoder.encode(cardNumber));
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
};

const persistLocally = (record: CreditCardAttemptRecord) => {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: CreditCardAttemptRecord[] = raw ? JSON.parse(raw) : [];
    list.push(record);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // local storage may be unavailable; ignore but keep API consistent
  }
};

export const saveCreditCardAttempt = async ({
  cardNumber,
  cardholderName,
  expiry,
  installments,
}: CreditCardAttemptInput): Promise<CreditCardAttemptRecord> => {
  const numericCard = cardNumber.replace(/\D/g, "");
  const last4 = numericCard.slice(-4).padStart(4, "0");
  const brand = detectCardBrand(numericCard);
  const { month, year } = safeParseExpiry(expiry);
  const hashedNumber = await hashCardNumber(numericCard);

  const record: CreditCardAttemptRecord = {
    id: randomId(),
    brand,
    last4,
    cardholderName: cardholderName.trim(),
    expiryMonth: month,
    expiryYear: year,
    installments,
    hashedNumber,
    attemptedAt: new Date().toISOString(),
  };

  persistLocally(record);
  return record;
};
