import { useState } from "react";
import { ChevronRight } from "lucide-react";
import certificationsImage from "@/assets/certifications.png";

type FooterLink = {
  label: string;
  href?: string;
  highlight?: boolean;
};

type LinksSection = {
  title: string;
  type: "links";
  links: FooterLink[];
};

type PaymentsSection = {
  title: string;
  type: "payments";
  payments: string[];
};

type CertificationsSection = {
  title: string;
  type: "certifications";
  description: string;
  image: string;
  imageAlt: string;
};

type FooterSection = LinksSection | PaymentsSection | CertificationsSection;

const SECTIONS: FooterSection[] = [
  {
    title: "Institucional",
    type: "links",
    links: [
      { label: "Sobre a Pague Menos" },
      { label: "Trabalhe Conosco" },
      { label: "Portal de Fornecedores" },
    ],
  },
  {
    title: "Serviços",
    type: "links",
    links: [
      { label: "Cartão Pague Menos" },
      { label: "Programa de Fidelidade" },
      { label: "Televendas" },
    ],
  },
  {
    title: "Atendimento",
    type: "links",
    links: [
      { label: "Perguntas Frequentes" },
      { label: "Minha Conta / Meus Pedidos" },
      { label: "Código de Defesa do Consumidor", highlight: true },
      { label: "Política de Privacidade" },
      { label: "Política de Troca e Devolução" },
      { label: "Políticas de Entrega" },
      { label: "Regulamento de Promoções" },
      { label: "Regulamento do Programa de Fidelidade" },
    ],
  },
  {
    title: "Formas de Pagamento",
    type: "payments",
    payments: ["Visa", "Mastercard", "Elo", "Hipercard", "American Express", "Pix", "Boleto"],
  },
  {
    title: "Nossos Selos",
    type: "certifications",
    description: "Certificações que comprovam a segurança e a confiabilidade das nossas operações.",
    image: certificationsImage,
    imageAlt: "Selos VTEX e PCI Certified",
  },
];

const Footer = () => {
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});

  const toggleSection = (index: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const renderSectionContent = (section: FooterSection) => {
    switch (section.type) {
      case "payments":
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Aceitamos as principais bandeiras para garantir praticidade e segurança nas suas compras.
            </p>
            <div className="flex flex-wrap gap-2">
              {section.payments.map((payment) => (
                <span
                  key={payment}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground shadow-sm"
                >
                  {payment}
                </span>
              ))}
            </div>
          </div>
        );
      case "certifications":
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{section.description}</p>
            <div className="flex justify-center">
              <img
                src={section.image}
                alt={section.imageAlt}
                className="w-24 rounded-md border border-border bg-background p-1.5 shadow-sm sm:w-28"
              />
            </div>
          </div>
        );
      case "links":
      default:
        return (
          <ul className="space-y-2">
            {section.links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href ?? "#"}
                  className="inline-block text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        );
    }
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-10">
        <div className="divide-y divide-border rounded-lg border border-border bg-background shadow-sm">
          {SECTIONS.map((section, index) => {
            const contentId = `footer-section-${index}`;
            const isOpen = Boolean(openSections[index]);

            return (
              <div key={section.title}>
                <button
                  type="button"
                  onClick={() => toggleSection(index)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                >
                  <h4 className="font-semibold text-foreground">{section.title}</h4>
                  <ChevronRight
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-90 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div id={contentId} className="px-4 pb-6 text-muted-foreground">
                    {renderSectionContent(section)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-3 text-center text-xs text-muted-foreground">
            Pague Menos - CNPJ 00.000.000/0001-00
          </p>
          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            Endereço: Av. Brasil, 1000 - Centro, Fortaleza - CE, 60000-000
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            © 2024 Pague Menos. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
