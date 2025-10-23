export type ViaCepResult = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export type ShippingEstimate = {
  price: number;
  days: number;
};

export const cleanCep = (value: string): string => value.replace(/\D/g, "").slice(0, 8);

export const formatCep = (value: string): string => {
  const digits = cleanCep(value);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
};

export const calculateShippingEstimate = (cep: string): ShippingEstimate => {
  const prefix = Number(cep.slice(0, 2) || 0);
  if (Number.isNaN(prefix)) return { price: 0, days: 0 };
  if (prefix <= 20) return { price: 0, days: 7 };
  if (prefix <= 60) return { price: 0, days: 5 };
  return { price: 0, days: 10 };
};

type FetchAddressOptions = {
  signal?: AbortSignal;
};

export const fetchAddressByCep = async (cep: string, options: FetchAddressOptions = {}): Promise<ViaCepResult> => {
  const clean = cleanCep(cep);
  if (clean.length !== 8) throw new Error("CEP invalido");
  // QA: Permitimos passar um AbortSignal para cancelar buscas concorrentes e evitar race conditions.
  const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
    signal: options.signal,
  });
  if (!response.ok) throw new Error("Falha ao buscar CEP");
  const data: ViaCepResult = await response.json();
  if (data.erro) throw new Error("CEP nao encontrado");
  return data;
};

export const stringifyAddress = (address: ViaCepResult | null): string | null => {
  if (!address) return null;
  const parts = [
    address.logradouro,
    address.bairro,
    address.localidade && address.uf ? `${address.localidade} - ${address.uf}` : address.localidade ?? address.uf,
    address.cep,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
};
