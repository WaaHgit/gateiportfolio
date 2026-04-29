import { createFileRoute, Link } from "@tanstack/react-router";
import { SocialIcons } from "@/components/SocialIcons";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — GATEI" },
      { name: "description", content: "Get in touch with GATEI for commissions and collaborations." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <section className="container-narrow py-24">
      <p className="uppercase-tracked text-primary">Contact</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3">Let's make something.</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        For project inquiries, use the booking form below. For everything else, find me on socials.
      </p>
      <div className="mt-10">
        <SocialIcons />
      </div>
      <Link to="/book" className="mt-12 inline-block uppercase-tracked bg-primary text-primary-foreground px-6 py-3">
        Book a project
      </Link>
    </section>
  );
}
