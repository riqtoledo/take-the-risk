import axios, { AxiosError } from "axios";

const sanitizeBase = (value: string) => value.trim().replace(/\/+$/, "");

const resolveBaseUrl = () => {
  const env = import.meta.env.VITE_PIX_API_BASE_URL as string | undefined;
  if (env && env.trim().length > 0) {
    return sanitizeBase(env);
  }
  return "https://api.droptify-hub.com:3029";
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45_000,
});

export type PixPayload = {
  name: string;
  email: string;
  phone: string;
  amount: number;
  description: string;
  externalRef: string;
  documentNumber: string;
};

export type PixInfo = {
  qrcode: string | null;
  copia_e_cola?: string | null;
};

export type PixResult = {
  ok?: boolean;
  transactionId?: string;
  id?: string;
  paymentId?: string;
  status?: string;
  paid?: boolean;
  amount?: number;
  pix?: PixInfo | null;
};

const normalizeError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? axiosError.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Erro desconhecido.";
};

export async function criarPix(dados: PixPayload): Promise<PixResult> {
  try {
    const response = await api.post<PixResult>("/api/pix/transactions", dados);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar PIX:", normalizeError(error));
    throw error;
  }
}

export async function consultarPix(id: string): Promise<PixResult> {
  try {
    const response = await api.get<PixResult>(`/api/pix/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao consultar PIX:", normalizeError(error));
    throw error;
  }
}
