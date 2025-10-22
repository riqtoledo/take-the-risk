import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  calculateShippingEstimate,
  cleanCep,
  fetchAddressByCep,
  formatCep,
  stringifyAddress,
  ShippingEstimate,
  ViaCepResult,
} from "@/lib/shipping";
import { createPixTransaction } from "@/lib/pix";
import { savePixSession } from "./pixSession";

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

  const [isCalculatingCep, setIsCalculatingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [address, setAddress] = useState<ViaCepResult | null>(null);
  const [shippingEstimate, setShippingEstimate] = useState<ShippingEstimate | null>(null);
  const [addressDetails, setAddressDetails] = useState<DeliveryAddressDetails>(defaultAddressDetails);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const isFormValid = items.length > 0 && hasContactInfo && canSubmitDelivery && paymentMethod === "pix";

  const handleFinishOrder = async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    const checkoutSnapshot = { personalInfo, deliveryMode, cep, addressDetails, addressConfirmed: true };
    const cleanedPhone = cleanedPhoneDigits;

    const orderTotal = total;
    const amountInCents = Math.max(Math.round(orderTotal * 100), 0);
    const externalRef = `PED-${Date.now()}`;
    const description = `Pedido ${externalRef}`;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkoutSnapshot));
    } catch {
      // ignore storage errors
    }

    try {
      const transaction = await createPixTransaction({
        name: personalInfo.name.trim(),
        email: personalInfo.email.trim(),
        phone: cleanedPhone,
        amount: amountInCents,
        description,
        externalRef,
      });

      const pixSession = {
        id: transaction.id,
        status: transaction.status,
        paid: transaction.paid ?? false,
        amount: transaction.amount ?? amountInCents,
        externalRef,
        pix: transaction.pix,
        snapshot: checkoutSnapshot,
        createdAt: new Date().toISOString(),
      };

      savePixSession(pixSession);

      navigate("/checkout/pix", { state: { transactionId: transaction.id } });
    } catch (error: any) {
      const message = error?.message ?? "Nao foi possivel gerar o pagamento Pix. Tente novamente.";
      toast({
        title: "Erro ao gerar PIX",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
              <PaymentSection selected={paymentMethod} onChange={setPaymentMethod} />
              <div className="rounded-xl border border-border bg-primary/10 p-4 text-sm font-semibold text-primary">
                Finalize com Pix para confirmar seu pedido imediatamente.
              </div>
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
                    Gerando PIX...
                  </span>
                ) : (
                  "Finalizar compra"
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
    </div>
  );
};

export default CheckoutPage;
