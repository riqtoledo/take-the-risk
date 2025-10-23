import { useEffect, useState } from "react";
import { Menu, Search, ShoppingCart, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

import "@/styles/Header.css";
import logo from "@/assets/logo_paguemenos.png.webp";
import { useCart } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";

function Header() {
  const [open, setOpen] = useState<boolean>(false);
  const [region, setRegion] = useState<string | null>(null);
  const [cep, setCep] = useState<string>("");
  const [openCepDialog, setOpenCepDialog] = useState<boolean>(false);
  const [loadingCep, setLoadingCep] = useState<boolean>(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const { totalQuantity, openCart, setCartOpen: setCartOpenState, isCartOpen } = useCart();

  // load saved CEP/region
  useEffect(() => {
    try {
      const savedCep = localStorage.getItem("pague_menos_cep");
      const savedRegion = localStorage.getItem("pague_menos_region");
      if (savedRegion) setRegion(savedRegion);
      if (savedCep) setCep(savedCep);
    } catch (e) {
      // ignore
    }
  }, []);

  async function fetchRegionFromCep(cleanCep: string) {
    setLoadingCep(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!res.ok) throw new Error("CEP lookup failed");
      const data = await res.json();
      if (data.erro) throw new Error("CEP não encontrado");
      const regionName = data.localidade && data.uf ? `${data.localidade} - ${data.uf}` : data.uf || data.localidade || "Região";
      setRegion(regionName);
      try {
        localStorage.setItem("pague_menos_cep", cleanCep);
        localStorage.setItem("pague_menos_region", regionName);
      } catch (e) {
        // ignore storage errors
      }
      setOpenCepDialog(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao buscar CEP";
      setCepError(message);
    } finally {
      setLoadingCep(false);
    }
  }

  const categories = [
    "Serviços de Saúde",
    "Dermo e Beleza",
    "Conveniência",
    "Vida Saudável",
    "Higiene e Beleza",
    "Mamães e Bebês",
    "Manipulação",
    "Medicamentos e Saúde",
    "Medicamentos Especiais",
  ];

  return (
    <>
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-2">
          <div className="promo-marquee rounded-full bg-primary text-primary-foreground px-4 py-1 text-xs md:text-sm font-semibold uppercase tracking-wide">
            <span className="promo-marquee__inner">
              produtos promocionais com frete gratis ate o fim de dezembro | aproveite e garanta suas ofertas agora mesmo | produtos promocionais com frete gratis ate o fim de dezembro
            </span>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm site-header">
        <div className="container mx-auto px-4">
          <Dialog open={openCepDialog} onOpenChange={(v) => setOpenCepDialog(v)}>
          {/* top row: menu, logo, cart */}
          <div className="flex items-center justify-between h-14 gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] sm:w-[320px] p-0"
              >
                <div className="flex flex-col h-full">
                  {/* Header do menu */}
                  <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="h-5 w-5 text-primary" />
                      <span className="text-foreground font-medium">
                        Olá, Bem vindo!
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 rounded-full font-bold">
                        ENTRAR
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-full font-bold border-2"
                      >
                        CADASTRAR
                      </Button>
                    </div>
                  </div>

                  {/* Categorias */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                      <h2 className="font-bold text-foreground mb-4">
                        Todas as Categorias
                      </h2>

                      {/* Ofertas especiais */}
                      <div className="mb-4 py-3 px-4 bg-destructive/10 rounded-lg">
                        <span className="text-destructive font-bold">
                          Ofertas com até 70% Off
                        </span>
                      </div>

                      {/* Lista de categorias */}
                      <nav className="space-y-1">
                        {categories.map((category, index) => (
                          <button
                            key={index}
                            className="w-full flex items-center justify-between py-3 px-2 text-left text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                            onClick={() => setOpen(false)}
                          >
                            <span className="text-sm">{category}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <img src={logo} alt="Pague Menos" className="h-8 w-auto mx-auto" />
            </div>

            <div className="flex items-center gap-2">

              <div className="hidden md:block w-[420px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="O que você procura?" className="pl-10 bg-background" />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={openCart}
                aria-label="Abrir carrinho"
              >
                <ShoppingCart className="h-5 w-5 text-secondary" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-card text-xs flex items-center justify-center font-bold">
                  {totalQuantity}
                </span>
              </Button>
            </div>
          </div>

          {/* second row simplified: mobile search only (tabs removed) */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 py-3">
            <div className="flex-1 md:hidden w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="O que você procura?" className="pl-10 bg-background" />
              </div>
            </div>
            {/* tabs removed per request */}
          </div>



          {/* Dialog content (shared) */}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Informe seu CEP</DialogTitle>
              <DialogDescription>Informe seu CEP para ver ofertas exclusivas da sua região.</DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <Input
                placeholder="00000-000"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="w-full max-w-xs"
              />
            </div>

            <DialogFooter>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setOpenCepDialog(false)}>Cancelar</Button>
                  <Button
                    onClick={() => {
                      const cleaned = cep.replace(/\D/g, "");
                      if (cleaned.length === 8) {
                        fetchRegionFromCep(cleaned);
                      } else {
                        setCepError("CEP inválido");
                        const el = document.querySelector('input[placeholder="00000-000"]') as HTMLInputElement | null;
                        if (el) el.focus();
                      }
                    }}
                    disabled={loadingCep}
                  >
                    {loadingCep ? "Carregando..." : "OK"}
                  </Button>
                </div>
                {cepError ? <div className="text-destructive text-sm">{cepError}</div> : null}
              </div>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </header>
      <CartDrawer open={isCartOpen} onOpenChange={setCartOpenState} />
    </>
  );
}

export default Header;
