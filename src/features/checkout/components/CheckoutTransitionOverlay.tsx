import { cn } from "@/lib/utils";

type CheckoutTransitionOverlayProps = {
  visible: boolean;
  message?: string;
};

const CheckoutTransitionOverlay = ({ visible, message = "Carregando..." }: CheckoutTransitionOverlayProps) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur">
      <div className="rounded-2xl bg-primary px-6 py-5 text-center text-primary-foreground shadow-xl">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-foreground/40 border-t-transparent" />
        <p className="mt-3 text-base font-semibold">{message}</p>
        <p className="mt-1 text-xs text-primary-foreground/80">Aguarde, estamos preparando seu checkout.</p>
      </div>
    </div>
  );
};

export default CheckoutTransitionOverlay;
