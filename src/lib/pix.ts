import axios, { AxiosRequestConfig } from "axios";

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
const PIX_TIMEOUT_MS = 45_000;

const defaultHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

type PixGatewayError = {
  message?: string;
  context?: unknown;
};

const buildErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<PixGatewayError>(error)) {
    if (error.code === "ECONNABORTED") {
      return "Tempo excedido ao contactar o gateway Pix.";
    }

    const data = error.response?.data;
    if (data && typeof data === "object" && "message" in data && data.message) {
      let message = String(data.message);
      if ("context" in data && data.context) {
        try {
          const contextString = JSON.stringify(data.context);
          if (contextString && contextString !== "{}") {
            message = `${message} (${contextString})`;
          }
        } catch {
          // ignore serialization issues
        }
      }
      return message;
    }

    return error.response?.statusText || error.message || "Falha ao contactar o gateway Pix.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Falha ao contactar o gateway Pix.";
};

const executeRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await axios.request<T>({
      timeout: PIX_TIMEOUT_MS,
      headers: {
        ...defaultHeaders,
        ...(config.headers ?? {}),
      },
      ...config,
    });
    return response.data;
  } catch (error) {
    throw new Error(buildErrorMessage(error));
  }
};

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

export async function createPixTransaction(payload: PixTransactionRequest): Promise<PixTransactionResponse> {
  const url = isPhpProxy ? BASE_URL : `${BASE_URL}/transactions`;
  return executeRequest<PixTransactionResponse>({
    url,
    method: "POST",
    data: payload,
  });
}

export async function getPixTransaction(id: string): Promise<PixTransactionResponse> {
  const url = isPhpProxy ? BASE_URL : `${BASE_URL}/transactions/${encodeURIComponent(id)}`;
  return executeRequest<PixTransactionResponse>({
    url,
    method: "GET",
    params: isPhpProxy
      ? {
          id,
        }
      : undefined,
  });
}
