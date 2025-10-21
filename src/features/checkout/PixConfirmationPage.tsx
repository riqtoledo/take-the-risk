import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const PAYMENT_CODE = "00020126580014br.gov.bcb.pix0195";

const STORAGE_KEY = "checkout_draft";

const PixConfirmationPage = () => {
  const navigate = useNavigate();
  const { subtotal, clearCart } = useCart();
  const [expiresIn, setExpiresIn] = useState(55 * 60);
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsPreparing(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setExpiresIn((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const formattedTime = useMemo(() => {
    const minutes = String(Math.floor(expiresIn / 60)).padStart(2, "0");
    const seconds = String(expiresIn % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [expiresIn]);

  if (isPreparing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-full max-w-xs rounded-2xl bg-primary px-6 py-8 text-center text-primary-foreground shadow-xl">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary-foreground/40 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold">Aguarde...</p>
          <p className="mt-1 text-sm text-primary-foreground/80">Estamos finalizando sua compra.</p>
        </div>
      </div>
    );
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_CODE);
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    clearCart();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground">Pagamento Pix</h1>
                <p className="text-sm text-muted-foreground">Tempo restante {formattedTime}</p>
              </div>
              <div className="relative h-12 w-12 rounded-full bg-primary/10">
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-primary">Pix</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-xl border border-dashed border-primary/60 bg-primary/5 p-4 text-center">
                <p className="text-sm font-semibold text-foreground">Copie o codigo de pagamento</p>
                <input
                  value={PAYMENT_CODE}
                  readOnly
                  className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-center text-sm font-mono"
                />
                <Button type="button" className="mt-3 w-full" onClick={handleCopyCode}>
                  Copiar codigo
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Abra o app do seu banco, escolha Pix &gt; Colar codigo, confira os dados e conclua.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-primary/60 bg-primary/5 p-4 text-center">
                <p className="text-sm font-semibold text-foreground">Escaneie o QR code</p>
                <div className="mt-3 flex items-center justify-center">
                  <div className="h-44 w-44 rounded-lg border border-border bg-muted" />
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
                {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
