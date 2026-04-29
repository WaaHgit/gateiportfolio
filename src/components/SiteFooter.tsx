import { Link } from "@tanstack/react-router";
import { SocialIcons } from "./SocialIcons";

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-32">
      <div className="container-narrow py-12 grid gap-8 md:grid-cols-3">
        <div>
          <div className="font-display text-2xl tracking-widest">GATEI</div>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            Multimedia Creative Director & Production Specialist.
          </p>
        </div>
        <div>
          <div className="uppercase-tracked text-muted-foreground mb-3">Navigate</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-primary">About</Link></li>
            <li><Link to="/services" className="hover:text-primary">Services</Link></li>
            <li><Link to="/portfolio" className="hover:text-primary">Portfolio</Link></li>
            <li><Link to="/book" className="hover:text-primary">Book Me</Link></li>
          </ul>
        </div>
        <div>
          <div className="uppercase-tracked text-muted-foreground mb-3">Connect</div>
          <SocialIcons />
        </div>
      </div>
      <div className="container-narrow pb-8 text-xs text-muted-foreground flex justify-between">
        <span>© {new Date().getFullYear()} GATEI</span>
        <Link to="/auth" className="hover:text-foreground">Admin</Link>
      </div>
    </footer>
  );
}
