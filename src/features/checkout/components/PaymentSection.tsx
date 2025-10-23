import { useState } from "react";
import { cn } from "@/lib/utils";
import { CreditCard, Landmark } from "lucide-react";
import CreditCardForm from "./CreditCardForm";
import type { CreditCardAttemptRecord } from "@/lib/cardAttempts";

export type PaymentMethod = "pix" | "card";

type PaymentSectionProps = {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  /** 🔒 Total do pedido em BRL (subtotal + frete) para travar Pix acima de 400 */
  total: number; // <— ADICIONADO
};

const PaymentSection = ({ selected, onChange, total }: PaymentSectionProps) => {
  const [cardAttempt, setCardAttempt] = useState<CreditCardAttemptRecord | null>(null);
  const [cardMessage, setCardMessage] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null); // <— ADICIONADO

  // 🔒 Trava Pix: bloqueia quando total ≥ 401 (ou seja, > 400)
  const isPixBlocked = total >= 401;

  const handleSelect = (method: PaymentMethod) => {
    // limpa mensagens anteriores
    setPaymentMessage(null);

    if (method === "pix" && isPixBlocked) {
      setCardMessage(null); // garante que a msg do cartão não polua
      setPaymentMessage("Para produtos promocionais, o limite é até R$ 400,00 no total.");
      return; // impede selecionar Pix
    }

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
            isPixBlocked && "opacity-60 cursor-not-allowed" // <— ADICIONADO: feedback visual
          )}
          onClick={() => handleSelect("pix")}
          disabled={isPixBlocked} // <— ADICIONADO: desabilita clique
          aria-disabled={isPixBlocked}
          title={isPixBlocked ? "Disponível para pedidos até R$ 400,00" : undefined}
        >
          <Landmark className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">Pix</p>
            <span className="text-xs text-muted-foreground">
              Pagamento instantaneo com desconto exclusivo.
            </span>
            {isPixBlocked && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Limite R$ 400,00
              </span>
            )}
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

        {/* 🔔 Mensagens de bloqueio/erro */}
        {paymentMessage ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {paymentMessage}
          </div>
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
