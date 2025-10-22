import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { CartProvider } from "@/context/CartContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CheckoutPage from "@/features/checkout/CheckoutPage";
import PixConfirmationPage from "@/features/checkout/PixConfirmationPage";
import PixThankYouPage from "@/features/checkout/PixThankYouPage";
import PixCheckout from "@/features/checkout/PixCheckout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product/:id" element={<Index />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/pix/manual" element={<PixCheckout />} />
            <Route path="/checkout/pix" element={<PixConfirmationPage />} />
            <Route path="/checkout/obrigado" element={<PixThankYouPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
