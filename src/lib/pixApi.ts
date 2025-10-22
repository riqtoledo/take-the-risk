const sanitizeBase = (value: string) => value.trim().replace(/\/+$/, "");

const resolveBasePath = () => {
  const envValue = import.meta.env.VITE_PIX_PROXY_URL as string | undefined;
  if (envValue && envValue.trim().length > 0) {
    return sanitizeBase(envValue);
  }
  return "/api/pix";
};

const API_BASE = resolveBasePath();

export type PixChargeStatus = "PENDING" | "PAID" | "PAID_OUT" | "EXPIRED" | "CANCELLED" | "REFUNDED" | "PROCESSING" | string;

export type PixChargeRequest = {
  orderId: string;
  amount: number;
  description?: string;
  payer?: {
    name?: string;
    document?: string;
    email?: string;
    phone?: string;
  };
  metadata?: Record<string, unknown>;
};

export type PixCharge = {
  paymentId: string;
  status: PixChargeStatus;
  qrCodeBase64: string;
  copyAndPaste: string;
  amount: number;
  createdAt: string | null;
  expiresAt: string | null;
};

type ErrorResponse = {
  message?: string;
  context?: unknown;
};

const buildErrorMessage = async (response: Response) => {
  let message = response.statusText || "Erro ao contactar o servidor.";
  try {
    const data = (await response.json()) as ErrorResponse;
    if (data?.message) {
      message = data.message;
    }
  } catch {
    // ignore parse issues
  }
  return message;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response));
  }

  return (await response.json()) as T;
};

export async function createPixCharge(payload: PixChargeRequest): Promise<PixCharge> {
  return request<PixCharge>("/charges", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPixCharge(paymentId: string): Promise<PixCharge> {
  return request<PixCharge>(`/charges/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}
