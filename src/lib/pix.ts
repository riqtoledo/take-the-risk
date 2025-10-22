const sanitizeBase = (value: string) => value.trim().replace(/\/+$/, "");

const resolveBaseUrl = () => {
  const envValue = import.meta.env.VITE_PIX_API_BASE_URL as string | undefined;
  if (envValue && envValue.trim().length > 0) {
    return sanitizeBase(envValue);
  }

  if (import.meta.env.PROD) {
    return "/api/pix-proxy.php";
  }

  return "https://api.droptify-hub.com:3029/api/pix";
};

const BASE_URL = resolveBaseUrl();
const isPhpProxy = BASE_URL.endsWith(".php");

export type PixTransactionRequest = {
  name: string;
  email: string;
  phone: string;
  amount: number;
  description: string;
  externalRef: string;
};

export type PixInfo = {
  qrcode: string;
  copia_e_cola?: string;
};

export type PixTransactionResponse = {
  id: string;
  status: string;
  amount: number;
  paid?: boolean;
  createdAt?: string;
  externalRef?: string;
  pix: PixInfo;
};

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const rawBody = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    let message = response.statusText;
    if (rawBody && typeof rawBody === "object" && "message" in rawBody) {
      message = String((rawBody as { message: string }).message);
      if ("context" in rawBody && rawBody.context) {
        try {
          const contextString = JSON.stringify(rawBody.context);
          if (contextString && contextString !== "{}") {
            message = `${message} (${contextString})`;
          }
        } catch {
          // ignore serialization issues
        }
      }
    }
    throw new Error(message);
  }

  return rawBody as T;
}

export async function createPixTransaction(payload: PixTransactionRequest): Promise<PixTransactionResponse> {
  const endpoint = isPhpProxy ? BASE_URL : `${BASE_URL}/transactions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(payload),
  });

  return handleResponse<PixTransactionResponse>(response);
}

export async function getPixTransaction(id: string): Promise<PixTransactionResponse> {
  const url = isPhpProxy ? `${BASE_URL}?id=${encodeURIComponent(id)}` : `${BASE_URL}/transactions/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: defaultHeaders,
  });

  return handleResponse<PixTransactionResponse>(response);
}
