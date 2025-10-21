import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type LocationState = {
  externalRef?: string;
};

const PixThankYouPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { externalRef } = (location.state as LocationState | null) ?? {};

  useEffect(() => {
    if (!externalRef) {
      navigate("/", { replace: true });
    }
  }, [externalRef, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">Pagamento confirmado!</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Recebemos o pagamento do seu pedido {externalRef ? <strong className="text-foreground">{externalRef}</strong> : null}.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Enviaremos em breve uma confirmacao por e-mail com os detalhes do seu pedido.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate("/")} className="sm:w-auto">
              Voltar para a loja
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PixThankYouPage;
