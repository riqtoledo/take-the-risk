import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

import { CartProvider } from "@/context/CartContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CheckoutPage from "@/features/checkout/CheckoutPage";
import UpsellPage from "./pages/Upsell";

// ---------- META PIXEL ----------
const PIXEL_ID = "1092689726277143";

function MetaPixel() {
  useEffect(() => {
    if (window.fbq?.loaded) return;
    (function (f: any, b: Document, e: string, v: string, n?: any, t?: HTMLScriptElement, s?: Element) {
      if (f.fbq) return;
      n = f.fbq = function () {
        (n as any).callMethod ? (n as any).callMethod.apply(n, arguments) : (n as any).queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      (n as any).push = (n as any);
      (n as any).loaded = true;
      (n as any).version = "2.0";
      (n as any).queue = [];
      t = b.createElement(e) as HTMLScriptElement;
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0]!;
      s.parentNode!.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq!("init", PIXEL_ID);
    window.fbq!("track", "PageView");
  }, []);

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

// ---------- TRACK PAGEVIEW EM CADA ROTA ----------
function MetaPageView() {
  const location = useLocation();
  useEffect(() => {
    if (typeof window.fbq === "function") window.fbq("track", "PageView");
  }, [location.pathname]);
  return null;
}

// ---------- APP ----------
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
        <HashRouter>
          <MetaPixel />
          <MetaPageView />

          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product/:id" element={<Index />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/upsell" element={<UpsellPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
