export type PixSession = {
  id: string;
  status: string;
  paid: boolean;
  amount: number;
  externalRef: string;
  pix: {
    qrcode: string;
    copia_e_cola?: string;
  };
  snapshot?: unknown;
  createdAt: string;
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
