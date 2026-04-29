import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/audio", label: "Audio" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="container-narrow flex items-center justify-between h-16">
        <Link to="/" className="font-display text-2xl tracking-widest">
          GATEI
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="uppercase-tracked text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "uppercase-tracked text-primary" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
          <Link
            to="/book"
            className="uppercase-tracked border border-primary text-primary px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Book Me
          </Link>
        </nav>
        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container-narrow flex flex-col py-4 gap-4">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="uppercase-tracked text-muted-foreground hover:text-foreground"
                activeProps={{ className: "uppercase-tracked text-primary" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/book"
              onClick={() => setOpen(false)}
              className="uppercase-tracked border border-primary text-primary px-4 py-2 inline-block w-fit"
            >
              Book Me
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
