import { ChevronRight, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Newsletter = () => {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-8">
        <h3 className="text-xl font-bold mb-4 text-center">
          RECEBA AS MELHORES OFERTAS!
        </h3>
        
        <div className="max-w-md mx-auto mb-6">
          <div className="flex gap-2">
            <Input
              placeholder="Digite seu e-mail"
              className="bg-card text-foreground border-none"
            />
            <Button variant="secondary" size="icon">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 max-w-sm mx-auto">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-5 w-5" />
            <div>
              <p className="font-semibold">Telefone - 24 horas</p>
              <p>4002.4202</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MessageCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Atendimento via chat</p>
              <p>0800 275 1313</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Newsletter;
