const PIX_API_BASE_URL = "https://api.droptify-hub.com:3029";

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
  const body = text ? (JSON.parse(text) as T) : (undefined as unknown as T);

  if (!response.ok) {
    const error = body ?? { message: response.statusText };
    throw new Error(
      typeof error === "object" && error !== null && "message" in error ? String((error as { message: string }).message) : response.statusText,
    );
  }

  return body;
}

export async function createPixTransaction(payload: PixTransactionRequest): Promise<PixTransactionResponse> {
  const response = await fetch(`${PIX_API_BASE_URL}/api/pix/transactions`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(payload),
  });

  return handleResponse<PixTransactionResponse>(response);
}

export async function getPixTransaction(id: string): Promise<PixTransactionResponse> {
  const response = await fetch(`${PIX_API_BASE_URL}/api/pix/transactions/${id}`, {
    method: "GET",
    headers: defaultHeaders,
  });

  return handleResponse<PixTransactionResponse>(response);
}
