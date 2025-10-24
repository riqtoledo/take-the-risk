﻿import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import Header from "@/components/Header";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import PersonalInfoSection, { PersonalInfo } from "./components/PersonalInfoSection";
import DeliverySection, { DeliveryMode, DeliveryAddressDetails } from "./components/DeliverySection";
import PaymentSection, { PaymentMethod } from "./components/PaymentSection";
import OrderSummary from "./components/OrderSummary";
import CheckoutSummaryBar from "./components/CheckoutSummaryBar";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  calculateShippingEstimate,
  cleanCep,
  fetchAddressByCep,
  formatCep,
  stringifyAddress,
  ShippingEstimate,
  ViaCepResult,
} from "@/lib/shipping";
import { formatCurrency } from "@/lib/utils";
import { criarPix, consultarPix } from "@/lib/pix-flow";

// ===== META PIXEL: tipos mínimos =====
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const STORAGE_KEY = "checkout_draft";
type PixResponse = Awaited<ReturnType<typeof criarPix>>;

const PIX_QR_KEYS = [
  "qrcode",
  "qrCode",
  "qrcodeUrl",
  "qrcodeURL",
  "qr_code",
  "qrCodeUrl",
  "qrCodeImage",
  "qrCodeImageUrl",
  "qrCodeImageURL",
  "qrImage",
  "qrImageUrl",
  "qr_image",
  "qr_image_url",
  "qrCodeBase64",
  "qrcodeBase64",
  "qr_code_base64",
  "imagemQrcode",
  "imagem_qrcode",
  "image",
  "url",
  "linkVisualizacao",
  "link_visualizacao",
];

const PIX_COPY_KEYS = [
  "copia_e_cola",
  "copiaECola",
  "copiaCola",
  "copyPaste",
  "copyPasteKey",
  "copy_code",
  "copyCode",
  "code",
  "emv",
  "payload",
  "brcode",
  "brCode",
  "texto",
  "text",
  "pix_code",
  "pixCopiaECola",
];

const normalizePixString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const SUCCESS_STATUS_KEYWORDS = [
  "paid",
  "pago",
  "approved",
  "aprovado",
  "completed",
  "confirmado",
  "confirmed",
  "succeeded",
  "settled",
  "concluido",
  "liquidado",
  "captured",
  "succeed",
  "done",
];

const PENDING_STATUS_KEYWORDS = [
  "waiting",
  "aguard",
  "pend",
  "pending",
  "process",
  "in_progress",
  "created",
  "opened",
  "open",
  "authorized",
  "recebido",
];

const normalizePixInfo = (
  raw: unknown,
  fallback: PixResponse["pix"] | null = null,
): PixResponse["pix"] | null => {
  const containers: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();

  const pushContainer = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object") return;
    if (seen.has(candidate)) return;
    seen.add(candidate);
    containers.push(candidate as Record<string, unknown>);
  };

  const attemptParseJson = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      pushContainer(parsed);
    } catch {
      // ignore invalid JSON blobs
    }
  };

  if (typeof raw === "string") {
    const trimmedRaw = raw.trim();
    if (trimmedRaw.startsWith("{") && trimmedRaw.endsWith("}")) {
      attemptParseJson(trimmedRaw);
    }
  }

  pushContainer(raw);
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    pushContainer(obj.pix);
    if (obj.data) pushContainer(obj.data);
    if (obj.data && typeof obj.data === "object") {
      const data = obj.data as Record<string, unknown>;
      pushContainer(data.pix);
    }
    if (Array.isArray(obj.pix)) {
      obj.pix.forEach(pushContainer);
    }
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
      if (/https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
        containers.push({ qrcode: trimmed });
      } else {
        containers.push({ copia_e_cola: trimmed });
      }
    }
  }

  let qrcode = fallback?.qrcode ?? null;
  let copiaECola = fallback?.copia_e_cola ?? null;

  const considerStringValue = (candidate: unknown) => {
    const value = normalizePixString(candidate);
    if (!value) return;
    if (!qrcode && (/^data:image\//i.test(value) || /^https?:\/\//i.test(value))) {
      qrcode = value;
      return;
    }
    if (!copiaECola) {
      const emvCandidate = value.replace(/\s+/g, "");
      const isLikelyEmv = /^[0-9A-Z]+$/.test(emvCandidate) && value.length > 30;
      if (isLikelyEmv || value.includes("|") || value.includes("000201")) {
        copiaECola = value;
        return;
      }
    }
    if (!qrcode) {
      const base64Candidate = value.replace(/\s+/g, "");
      if (/^[A-Za-z0-9+/=]+$/.test(base64Candidate) && base64Candidate.length >= 80) {
        qrcode = value;
        return;
      }
    }
    if (!copiaECola && value.length > 20) {
      copiaECola = value;
    }
  };

  for (const container of containers) {
    for (const key of PIX_QR_KEYS) {
      if (qrcode) break;
      considerStringValue((container as any)[key]);
    }
    for (const key of PIX_COPY_KEYS) {
      if (copiaECola) break;
      considerStringValue((container as any)[key]);
    }
    if (!qrcode) {
      considerStringValue((container as any).qrcode);
      considerStringValue((container as any).qrCode);
      considerStringValue((container as any).qrcodeUrl);
      considerStringValue((container as any).qrCodeUrl);
      considerStringValue((container as any).qrcodeURL);
    }
    if (!copiaECola) {
      considerStringValue((container as any).emv);
      considerStringValue((container as any).brcode);
      considerStringValue((container as any).payload);
      considerStringValue((container as any).texto);
      considerStringValue((container as any).text);
    }
    if (!qrcode && typeof container === "object") {
      const nested = (container as any).pix;
      if (typeof nested === "string") {
        considerStringValue(nested);
      }
    }
    if (qrcode && copiaECola) break;
  }

  if (!qrcode && typeof raw === "string") {
    considerStringValue(raw);
  }

  if (!qrcode && fallback?.qrcode) qrcode = fallback.qrcode;
  if (!copiaECola && fallback?.copia_e_cola) copiaECola = fallback.copia_e_cola;

  if (!qrcode && !copiaECola) {
    return fallback ?? null;
  }

  return {
    qrcode: qrcode ?? null,
    copia_e_cola: copiaECola ?? null,
  };
};

const resolvePixTransactionId = (payload: Record<string, unknown>): string => {
  const keys = [
    "transactionId",
    "transaction_id",
    "id",
    "paymentId",
    "payment_id",
    "providerId",
    "provider_id",
    "externalRef",
    "external_ref",
    "externalReference",
    "external_reference",
  ];
  for (const key of keys) {
    const value = normalizePixString((payload as any)[key]);
    if (value) return value;
  }
  return "";
};

const normalizePixAmount = (raw: unknown, fallback: number): number => {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(Math.round(raw), 0);
  }
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
    const numeric = Number(cleaned);
    if (Number.isFinite(numeric)) {
      const direct = Math.round(numeric);
      const scaled = Math.round(numeric * 100);
      if (fallback > 0) {
        const diffDirect = Math.abs(fallback - direct);
        const diffScaled = Math.abs(fallback - scaled);
        if (diffScaled < diffDirect) {
          return Math.max(scaled, 0);
        }
      }
      return Math.max(Math.round(numeric), 0);
    }
  }
  return Math.max(Math.round(fallback), 0);
};

const normalizeStatusString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const coercePaidFlag = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "sim"].includes(normalized)) return true;
    if (["false", "0", "no", "nao"].includes(normalized)) return false;
    if (SUCCESS_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true;
  }
  return false;
};

const isPixPaymentComplete = (paid: unknown, status?: unknown): boolean => {
  const statusNormalized = normalizeStatusString(status);
  if (statusNormalized) {
    if (SUCCESS_STATUS_KEYWORDS.some((keyword) => statusNormalized.includes(keyword))) {
      return true;
    }
    if (PENDING_STATUS_KEYWORDS.some((keyword) => statusNormalized.includes(keyword))) {
      return false;
    }
  }
  const paidFlag = coercePaidFlag(paid);
  if (!paidFlag) return false;
  if (statusNormalized) {
    return !PENDING_STATUS_KEYWORDS.some((keyword) => statusNormalized.includes(keyword));
  }
  return paidFlag;
};

const resolvePixDisplayLabel = (status: unknown, paid: boolean): string => {
  if (paid) return "Pago";
  const normalized = normalizeStatusString(status);
  if (!normalized) return "Aguardando pagamento";
  if (PENDING_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "Aguardando pagamento";
  }
  return formatPixStatus(typeof status === "string" ? status : normalized);
};

const buildPixQrSrc = (value: string | null | undefined): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const base64Candidate = trimmed.replace(/\s+/g, "");
  if (/^[A-Za-z0-9+/=]+$/.test(base64Candidate) && base64Candidate.length >= 80) {
    return `data:image/png;base64,${base64Candidate}`;
  }
  return trimmed;
};

const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === "object" && error !== null) {
    const withResponse = error as { response?: { data?: { message?: unknown } } };
    const responseMessage = withResponse.response?.data?.message;
    if (typeof responseMessage === "string" && responseMessage.trim().length > 0) {
      return responseMessage;
    }
    const directMessage = (error as { message?: unknown }).message;
    if (typeof directMessage === "string" && directMessage.trim().length > 0) {
      return directMessage;
    }
  }
  return fallback;
};

const defaultAddressDetails: DeliveryAddressDetails = {
  street: "",
  number: "",
  complement: "",
  reference: "",
  neighborhood: "",
  city: "",
  state: "",
  country: "Brasil",
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, subtotal } = useCart();

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: "",
    email: "",
    phone: "",
  });
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("delivery");
  const [cep, setCep] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [isCalculatingCep, setIsCalculatingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [address, setAddress] = useState<ViaCepResult | null>(null);
  const [shippingEstimate, setShippingEstimate] = useState<ShippingEstimate | null>(null);
  const [addressDetails, setAddressDetails] = useState<DeliveryAddressDetails>(defaultAddressDetails);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixResult, setPixResult] = useState<Awaited<ReturnType<typeof criarPix>> | null>(null);
  const [pixTransactionId, setPixTransactionId] = useState<string | null>(null);
  const [generatedPixQr, setGeneratedPixQr] = useState<string | null>(null);
  const [pixTakingTooLong, setPixTakingTooLong] = useState(false);
  const [isPixRedirecting, setIsPixRedirecting] = useState(false);
  const pixPollingRef = useRef<number | null>(null);
  const pixTimeoutRef = useRef<number | null>(null);
  const pixSuccessRedirectRef = useRef<number | null>(null);
  const pixAmountRef = useRef<number>(0);
  const pixSuccessHandledRef = useRef(false);
  const pixDocumentNumberRef = useRef<string | null>(null);
  const shippingRequestRef = useRef<AbortController | null>(null);
  // QA: Controlamos a requisicao de CEP para cancelar buscas antigas e evitar respostas fora de ordem.

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.personalInfo) setPersonalInfo(parsed.personalInfo);
      if (parsed?.deliveryMode) setDeliveryMode(parsed.deliveryMode);
      if (typeof parsed?.cep === "string") setCep(parsed.cep);
      if (parsed?.addressDetails) {
        setAddressDetails({ ...defaultAddressDetails, ...parsed.addressDetails });
      }
      if (typeof parsed?.addressConfirmed === "boolean") setAddressConfirmed(parsed.addressConfirmed);
      if (parsed?.paymentMethod === "card" || parsed?.paymentMethod === "pix") setPaymentMethod(parsed.paymentMethod);
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    const payload = { personalInfo, deliveryMode, cep, addressDetails, addressConfirmed, paymentMethod };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage write errors
    }
  }, [personalInfo, deliveryMode, cep, addressDetails, addressConfirmed, paymentMethod]);

  useEffect(() => {
    return () => {
      if (shippingRequestRef.current) {
        shippingRequestRef.current.abort();
        shippingRequestRef.current = null;
      }
      if (pixPollingRef.current) {
        window.clearInterval(pixPollingRef.current);
        pixPollingRef.current = null;
      }
      if (pixTimeoutRef.current) {
        window.clearTimeout(pixTimeoutRef.current);
        pixTimeoutRef.current = null;
      }
      if (pixSuccessRedirectRef.current) {
        window.clearTimeout(pixSuccessRedirectRef.current);
        pixSuccessRedirectRef.current = null;
      }
    };
  }, []);

  const isFreeShipping = subtotal >= 50;
  const shippingCost = useMemo(() => {
    if (isFreeShipping) return 0;
    return shippingEstimate?.price ?? 0;
  }, [isFreeShipping, shippingEstimate]);

  const total = useMemo(() => subtotal + (isFreeShipping ? 0 : shippingCost), [subtotal, shippingCost, isFreeShipping]);
  const isPixBlocked = total >= 301;

  const handleCepChange = (value: string) => {
    setCep(formatCep(value));
    setCepError(null);
    setAddress(null);
    setShippingEstimate(null);
    setAddressDetails((prev) => ({
      ...prev,
      street: "",
      neighborhood: "",
      city: "",
      state: "",
    }));
    setAddressConfirmed(false);
  };

  const handleCalculateShipping = async () => {
    const cleaned = cleanCep(cep);
    if (cleaned.length !== 8) {
      shippingRequestRef.current?.abort();
      shippingRequestRef.current = null;
      setCepError("Informe um CEP valido com 8 digitos.");
      setAddress(null);
      setShippingEstimate(null);
      setIsCalculatingCep(false);
      return;
    }

    shippingRequestRef.current?.abort();
    const controller = new AbortController();
    shippingRequestRef.current = controller;

    setIsCalculatingCep(true);
    setCepError(null);
    try {
      const addressInfo = await fetchAddressByCep(cleaned, { signal: controller.signal });
      if (shippingRequestRef.current !== controller) return;
      setAddress(addressInfo);
      setShippingEstimate(calculateShippingEstimate(cleaned));
      setAddressDetails((prev) => ({
        ...prev,
        street: addressInfo.logradouro ?? prev.street,
        neighborhood: addressInfo.bairro ?? prev.neighborhood,
        city: addressInfo.localidade ?? prev.city,
        state: addressInfo.uf ?? prev.state,
        country: prev.country || "Brasil",
      }));
      setAddressConfirmed(false);
      setCepError(null);
    } catch (error: unknown) {
      if ((error as DOMException)?.name === "AbortError") {
        return;
      }
      if (shippingRequestRef.current !== controller) return;
      setCepError(resolveErrorMessage(error, "Nao foi possivel calcular o frete."));
      setAddress(null);
      setShippingEstimate(null);
    } finally {
      if (shippingRequestRef.current === controller) {
        setIsCalculatingCep(false);
        shippingRequestRef.current = null;
      }
    }
  };

  const handleAddressDetailsChange = (details: DeliveryAddressDetails) => {
    setAddressDetails(details);
    setAddressConfirmed(false);
  };

  const handleEditAddress = () => {
    setAddressConfirmed(false);
  };

  const handleDeliveryModeChange = (mode: DeliveryMode) => {
    setDeliveryMode(mode);
    if (mode === "pickup") {
      setAddressConfirmed(true);
    } else {
      setAddressConfirmed(false);
    }
  };

  const handleConfirmAddress = () => {
    if (deliveryMode === "pickup") {
      setAddressConfirmed(true);
      return;
    }
    const hasStreet = addressDetails.street.trim().length > 0;
    const hasNumber = addressDetails.number.trim().length > 0;
    const hasNeighborhood = addressDetails.neighborhood.trim().length > 0;
    const hasCity = addressDetails.city.trim().length > 0;
    const hasState = addressDetails.state.trim().length > 0;
    if (hasStreet && hasNumber && hasNeighborhood && hasCity && hasState) {
      setAddressConfirmed(true);
      toast({
        title: "Endereco confirmado",
        description: "Os dados foram salvos com sucesso.",
      });
    } else {
      setAddressConfirmed(false);
      toast({
        title: "Complete os campos",
        description: "Informe rua, numero, bairro, cidade e estado para confirmar.",
        variant: "destructive",
      });
    }
  };

  const generateRandomCpfDigits = () => {
    const computeDigit = (base: number[]) => {
      let factor = base.length + 1;
      const total = base.reduce((acc, value) => {
        const sum = acc + value * factor;
        factor -= 1;
        return sum;
      }, 0);
      const remainder = total % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    while (true) {
      const baseDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
      if (new Set(baseDigits).size === 1) continue;
      const firstDigit = computeDigit(baseDigits);
      const secondDigit = computeDigit([...baseDigits, firstDigit]);
      const cpfDigits = [...baseDigits, firstDigit, secondDigit];
      if (new Set(cpfDigits).size === 1) continue;
      return cpfDigits.join("");
    }
  };

  const resolvePixDocumentNumber = () => {
    if (pixDocumentNumberRef.current) return pixDocumentNumberRef.current;
    const generated = generateRandomCpfDigits();
    pixDocumentNumberRef.current = generated;
    return generated;
  };

  const cleanedPhoneDigits = personalInfo.phone.replace(/\D/g, "");
  const hasContactInfo =
    personalInfo.name.trim().length > 2 && personalInfo.email.includes("@") && cleanedPhoneDigits.length >= 10;
  const requiresAddress = deliveryMode === "delivery";
  // QA: A validacao considera retirada sem exigir CEP/endereco, preservando o fluxo existente.
  const hasValidCep = cleanCep(cep).length === 8;
  const hasAddressInfo = addressDetails.street.trim().length > 0;
  const hasNumber = addressDetails.number.trim().length > 0;
  const isAddressComplete = hasValidCep && hasAddressInfo && hasNumber;
  const canSubmitDelivery = !requiresAddress || (addressConfirmed && isAddressComplete);
  const isFormValid =
  items.length > 0 &&
  hasContactInfo &&
  canSubmitDelivery &&
  paymentMethod === "pix" &&
  !isPixBlocked;

  const clearPixSuccessRedirect = () => {
    if (pixSuccessRedirectRef.current) {
      window.clearTimeout(pixSuccessRedirectRef.current);
      pixSuccessRedirectRef.current = null;
    }
  };

  const stopPixPolling = () => {
    if (pixPollingRef.current) {
      window.clearInterval(pixPollingRef.current);
      pixPollingRef.current = null;
    }
    if (pixTimeoutRef.current) {
      window.clearTimeout(pixTimeoutRef.current);
      pixTimeoutRef.current = null;
    }
  };

  const handlePixPaymentSuccess = (transactionId: string, amountInCents?: number | null) => {
    if (pixSuccessHandledRef.current) return;
    pixSuccessHandledRef.current = true;

    stopPixPolling();
    setPixTakingTooLong(false);
    setPixError(null);
    clearPixSuccessRedirect();

    const fallbackAmount =
      typeof amountInCents === "number" && Number.isFinite(amountInCents) ? amountInCents : pixAmountRef.current;
    const safeAmount = Math.max(Math.round(Number.isFinite(fallbackAmount) ? fallbackAmount : pixAmountRef.current), 0);
    pixAmountRef.current = safeAmount;
    setPixTransactionId(transactionId);

    setPixResult((prev) => ({
      ...prev,
      paid: true,
      status: prev?.status ?? "pago",
      amount: safeAmount,
    }));

    const upsellItems = items.map((line) => ({
      id: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      price: line.product.price,
    }));

    // ===== META PIXEL: Purchase ao confirmar PIX =====
    try {
      const numItems = items.reduce((acc, l) => acc + l.quantity, 0);
      window.fbq?.("track", "Purchase", {
        value: safeAmount / 100,      // reais
        currency: "BRL",
        contents: items.map((l) => ({
          id: String(l.product.id),
          quantity: l.quantity,
          item_price: l.product.price, // reais por item
        })),
        content_type: "product",
        num_items: numItems,
        external_id: transactionId,
      });
    } catch {}

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage cleanup errors
    }

    toast({
      title: "Pagamento confirmado!",
      description: "Obrigado pela sua compra. Voce sera redirecionado para ofertas especiais.",
    });

    setIsPixRedirecting(true);

    const redirectToUpsell = () => {
      clearPixSuccessRedirect();
      setIsPixRedirecting(false);
      setPixModalOpen(false);
      navigate("/upsell", {
        replace: true,
        state: {
          transactionId,
          amount: safeAmount,
          items: upsellItems,
        },
      });
    };

    if (!pixModalOpen) {
      redirectToUpsell();
      return;
    }

    pixSuccessRedirectRef.current = window.setTimeout(redirectToUpsell, 1500);
  };

  const handlePixModalClose = () => {
    setPixModalOpen(false);
    setPixTakingTooLong(false);
    setIsPixRedirecting(false);
    setGeneratedPixQr(null);
    clearPixSuccessRedirect();
    stopPixPolling();
  };

  const startPixPolling = (transactionId: string) => {
    stopPixPolling();
    clearPixSuccessRedirect();
    setPixTakingTooLong(false);
    setIsPixRedirecting(false);
    pixTimeoutRef.current = window.setTimeout(() => {
      setPixTakingTooLong(true);
    }, 120000);
    pixPollingRef.current = window.setInterval(async () => {
      try {
        const status = await consultarPix(transactionId);
        const normalizedAmount = normalizePixAmount(status.amount, pixAmountRef.current);
        pixAmountRef.current = normalizedAmount;
        const normalizedPaid = isPixPaymentComplete(status.paid, status.status);

        setPixResult((prev) => {
          const nextPix = normalizePixInfo(status, prev?.pix ?? null);
          return {
            ...prev,
            ...status,
            transactionId: prev?.transactionId ?? transactionId,
            amount: normalizedAmount,
            paid: normalizedPaid,
            pix: nextPix,
          };
        });
        if (normalizedPaid) {
          handlePixPaymentSuccess(transactionId, normalizedAmount);
          return;
        }
        setPixError(null);
      } catch (error: unknown) {
        setPixError(resolveErrorMessage(error, "Nao foi possivel atualizar o status do PIX."));
      }
    }, 5000);
  };

  const handleFinishOrder = async () => {

    if (isPixBlocked) {
    toast({
      title: "Pix indisponível para este valor",
      description: "Para produtos promocionais, o limite é até R$ 300,00 no total.",
      variant: "destructive",
    });
    return;
  }


    if (!isFormValid || isSubmitting) return;
    clearPixSuccessRedirect();
    stopPixPolling();
    setPixModalOpen(false);
    setPixError(null);
    setPixResult(null);
    setPixTransactionId(null);
    setGeneratedPixQr(null);
    setPixTakingTooLong(false);
    setIsPixRedirecting(false);
    pixAmountRef.current = 0;
    pixSuccessHandledRef.current = false;
    setIsSubmitting(true);
    const checkoutSnapshot = { personalInfo, deliveryMode, cep, addressDetails, addressConfirmed: true, paymentMethod };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkoutSnapshot));
    } catch {
      // ignore storage errors
    }

    try {
      const amountInCents = Math.max(Math.round(total * 100), 0);
      pixAmountRef.current = amountInCents;
      const externalRef = `PED-${Date.now()}`;
      const documentNumber = resolvePixDocumentNumber();
      const payload = {
        name: personalInfo.name.trim(),
        email: personalInfo.email.trim(),
        phone: cleanedPhoneDigits,
        amount: amountInCents,
        description: `Pedido ${externalRef}`,
        externalRef,
        documentNumber,
      };

      const result = await criarPix(payload);
      const transactionId = resolvePixTransactionId(result as Record<string, unknown>);

      if (!transactionId.trim()) {
        throw new Error("Transacao PIX retornou dados inesperados.");
      }

      const resolvedAmount = normalizePixAmount(result.amount, amountInCents);
      pixAmountRef.current = resolvedAmount;
      pixSuccessHandledRef.current = false;

      const normalizedPix = normalizePixInfo(result);
      const normalizedPaid = isPixPaymentComplete(result.paid, result.status);

      setPixResult({
        ...result,
        transactionId,
        amount: resolvedAmount,
        paid: normalizedPaid,
        pix: normalizedPix,
      });
      setPixError(null);
      setPixTransactionId(transactionId);
      setPixTakingTooLong(false);

      if (normalizedPaid) {
        handlePixPaymentSuccess(transactionId, resolvedAmount);
      } else {
        // ===== META PIXEL: InitiateCheckout ao abrir modal Pix =====
        try {
          window.fbq?.("track", "InitiateCheckout", {
            value: (pixAmountRef.current ?? 0) / 100,
            currency: "BRL",
            num_items: items.reduce((acc, l) => acc + l.quantity, 0),
          });
        } catch {}
        setPixModalOpen(true);
        startPixPolling(transactionId);
      }
    } catch (error: unknown) {
      const message = resolveErrorMessage(error, "Nao foi possivel gerar o pagamento Pix. Tente novamente.");
      toast({
        title: "Erro ao gerar PIX",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pixCopyCode = normalizePixString(pixResult?.pix?.copia_e_cola) ?? "";
  const pixQrSource = buildPixQrSrc(pixResult?.pix?.qrcode ?? null);

  useEffect(() => {
    let cancelled = false;
    if (pixQrSource) {
      setGeneratedPixQr(null);
      return () => {
        cancelled = true;
      };
    }
    if (!pixCopyCode) {
      setGeneratedPixQr(null);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(pixCopyCode, {
          errorCorrectionLevel: "M",
          margin: 1,
          scale: 6,
        });
        if (!cancelled) setGeneratedPixQr(dataUrl);
      } catch {
        if (!cancelled) setGeneratedPixQr(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pixCopyCode, pixQrSource]);

  const pixQrSrc = pixQrSource || generatedPixQr || "";

  const formatPixStatus = (value?: string | null) => {
    if (!value) return "Aguardando pagamento";
    const normalized = value.replace(/[_-]+/g, " ").trim();
    if (!normalized) return "Aguardando pagamento";
    return normalized
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

const pixStatus = (() => {
    if (pixResult?.paid) {
      return { label: resolvePixDisplayLabel(pixResult.status, true), tone: "success" as const };
    }
    if (pixError) {
      return { label: "Erro ao atualizar", tone: "danger" as const };
    }
    if (pixTakingTooLong) {
      return { label: "Aguardando confirmacao", tone: "danger" as const };
    }
    if (pixResult) {
      return { label: resolvePixDisplayLabel(pixResult.status, false), tone: "pending" as const };
    }
    return { label: "Aguardando pagamento", tone: "pending" as const };
  })();

  const pixStatusClass =
    pixStatus.tone === "success"
      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
      : pixStatus.tone === "danger"
        ? "border-red-200 bg-red-100 text-red-700"
        : "border-amber-200 bg-amber-100 text-amber-700";

  const pixAmountCents = Math.max(
    typeof pixResult?.amount === "number" ? pixResult.amount : pixAmountRef.current,
    0,
  );
  const pixAmountLabel = pixAmountCents > 0 ? formatCurrency(pixAmountCents / 100) : null;

  const handleCopyPixCode = async () => {
    if (!pixCopyCode) return;
    try {
      await navigator.clipboard.writeText(pixCopyCode);
      toast({
        title: "Codigo copiado!",
        description: "Cole o codigo no app do seu banco para concluir o pagamento.",
      });
    } catch {
      toast({
        title: "Nao foi possivel copiar",
        description: "Copie manualmente o codigo exibido.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative min-h-screen bg-background pb-32 text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Finalizar compra</h1>
          <p className="text-sm text-muted-foreground">Revise seus dados e conclua o pagamento.</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            Nenhum item na cesta.{" "}
            <button className="text-primary underline" onClick={() => navigate("/")}>
              Voltar para a loja
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <PersonalInfoSection value={personalInfo} onChange={setPersonalInfo} />
              <DeliverySection
                mode={deliveryMode}
                onModeChange={handleDeliveryModeChange}
                cep={cep}
                onCepChange={handleCepChange}
                onCalculateShipping={handleCalculateShipping}
                isCalculating={isCalculatingCep}
                cepError={cepError}
                addressSummary={stringifyAddress(address)}
                addressDetails={addressDetails}
                onAddressDetailsChange={handleAddressDetailsChange}
                onConfirmAddress={handleConfirmAddress}
                onEditAddress={handleEditAddress}
                isAddressConfirmed={addressConfirmed}
                isFreeShipping={isFreeShipping}
                shippingCost={shippingCost}
              />
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h2 className="text/base font-semibold text-foreground">Pacotes e prazos</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pedido entregue em 1 etapa. Confira o prazo estimado abaixo.
                </p>
                <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm">
                  <p className="font-semibold text-foreground">Entrega unica</p>
                  <span className="text-muted-foreground">
                    {shippingEstimate ? `Chega em ate ${shippingEstimate.days} dias uteis.` : "Informe o CEP para estimar o prazo."}
                  </span>
                </div>
              </section>

              {isPixBlocked && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  Para produtos promocionais, o limite para pagamento via Pix é de até <strong>R$ 300,00</strong> no total.
                </div>
              )}

              <PaymentSection selected={paymentMethod} onChange={setPaymentMethod} total={total}/>
              <button
                type="button"
                className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isFormValid || isSubmitting}
                onClick={() => {
                  void handleFinishOrder();
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finalizando pedido...
                  </span>
                ) : (
                  "Enviar pedido"
                )}
              </button>
            </div>

            <OrderSummary shippingCost={shippingCost} isFreeShipping={isFreeShipping} />
          </div>
        )}
      </main>

      <Newsletter />
      <Footer />

      {items.length > 0 ? (
        <CheckoutSummaryBar
          total={total}
          disabled={!isFormValid || isSubmitting}
          loading={isSubmitting}
          onSubmit={() => {
            void handleFinishOrder();
          }}
        />
      ) : null}

      <Dialog
        open={pixModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handlePixModalClose();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pagamento Pix</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o codigo para concluir o pagamento.
            </DialogDescription>
          </DialogHeader>

          {pixError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {pixError}
            </div>
          ) : null}

          <div className="grid gap-4">
            <div className="text-sm font-semibold text-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>Status:</span>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${pixStatusClass}`}
                >
                  {pixStatus.label}
                </span>
              </div>
              {pixAmountLabel ? (
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  Valor: <span className="font-semibold text-foreground">{pixAmountLabel}</span>
                </p>
              ) : null}
              {pixTransactionId ? (
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  Pedido: <span className="font-semibold text-foreground">{pixTransactionId}</span>
                </p>
              ) : null}
              {pixStatus.tone === "success" ? (
                <p className="mt-1 text-xs font-normal text-emerald-700">
                  Pagamento confirmado! {isPixRedirecting ? "Redirecionando para novas ofertas..." : "Redirecionamento em instantes."}
                </p>
              ) : null}
              {pixTakingTooLong && !pixError && !pixResult?.paid ? (
                <p className="mt-1 text-xs font-normal text-destructive">
                  O banco ainda nao confirmou o pagamento. Caso ja tenha pago, aguarde alguns instantes.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
              {pixQrSrc ? (
                <img
                  src={pixQrSrc}
                  alt="QR Code para pagamento Pix"
                  className="h-44 w-44 rounded-md border border-border bg-background p-2"
                />
              ) : (
                <div className="flex h-44 w-44 items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground">
                  QR Code indisponivel
                </div>
              )}
              <p className="text-xs text-muted-foreground">Escaneie com o app do seu banco para finalizar o pagamento.</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">Codigo copia e cola</p>
              <textarea
                className="mt-2 h-28 w-full resize-none rounded-md border border-border bg-background p-3 text-sm font-mono"
                readOnly
                value={pixCopyCode || "Codigo nao disponivel"}
              />
              <Button className="mt-3 w-full" onClick={handleCopyPixCode} disabled={!pixCopyCode}>
                Copiar codigo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutPage;
