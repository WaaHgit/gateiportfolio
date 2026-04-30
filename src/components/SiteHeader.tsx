import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/reviews", label: "Reviews" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="container-narrow flex items-center gap-3 sm:gap-6 h-14 sm:h-16">
        <Link to="/" className="font-display text-lg sm:text-2xl tracking-widest shrink-0">
          GATEI
        </Link>
        <nav
          className="flex-1 flex items-center gap-3 sm:gap-6 overflow-x-auto whitespace-nowrap no-scrollbar -mx-2 px-2"
          aria-label="Primary"
        >
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="uppercase-tracked text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              activeProps={{ className: "uppercase-tracked text-[11px] sm:text-xs text-primary shrink-0" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/book"
          className="uppercase-tracked text-[11px] sm:text-xs border border-primary text-primary px-3 py-1.5 sm:px-4 sm:py-2 hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
        >
          Book
        </Link>
      </div>
    </header>
  );
}
