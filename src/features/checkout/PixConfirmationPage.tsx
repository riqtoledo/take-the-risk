import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { getPixTransaction } from "@/lib/pix";
import { clearPixSession, loadPixSession, PixSession, savePixSession } from "./pixSession";

const CHECKOUT_STORAGE_KEY = "checkout_draft";
const PAYMENT_EXPIRATION_SECONDS = 55 * 60;
const POLLING_INTERVAL_MS = 10_000;

const PixConfirmationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { transactionId?: string } | null;
  const { clearCart } = useCart();

  const [session, setSession] = useState<PixSession | null>(null);
  const [expiresIn, setExpiresIn] = useState(PAYMENT_EXPIRATION_SECONDS);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pollError, setPollError] = useState<string | null>(null);
  const isCompletingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function initialise() {
      setIsInitializing(true);
      const stored = loadPixSession();

      if (stored) {
        if (mounted) {
          setSession(stored);
          setExpiresIn(PAYMENT_EXPIRATION_SECONDS);
        }
        setIsInitializing(false);
        return;
      }

      const transactionId = locationState?.transactionId;
      if (!transactionId) {
        navigate("/checkout", { replace: true });
        return;
      }

      try {
        const transaction = await getPixTransaction(transactionId);
        const hydrated: PixSession = {
          id: transaction.id,
          status: transaction.status,
          paid: Boolean(transaction.paid),
          amount: transaction.amount ?? 0,
          externalRef: transaction.externalRef ?? transactionId,
          pix: transaction.pix ?? { qrcode: "", copia_e_cola: undefined },
          createdAt: new Date().toISOString(),
        };
        savePixSession(hydrated);
        if (mounted) {
          setSession(hydrated);
          setExpiresIn(PAYMENT_EXPIRATION_SECONDS);
        }
      } catch (error: any) {
        const message = error?.message ?? "Nao foi possivel localizar o pagamento Pix.";
        toast({
          title: "Pagamento nao encontrado",
          description: message,
          variant: "destructive",
        });
        navigate("/checkout", { replace: true });
        return;
      } finally {
        if (mounted) setIsInitializing(false);
      }
    }

    void initialise();

    return () => {
      mounted = false;
    };
  }, [locationState, navigate]);

  useEffect(() => {
    if (!session) return;

    const id = window.setInterval(() => {
      setExpiresIn((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(id);
  }, [session?.id]);

  useEffect(() => {
    if (!session || session.paid) return;

    const interval = window.setInterval(async () => {
      try {
        const latest = await getPixTransaction(session.id);
        const updatedSession: PixSession = {
          ...session,
          status: latest.status,
          paid: Boolean(latest.paid),
          pix: latest.pix ?? session.pix,
        };
        setSession(updatedSession);
        savePixSession(updatedSession);
        setPollError(null);

        if (updatedSession.paid && !isCompletingRef.current) {
          isCompletingRef.current = true;
          clearPixSession();
          clearCart();
          try {
            localStorage.removeItem(CHECKOUT_STORAGE_KEY);
          } catch {
            // ignore storage errors
          }
          navigate("/checkout/obrigado", { replace: true, state: { externalRef: updatedSession.externalRef } });
        }
      } catch (error: any) {
        const message = error?.message ?? "Nao foi possivel atualizar o status do PIX.";
        setPollError(message);
      }
    }, POLLING_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [clearCart, navigate, session]);

  const formattedTime = useMemo(() => {
    const minutes = String(Math.floor(expiresIn / 60)).padStart(2, "0");
    const seconds = String(expiresIn % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [expiresIn]);

  const paymentCode = session?.pix.copia_e_cola ?? "";
  const qrCodeSrc = session?.pix.qrcode;
  const amountBRL = session?.amount
    ? (session.amount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : undefined;

  const handleCopyCode = async () => {
    if (!paymentCode) return;
    try {
      await navigator.clipboard.writeText(paymentCode);
      toast({ title: "Codigo copiado!", description: "Cole o codigo no app do seu banco para concluir o pagamento." });
    } catch {
      toast({
        title: "Nao foi possivel copiar",
        description: "Copie manualmente o codigo exibido.",
        variant: "destructive",
      });
    }
  };

  const handleBackToStore = () => {
    clearPixSession();
    try {
      localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    clearCart();
    navigate("/");
  };

  if (isInitializing || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-full max-w-xs rounded-2xl bg-primary px-6 py-8 text-center text-primary-foreground shadow-xl">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary-foreground/40 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold">Preparando pagamento</p>
          <p className="mt-1 text-sm text-primary-foreground/80">Carregando dados do seu PIX...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground">Pagamento Pix</h1>
                <p className="text-sm text-muted-foreground">Tempo restante {formattedTime}</p>
                <p className="mt-1 text-xs uppercase text-primary">Status: {session.paid ? "Pago" : session.status}</p>
                {pollError ? <p className="mt-1 text-xs text-destructive">Falha ao atualizar: {pollError}</p> : null}
              </div>
              <div className="relative h-12 w-12 rounded-full bg-primary/10">
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-primary">Pix</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-xl border border-dashed border-primary/60 bg-primary/5 p-4 text-center">
                <p className="text-sm font-semibold text-foreground">Copie o codigo de pagamento</p>
                <input
                  value={paymentCode || "Codigo nao disponivel"}
                  readOnly
                  className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-center text-sm font-mono"
                />
                <Button type="button" className="mt-3 w-full" onClick={handleCopyCode} disabled={!paymentCode}>
                  Copiar codigo
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Abra o app do seu banco, escolha Pix &gt; Colar codigo, confira os dados e conclua.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-primary/60 bg-primary/5 p-4 text-center">
                <p className="text-sm font-semibold text-foreground">Escaneie o QR code</p>
                <div className="mt-3 flex items-center justify-center">
                  {qrCodeSrc ? (
                    <img
                      src={qrCodeSrc}
                      alt="QR Code para pagamento Pix"
                      className="h-44 w-44 rounded-lg border border-border bg-background object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-44 w-44 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground">
                      QR code indisponivel
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Use a camera do seu banco em outro dispositivo para escanear o codigo acima.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
            <p>
              Valor do pedido:{" "}
              <strong className="text-foreground">
                {amountBRL ?? "Valor indisponivel"}
              </strong>
            </p>
            <p className="mt-2">
              Assim que recebermos a confirmacao do pagamento, enviaremos os detalhes para o seu e-mail.
            </p>
            <Button type="button" variant="ghost" className="mt-4 w-full" onClick={handleBackToStore}>
              Voltar para a loja
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PixConfirmationPage;
