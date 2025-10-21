import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const NotFound = () => (
  <div className="min-h-screen bg-background text-foreground flex flex-col">
    <Header />
    <main className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-4">
      <div>
        <h1 className="text-3xl font-semibold">Pagina nao encontrada</h1>
        <p className="text-muted-foreground mt-2">A rota acessada nao existe ou foi removida.</p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Voltar para a loja
      </Link>
    </main>
    <Footer />
  </div>
);

export default NotFound;
