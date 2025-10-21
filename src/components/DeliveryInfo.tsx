import React, { useState } from "react";
import { MapPin, Info } from "lucide-react";
import {
  calculateShippingEstimate,
  cleanCep,
  fetchAddressByCep,
  formatCep,
  stringifyAddress,
  ViaCepResult,
} from "@/lib/shipping";

const DeliveryInfo = () => {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<ViaCepResult | null>(null);
  const [shipping, setShipping] = useState<{ price: number; days: number } | null>(null);

  const rawCep = cleanCep(cep);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCep(formatCep(event.target.value));
    setError(null);
    setAddress(null);
    setShipping(null);
  };

  const handleCalculate = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);
    setAddress(null);
    setShipping(null);

    if (rawCep.length !== 8) {
      setError("CEP invalido. Informe 8 digitos.");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchAddressByCep(rawCep);
      setAddress(data);
      setShipping(calculateShippingEstimate(rawCep));
    } catch (err: any) {
      setError(err?.message ?? "Erro ao consultar CEP. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-y border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <h3 className="mb-3 font-semibold text-foreground">Informacoes de entrega</h3>

        <form onSubmit={handleCalculate} className="mb-3">
          <div className="flex items-center gap-3">
            <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Calcular frete</p>

              <div className="mt-2 flex gap-2">
                <input
                  aria-label="CEP"
                  value={cep}
                  onChange={handleChange}
                  placeholder="00000-000"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-60"
                >
                  {loading ? "calculando..." : "ok"}
                </button>
              </div>

              {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
              {address ? <p className="mt-2 text-xs text-muted-foreground">{stringifyAddress(address)}</p> : null}
            </div>
          </div>
        </form>

        <div className="flex items-start gap-3 rounded-md bg-accent p-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-xs text-foreground">Nao sei meu CEP</p>
            <a
              className="mt-1 inline-block text-xs text-primary underline"
              href="https://buscacepinter.correios.com.br/app/endereco/index.php"
              target="_blank"
              rel="noreferrer"
            >
              Encontrar CEP
            </a>
          </div>
        </div>

        {shipping ? (
          <div className="mt-3 rounded-md border bg-muted p-3">
            <p className="text-sm font-medium">Frete estimado</p>
            <p className="text-sm">
              Valor: R$ {shipping.price.toFixed(2)} • Prazo: {shipping.days} dias uteis
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DeliveryInfo;
