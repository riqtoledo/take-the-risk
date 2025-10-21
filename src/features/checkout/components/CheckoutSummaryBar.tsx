import { Button } from "@/components/ui/button";

type CheckoutSummaryBarProps = {
  total: number;
  disabled?: boolean;
  onSubmit: () => void;
};

const CheckoutSummaryBar = ({ total, disabled, onSubmit }: CheckoutSummaryBarProps) => (
  <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur">
    <div className="container mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase text-muted-foreground">Total a pagar</p>
        <p className="text-2xl font-semibold text-foreground">
          {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>
      <Button size="lg" className="w-full sm:w-auto" onClick={onSubmit} disabled={disabled}>
        Finalizar compra
      </Button>
    </div>
  </div>
);

export default CheckoutSummaryBar;
