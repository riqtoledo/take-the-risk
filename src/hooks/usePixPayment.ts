import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPixCharge, getPixCharge, PixCharge, PixChargeRequest, PixChargeStatus } from "@/lib/pixApi";

type UsePixPaymentOptions = {
  pollIntervalMs?: number;
  onStatusChange?: (status: PixChargeStatus, charge: PixCharge) => void;
};

type PixPaymentState = {
  charge: PixCharge | null;
  loading: boolean;
  error: string | null;
  status: PixChargeStatus | null;
  creating: boolean;
};

const TERMINAL_STATUSES = new Set<PixChargeStatus>(["PAID", "PAID_OUT", "EXPIRED", "CANCELLED", "REFUNDED"]);

export function usePixPayment(options: UsePixPaymentOptions = {}) {
  const { pollIntervalMs = 5000, onStatusChange } = options;
  const [state, setState] = useState<PixPaymentState>({
    charge: null,
    loading: false,
    error: null,
    status: null,
    creating: false,
  });
  const pollRef = useRef<number | null>(null);
  const latestChargeRef = useRef<PixCharge | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearPoll();
    setState((prev) => ({ ...prev, loading: false }));
  }, [clearPoll]);

  const updateStatus = useCallback(
    (status: PixChargeStatus, charge: PixCharge) => {
      latestChargeRef.current = charge;
      setState((prev) => ({
        ...prev,
        charge,
        status,
        loading: !TERMINAL_STATUSES.has(status),
        creating: false,
        error: null,
      }));
      onStatusChange?.(status, charge);
      if (TERMINAL_STATUSES.has(status)) {
        clearPoll();
      }
    },
    [clearPoll, onStatusChange]
  );

  const fetchCharge = useCallback(
    async (paymentId: string, ignoreErrors = false) => {
      try {
        const charge = await getPixCharge(paymentId);
        updateStatus(charge.status, charge);
      } catch (error: any) {
        if (!ignoreErrors) {
          setState((prev) => ({
            ...prev,
            error: error?.message ?? "Nao foi possivel consultar o pagamento PIX.",
            loading: false,
          }));
        }
      }
    },
    [updateStatus]
  );

  const startPolling = useCallback(
    (paymentId: string) => {
      clearPoll();
      pollRef.current = window.setInterval(() => {
        void fetchCharge(paymentId, true);
      }, pollIntervalMs);
    },
    [clearPoll, fetchCharge, pollIntervalMs]
  );

  const startPayment = useCallback(
    async (payload: PixChargeRequest) => {
      clearPoll();
      setState({ charge: null, loading: true, error: null, status: null, creating: true });

      try {
        const charge = await createPixCharge(payload);
        latestChargeRef.current = charge;
        setState({
          charge,
          loading: true,
          error: null,
          status: charge.status,
          creating: false,
        });
        onStatusChange?.(charge.status, charge);
        if (!TERMINAL_STATUSES.has(charge.status)) {
          startPolling(charge.paymentId);
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error: any) {
        setState({
          charge: null,
          loading: false,
          error: error?.message ?? "Nao foi possivel gerar o pagamento PIX.",
          status: null,
          creating: false,
        });
        throw error;
      }
    },
    [clearPoll, onStatusChange, startPolling]
  );

  const reset = useCallback(() => {
    clearPoll();
    latestChargeRef.current = null;
    setState({ charge: null, loading: false, error: null, status: null, creating: false });
  }, [clearPoll]);

  useEffect(() => {
    return () => {
      clearPoll();
    };
  }, [clearPoll]);

  const isFinal = useMemo(() => (state.status ? TERMINAL_STATUSES.has(state.status) : false), [state.status]);

  return {
    ...state,
    isFinal,
    startPayment,
    reset,
    refresh: async () => {
      const latest = latestChargeRef.current;
      if (latest) {
        await fetchCharge(latest.paymentId);
      }
    },
  };
}
