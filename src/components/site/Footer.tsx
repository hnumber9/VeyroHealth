import { Link } from "@tanstack/react-router";
import veyroLogo from "@/assets/veyro-logo.png";
import { Facebook, Instagram, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <>
      <aside role="note" className="border-t border-border/60 bg-muted/60">
        <div className="mx-auto max-w-[1200px] px-6 py-6">
          <p className="text-sm font-semibold text-foreground">Need urgent help?</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/75">
            Veyro is not an emergency or crisis service. If you or someone else is in immediate
            danger or at risk of serious harm, call{" "}
            <strong className="font-semibold text-foreground">999</strong> or go to{" "}
            <strong className="font-semibold text-foreground">A&amp;E</strong>. Please do not wait
            for a Veyro therapist appointment if you need immediate help.
          </p>
        </div>
      </aside>
      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-6 px-6 py-10 md:grid-cols-3">
          <div className="flex flex-col items-start gap-2">
            <img
              src={veyroLogo}
              alt="Veyro"
              className="h-14 w-auto object-contain brightness-0 invert md:h-16"
            />
            <p className="text-xs text-primary-foreground/70">
              Better mental healthcare starts with trust.
            </p>
            <p className="text-xs text-primary-foreground/70">
              Veyro Health is built alongside therapists and mental health professionals.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 text-left text-sm text-primary-foreground/80 md:items-center md:text-center">
            <a href="mailto:join@veyrohealth.com" className="hover:text-primary-foreground">
              join@veyrohealth.com
            </a>
            <div className="flex gap-4">
              {[
                {
                  href: "https://www.facebook.com/p/Veyro-Health-61594516611326/",
                  label: "Facebook",
                  Icon: Facebook,
                },
                {
                  href: "https://www.instagram.com/veyrohealth/",
                  label: "Instagram",
                  Icon: Instagram,
                },
                {
                  href: "https://www.linkedin.com/company/veyrohealth",
                  label: "LinkedIn",
                  Icon: Linkedin,
                },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Veyro on ${label}`}
                  className="rounded-full border border-primary-foreground/30 p-2 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 text-sm text-primary-foreground/80 md:items-end">
            <div className="flex flex-wrap gap-6">
              <Link to="/about" className="hover:text-primary-foreground">
                About
              </Link>
              <Link to="/privacy" className="hover:text-primary-foreground">
                Privacy Policy
              </Link>
              <Link to="/terms-and-conditions" className="hover:text-primary-foreground">
                T&amp;C&apos;s
              </Link>
            </div>
            <div className="flex flex-wrap gap-6">
              <Link to="/how-veyro-works" className="hover:text-primary-foreground">
                How Veyro Works
              </Link>
              <Link to="/therapy-fund" className="hover:text-primary-foreground">
                Therapy Fund
              </Link>
              <Link to="/partners" className="hover:text-primary-foreground">
                Partners
              </Link>
              <Link to="/faqs" className="hover:text-primary-foreground">
                FAQs
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
