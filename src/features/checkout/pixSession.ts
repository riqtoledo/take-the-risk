export type PixSession = {
  paymentId: string;
  status: string;
  amount: number;
  copyAndPaste: string;
  qrCodeBase64: string;
  externalRef: string;
  snapshot?: unknown;
  createdAt: string;
  expiresAt?: string | null;
};

const PIX_SESSION_STORAGE_KEY = "pix_transaction_session";

export function savePixSession(session: PixSession) {
  try {
    localStorage.setItem(PIX_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

export function loadPixSession(): PixSession | null {
  try {
    const raw = localStorage.getItem(PIX_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PixSession;
  } catch {
    return null;
  }
}

export function clearPixSession() {
  try {
    localStorage.removeItem(PIX_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
