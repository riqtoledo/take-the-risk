import { ChevronRight } from "lucide-react";

const Footer = () => {
  const sections = [
    {
      title: "Institucional",
      links: ["Sobre a Pague Menos", "Trabalhe Conosco", "Portal de Fornecedores"],
    },
    {
      title: "Serviços",
      links: ["Cartão Pague Menos", "Programa de Fidelidade", "Televendas"],
    },
    {
      title: "Atendimento",
      links: ["Central de Ajuda", "Política de Privacidade", "Trocas e Devoluções"],
    },
    {
      title: "Formas de Pagamento",
      links: ["Cartões de Crédito", "Boleto Bancário", "PIX"],
    },
    {
      title: "Nossas Lojas",
      links: ["Encontre uma Loja", "Farmácia de Plantão"],
    },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-8">
        {sections.map((section, index) => (
          <div key={index} className="mb-6">
            <button className="w-full flex items-center justify-between py-3 border-b border-border">
              <h4 className="font-semibold text-foreground">{section.title}</h4>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        ))}

        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-4">
            Pague Menos - CNPJ 00.000.000/0001-00
          </p>
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Endereço: Av. Brasil, 1000 - Centro, Fortaleza - CE, 60000-000
          </p>
          <p className="text-xs text-muted-foreground text-center mt-4">
            © 2024 Pague Menos. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
