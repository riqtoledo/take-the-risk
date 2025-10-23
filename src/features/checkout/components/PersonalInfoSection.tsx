import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PersonalInfo = {
  name: string;
  email: string;
  phone: string;
};

type PersonalInfoSectionProps = {
  value: PersonalInfo;
  onChange: (value: PersonalInfo) => void;
};

const PersonalInfoSection = ({ value, onChange }: PersonalInfoSectionProps) => {
  const formatPhone = (input: string) => {
    const digits = input.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (match, p1, p2, p3) => {
        let out = "";
        if (p1) out += `(${p1}`;
        if (p1 && p1.length === 2) out += ") ";
        if (p2) out += p2;
        if (p3) out += `-${p3}`;
        return out;
      });
    }
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const handleChange = (field: keyof PersonalInfo) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = event.target.value;
    if (field === "phone") {
      newValue = formatPhone(newValue);
    }
    onChange({ ...value, [field]: newValue });
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Dados pessoais</h2>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="checkout-name">Nome completo</Label>
          <Input
            id="checkout-name"
            placeholder="Ex: Maria Silva"
            value={value.name}
            onChange={handleChange("name")}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="checkout-email">E-mail</Label>
          <Input
            id="checkout-email"
            type="email"
            placeholder="voce@email.com"
            value={value.email}
            onChange={handleChange("email")}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="checkout-phone">Telefone</Label>
          <Input
            id="checkout-phone"
            placeholder="(00) 00000-0000"
            value={value.phone}
            onChange={handleChange("phone")}
            required
            inputMode="tel"
          />
        </div>
      </div>
    </section>
  );
};

export default PersonalInfoSection;
