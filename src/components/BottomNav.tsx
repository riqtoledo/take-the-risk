import { Home, Search, User, Menu } from "lucide-react";

const BottomNav = () => {
  const navItems = [
    { icon: Home, label: "Início", active: true },
    { icon: Search, label: "Buscar", active: false },
    { icon: User, label: "Conta", active: false },
    { icon: Menu, label: "Menu", active: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="container mx-auto">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item, index) => (
            <button
              key={index}
              className={`flex flex-col items-center justify-center gap-1 ${
                item.active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
