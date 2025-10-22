import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePixPayment } from "@/hooks/usePixPayment";
import { toast } from "@/components/ui/use-toast";

type FormState = {
  orderId: string;
  description: string;
  payerName: string;
  payerDocument: string;
};

const formatCurrency = (valueInCents: number) =>
  (valueInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const FINAL_SUCCESS = new Set(["PAID", "PAID_OUT"]);

const normalizeDigits = (value: string) => value.replace(/\D/g, "");

const PixCheckout = () => {
  const navigate = useNavigate();
  const [amountInput, setAmountInput] = useState("1990");
  const [formState, setFormState] = useState<FormState>({
    orderId: "",
    description: "",
    payerName: "",
    payerDocument: "",
  });

  const amountInCents = useMemo(() => {
    const digits = normalizeDigits(amountInput);
    return digits.length ? parseInt(digits, 10) : 0;
  }, [amountInput]);

  const formattedAmount = useMemo(() => formatCurrency(amountInCents), [amountInCents]);

  const {
    charge,
    status,
    loading,
    error,
    startPayment,
    reset,
    isFinal,
  } = usePixPayment({
    pollIntervalMs: 5000,
    onStatusChange: (currentStatus) => {
      if (FINAL_SUCCESS.has(currentStatus)) {
        toast({
          title: "Pagamento confirmado!",
          description: "Redirecionando para a pagina de obrigado...",
        });
        setTimeout(() => {
          navigate("/checkout/obrigado", { state: { orderId: formState.orderId } });
        }, 1500);
      }
    },
  });

  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  useEffect(() => {
    if (!charge?.expiresAt) {
      setExpiresIn(null);
      return;
    }
    const expiration = new Date(charge.expiresAt).getTime();
    const tick = () => {
      const diff = Math.round((expiration - Date.now()) / 1000);
      setExpiresIn(diff > 0 ? diff : 0);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [charge?.expiresAt]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Erro no PIX",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (amountInCents <= 0) {
      toast({
        title: "Valor invalido",
        description: "Informe um valor maior que zero.",
        variant: "destructive",
      });
      return;
    }
    if (!formState.orderId.trim()) {
      toast({
        title: "Pedido obrigatorio",
        description: "Informe o identificador do pedido.",
        variant: "destructive",
      });
      return;
    }
    try {
      await startPayment({
        orderId: formState.orderId.trim(),
        amount: amountInCents,
        description: formState.description || `Pedido ${formState.orderId}`.trim(),
        payer: {
          name: formState.payerName || undefined,
          document: normalizeDigits(formState.payerDocument) || undefined,
        },
      });
    } catch {
      // erro ja tratado pelo hook/toast
    }
  };

  const handleReset = () => {
    reset();
    setAmountInput("0");
  };

  const isPaid = status ? FINAL_SUCCESS.has(status) : false;

  const qrCodeSrc = charge?.qrCodeBase64 ? `data:image/png;base64,${charge.qrCodeBase64}` : "";

  return (
    <div className="min-h-screen bg-background py-10 text-foreground">
      <div className="container mx-auto max-w-3xl px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Gerar pagamento PIX</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orderId">ID do pedido</Label>
                  <Input
                    id="orderId"
                    aria-required="true"
                    placeholder="PED-12345"
                    value={formState.orderId}
                    onChange={(event) => setFormState((prev) => ({ ...prev, orderId: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" aria-live="polite">
                    Valor (BRL)
                  </Label>
                  <Input
                    id="amount"
                    inputMode="numeric"
                    aria-required="true"
                    value={formattedAmount}
                    onChange={(event) => {
                      const digits = normalizeDigits(event.target.value);
                      setAmountInput(digits);
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="description">Descricao</Label>
                  <Input
                    id="description"
                    placeholder="Descricao opcional"
                    value={formState.description}
                    onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payerName">Nome do pagador</Label>
                  <Input
                    id="payerName"
                    placeholder="Cliente Teste"
                    value={formState.payerName}
                    onChange={(event) => setFormState((prev) => ({ ...prev, payerName: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2 md:w-1/2">
                <Label htmlFor="payerDocument">CPF/CNPJ do pagador</Label>
                <Input
                  id="payerDocument"
                  inputMode="numeric"
                  placeholder="Somente numeros"
                  value={formState.payerDocument}
                  onChange={(event) => setFormState((prev) => ({ ...prev, payerDocument: event.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && !isFinal ? "Gerando PIX..." : "Gerar PIX"}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} disabled={loading && !isFinal}>
                  Limpar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {charge ? (
          <Card className="space-y-4 p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="text-lg font-bold text-foreground" aria-live="polite">
                  {status ?? "DESCONHECIDO"}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>ID: {charge.paymentId}</p>
                <p>Valor: {formatCurrency(charge.amount ?? amountInCents)}</p>
                {expiresIn !== null ? <p>Expira em: {formatTimer(expiresIn)}</p> : null}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Escaneie o QR Code</p>
                {qrCodeSrc ? (
                  <img
                    src={qrCodeSrc}
                    alt="QR Code para pagamento PIX"
                    className="h-56 w-56 rounded-xl border border-border bg-background p-2 shadow-sm"
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
                    QR Code indisponivel
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Codigo copia e cola</p>
                <textarea
                  aria-label="Codigo copia e cola do PIX"
                  className="h-40 w-full resize-none rounded-md border border-border bg-background p-3 text-sm font-mono leading-relaxed"
                  readOnly
                  value={charge.copyAndPaste || "Codigo indisponivel"}
                />
                <Button
                  type="button"
                  onClick={async () => {
                    if (!charge.copyAndPaste) return;
                    try {
                      await navigator.clipboard.writeText(charge.copyAndPaste);
                      toast({ title: "Codigo copiado!", description: "Cole no app do seu banco para concluir o pagamento." });
                    } catch {
                      toast({
                        title: "Falha ao copiar",
                        description: "Copie manualmente o codigo exibido.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!charge.copyAndPaste}
                >
                  Copiar codigo
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {isFinal ? (
          <Card className="mt-6 border-primary/40 bg-primary/10 p-4 text-sm text-primary">
            <p>
              Pagamento finalizado com status <strong>{status}</strong>. Consulte o painel da Ultrapayments para confirmar a
              liquidacao.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default PixCheckout;
