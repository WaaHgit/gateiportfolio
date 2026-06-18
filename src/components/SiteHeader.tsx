import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/reviews", label: "Reviews" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const drawerId = "mobile-primary-navigation";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="container-narrow flex items-center justify-between gap-3 h-14 sm:h-16">
        <Link
          to="/"
          className="font-display text-lg sm:text-2xl tracking-widest shrink-0"
          onClick={() => setOpen(false)}
        >
          GATEI
        </Link>

        {/* Desktop nav — show only on lg+ to avoid overflow on tablets/small laptops */}
        <nav
          className="hidden lg:flex flex-1 items-center justify-center gap-6"
          aria-label="Primary"
        >
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="uppercase-tracked text-xs text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "uppercase-tracked text-xs text-primary" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/book"
            className="hidden sm:inline-block uppercase-tracked text-[11px] sm:text-xs border border-primary text-primary px-3 py-1.5 sm:px-4 sm:py-2 hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => setOpen(false)}
          >
            Book
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={drawerId}
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 shrink-0 text-foreground hover:text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          id={drawerId}
          className="lg:hidden fixed inset-x-0 top-14 sm:top-16 bottom-0 z-[90] h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] bg-background/98 backdrop-blur-md border-t border-border animate-in-fade overflow-y-auto overscroll-contain"
        >
          <nav className="container-narrow py-5 flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="uppercase-tracked text-sm py-4 min-h-12 border-b border-border/60 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary"
                activeProps={{ className: "uppercase-tracked text-sm py-4 min-h-12 border-b border-border/60 text-primary" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/book"
              onClick={() => setOpen(false)}
              className="uppercase-tracked text-sm py-4 min-h-12 mt-4 text-center border border-primary text-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary transition-colors"
            >
              Book
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
