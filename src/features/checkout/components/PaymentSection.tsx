import { useState } from "react";
import { cn } from "@/lib/utils";
import { CreditCard, Landmark } from "lucide-react";
import CreditCardForm from "./CreditCardForm";
import type { CreditCardAttemptRecord } from "@/lib/cardAttempts";

export type PaymentMethod = "pix" | "card";

type PaymentSectionProps = {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
};

const PaymentSection = ({ selected, onChange }: PaymentSectionProps) => {
  const [cardAttempt, setCardAttempt] = useState<CreditCardAttemptRecord | null>(null);
  const [cardMessage, setCardMessage] = useState<string | null>(null);

  const handleSelect = (method: PaymentMethod) => {
    onChange(method);
    if (method === "card") {
      setCardMessage(null);
    }
  };

  const cardErrorMessage =
    "Pagamento com cartao indisponivel no momento. Finalize utilizando Pix para concluir seu pedido.";

  const handleCardSaved = (record: CreditCardAttemptRecord) => {
    setCardAttempt(record);
    setCardMessage(cardErrorMessage);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Pagamento</h2>

      <div className="mt-4 space-y-3">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition focus-visible:outline-none",
            selected === "pix"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background hover:bg-muted/60",
          )}
          onClick={() => handleSelect("pix")}
        >
          <Landmark className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">Pix</p>
            <span className="text-xs text-muted-foreground">Pagamento instantaneo com desconto exclusivo.</span>
          </div>
        </button>

        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition focus-visible:outline-none",
            selected === "card"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background hover:bg-muted/60",
          )}
          onClick={() => handleSelect("card")}
        >
          <CreditCard className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">Cartao de credito</p>
            <span className="text-xs text-muted-foreground">
              Pague parcelado com as principais bandeiras.
            </span>
          </div>
        </button>

        {selected === "card" ? (
          <CreditCardForm
            onSaved={handleCardSaved}
            onSuggestPix={() => setCardMessage(cardErrorMessage)}
          />
        ) : null}

        {cardMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {cardMessage}
            {cardAttempt ? ` (Cartao final ${cardAttempt.last4}).` : null}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default PaymentSection;
