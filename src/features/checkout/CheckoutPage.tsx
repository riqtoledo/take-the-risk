import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import PersonalInfoSection, { PersonalInfo } from "./components/PersonalInfoSection";
import DeliverySection, { DeliveryMode, DeliveryAddressDetails } from "./components/DeliverySection";
import PaymentSection from "./components/PaymentSection";
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
import { criarPix, consultarPix } from "@/lib/pix-flow";
const STORAGE_KEY = "checkout_draft";

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
  const pixPollingRef = useRef<number | null>(null);
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
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    const payload = { personalInfo, deliveryMode, cep, addressDetails, addressConfirmed };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage write errors
    }
  }, [personalInfo, deliveryMode, cep, addressDetails, addressConfirmed]);

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
    };
  }, []);

  const isFreeShipping = subtotal >= 50;
  const shippingCost = useMemo(() => {
    if (isFreeShipping) return 0;
    return shippingEstimate?.price ?? 0;
  }, [isFreeShipping, shippingEstimate]);

  const total = useMemo(() => subtotal + (isFreeShipping ? 0 : shippingCost), [subtotal, shippingCost, isFreeShipping]);

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
    } catch (error: any) {
      if ((error as DOMException)?.name === "AbortError") {
        return;
      }
      if (shippingRequestRef.current !== controller) return;
      setCepError(error?.message ?? "Nao foi possivel calcular o frete.");
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
  const isFormValid = items.length > 0 && hasContactInfo && canSubmitDelivery;

  const stopPixPolling = () => {
    if (pixPollingRef.current) {
      window.clearInterval(pixPollingRef.current);
      pixPollingRef.current = null;
    }
  };

  const handlePixModalClose = () => {
    setPixModalOpen(false);
    stopPixPolling();
  };

  const startPixPolling = (transactionId: string) => {
    stopPixPolling();
    pixPollingRef.current = window.setInterval(async () => {
      try {
        const status = await consultarPix(transactionId);
        setPixResult((prev) => ({
          ...prev,
          ...status,
          pix: status.pix ?? prev?.pix,
        }));
        if (status.paid) {
          stopPixPolling();
          toast({
            title: "Pagamento confirmado!",
            description: "Obrigado pela sua compra. Voce recebera a confirmacao em seu e-mail.",
          });
        }
        setPixError(null);
      } catch (error: any) {
        const message =
          (error?.response?.data?.message as string | undefined) ??
          error?.message ??
          "Nao foi possivel atualizar o status do PIX.";
        setPixError(message);
      }
    }, 5000);
  };

  const handleFinishOrder = async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    const checkoutSnapshot = { personalInfo, deliveryMode, cep, addressDetails, addressConfirmed: true };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkoutSnapshot));
    } catch {
      // ignore storage errors
    }

    try {
      const amountInCents = Math.max(Math.round(total * 100), 0);
      const externalRef = `PED-${Date.now()}`;
      const payload = {
        name: personalInfo.name.trim(),
        email: personalInfo.email.trim(),
        phone: cleanedPhoneDigits,
        amount: amountInCents,
        description: `Pedido ${externalRef}`,
        externalRef,
      };

      const result = await criarPix(payload);
      const transactionId = (result as any).id ?? (result as any).paymentId;

      if (!transactionId) {
        throw new Error("Transacao PIX retornou dados inesperados.");
      }

      setPixResult(result);
      setPixError(null);
      setPixModalOpen(true);

      if (!result.paid) {
        startPixPolling(transactionId);
      } else {
        toast({
          title: "Pagamento confirmado!",
          description: "Obrigado pela sua compra.",
        });
      }
    } catch (error: any) {
      const message =
        (error?.response?.data?.message as string | undefined) ??
        error?.message ??
        "Nao foi possivel gerar o pagamento Pix. Tente novamente.";
      toast({
        title: "Erro ao gerar PIX",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pixCopyCode = pixResult?.pix?.copia_e_cola ?? "";
  const pixQrSrc = pixResult?.pix?.qrcode ?? "";
  const pixStatusLabel = pixResult
    ? pixResult.paid
      ? "✅ Pago"
      : `⏳ ${pixResult.status ?? "Pendente"}`
    : "Aguardando pagamento";

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
                <h2 className="text-base font-semibold text-foreground">Pacotes e prazos</h2>
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
              <PaymentSection />
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
              Status: <span className="font-normal">{pixStatusLabel}</span>
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
