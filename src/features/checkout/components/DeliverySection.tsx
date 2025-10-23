import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DeliveryMode = "delivery" | "pickup";

export type DeliveryAddressDetails = {
  street: string;
  number: string;
  complement: string;
  reference: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
};

type DeliverySectionProps = {
  mode: DeliveryMode;
  onModeChange: (mode: DeliveryMode) => void;
  cep: string;
  onCepChange: (cep: string) => void;
  onCalculateShipping: () => void;
  isCalculating: boolean;
  cepError?: string | null;
  addressSummary?: string | null;
  addressDetails: DeliveryAddressDetails;
  onAddressDetailsChange: (details: DeliveryAddressDetails) => void;
  onConfirmAddress: () => void;
  onEditAddress: () => void;
  isAddressConfirmed: boolean;
  isFreeShipping: boolean;
  shippingCost: number;
};

const DeliverySection = ({
  mode,
  onModeChange,
  cep,
  onCepChange,
  onCalculateShipping,
  isCalculating,
  cepError,
  addressSummary,
  addressDetails,
  onAddressDetailsChange,
  onConfirmAddress,
  onEditAddress,
  isAddressConfirmed,
  isFreeShipping,
  shippingCost,
}: DeliverySectionProps) => {
  const formattedShipping = shippingCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const freeMessage = isFreeShipping ? "Frete gratis garantido para pedidos acima de R$ 50,00!" : null;

  const handleDetailChange =
    (field: keyof DeliveryAddressDetails) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      onAddressDetailsChange({
        ...addressDetails,
        [field]: field === "number" ? value.replace(/\D/g, "") : value,
      });
    };

  const showAddressForm = mode === "delivery" && cep.replace(/\D/g, "").length === 8;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Entrega</h2>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "delivery" ? "default" : "outline"}
          onClick={() => onModeChange("delivery")}
          className="min-w-[120px] flex-1"
        >
          Entregar
        </Button>
        <Button
          type="button"
          variant={mode === "pickup" ? "default" : "outline"}
          onClick={() => onModeChange("pickup")}
          className="min-w-[120px] flex-1"
        >
          Retirar
        </Button>
      </div>

      {mode === "delivery" ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="checkout-cep">CEP para entrega</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="checkout-cep"
                placeholder="00000-000"
                value={cep}
                onChange={(event) => onCepChange(event.target.value)}
                disabled={isCalculating}
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="secondary"
                className="sm:w-32"
                onClick={onCalculateShipping}
                disabled={isCalculating || cep.replace(/\D/g, "").length < 8}
              >
                {isCalculating ? "Carregando..." : "Buscar"}
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">Informe o CEP e clique em buscar.</span>
            {cepError ? <span className="text-xs font-medium text-destructive">{cepError}</span> : null}
            {addressSummary ? <span className="text-xs text-muted-foreground">{addressSummary}</span> : null}
          </div>

          <div className="rounded-md border border-dashed border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            {freeMessage ?? `Frete estimado: ${formattedShipping}`}
          </div>

          {showAddressForm ? (
            <div
              className={`grid gap-3 rounded-lg border border-border/60 p-4 transition ${
                isAddressConfirmed ? "bg-muted/40" : "bg-muted/20"
              }`}
            >
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr] sm:gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="checkout-street">Endereco</Label>
                  <Input
                    id="checkout-street"
                    value={addressDetails.street}
                    onChange={handleDetailChange("street")}
                    placeholder="Rua / Avenida"
                    readOnly={isAddressConfirmed}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="checkout-number">Numero</Label>
                  <Input
                    id="checkout-number"
                    value={addressDetails.number}
                    onChange={handleDetailChange("number")}
                    placeholder="000"
                    inputMode="numeric"
                    readOnly={isAddressConfirmed}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="checkout-complement">Complemento</Label>
                  <Input
                    id="checkout-complement"
                    value={addressDetails.complement}
                    onChange={handleDetailChange("complement")}
                    placeholder="Apartamento, bloco..."
                    readOnly={isAddressConfirmed}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="checkout-reference">Referencia</Label>
                  <Input
                    id="checkout-reference"
                    value={addressDetails.reference}
                    onChange={handleDetailChange("reference")}
                    placeholder="Ponto de referencia"
                    readOnly={isAddressConfirmed}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="checkout-neighborhood">Bairro</Label>
                  <Input
                    id="checkout-neighborhood"
                    value={addressDetails.neighborhood}
                    onChange={handleDetailChange("neighborhood")}
                    placeholder="Bairro"
                    readOnly={isAddressConfirmed}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="checkout-city">Cidade</Label>
                  <Input
                    id="checkout-city"
                    value={addressDetails.city}
                    onChange={handleDetailChange("city")}
                    placeholder="Cidade"
                    readOnly={isAddressConfirmed}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="checkout-state">Estado</Label>
                  <Input
                    id="checkout-state"
                    value={addressDetails.state}
                    onChange={handleDetailChange("state")}
                    placeholder="UF"
                    readOnly={isAddressConfirmed}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="checkout-country">Pais</Label>
                  <Input
                    id="checkout-country"
                    value={addressDetails.country}
                    onChange={handleDetailChange("country")}
                    placeholder="Pais"
                    readOnly={isAddressConfirmed}
                  />
                </div>
              </div>

              <Button
                type="button"
                className="mt-2 w-full sm:w-auto"
                onClick={isAddressConfirmed ? onEditAddress : onConfirmAddress}
                variant={isAddressConfirmed ? "secondary" : "default"}
              >
                {isAddressConfirmed ? "Editar endereco" : "Confirmar endereco"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          Para produtos promocionais a retirada esta indisponivel. Escolha entrega para continuar.
        </div>
      )}
    </section>
  );
};

export default DeliverySection;
