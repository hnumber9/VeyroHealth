import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, Menu, User, X } from "lucide-react";
import veyroLogo from "@/assets/veyro-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { getMyTherapistProfile } from "@/lib/therapist-profiles.functions";
import { getMyRoles } from "@/lib/user-roles.functions";

export function Header({ hideTherapistSignin = false }: { hideTherapistSignin?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);
  const [session, setSession] = useState<{ email: string | null; firstName: string | null } | null>(
    null,
  );
  const [isTherapist, setIsTherapist] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const signinRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function refresh() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setSession(null);
        setIsTherapist(false);
        return;
      }
      const u = data.session.user;
      setSession({
        email: u.email ?? null,
        firstName:
          (u.user_metadata?.first_name as string) ||
          (u.user_metadata?.full_name as string)?.split(" ")[0] ||
          u.email?.split("@")[0] ||
          null,
      });
      try {
        const { roles } = await getMyRoles();
        if (roles.includes("therapist") && !roles.includes("client")) {
          setIsTherapist(true);
          return;
        }
        const { profile } = await getMyTherapistProfile();
        setIsTherapist(!!profile);
      } catch {
        setIsTherapist(false);
      }
    }
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (signinRef.current && !signinRef.current.contains(e.target as Node)) setSigninOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function handleSignOut() {
    setAccountOpen(false);
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  const links = [
    { label: "Why Veyro", href: "/#why" },
    { label: "About", href: "/about" },
    { label: "For Therapists", href: "/#apply" },
    { label: "Therapy Fund", href: "/therapy-fund" },
    { label: "Our Mission", href: "/#mission" },
    { label: "Partnerships", href: "/partners" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2" aria-label="Veyro">
          <img src={veyroLogo} alt="Veyro" className="h-14 w-auto md:h-16" />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex xl:gap-10">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="whitespace-nowrap text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {session ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground/80 hover:border-primary/40"
              >
                <User className="h-4 w-4" />
                {session.firstName || "Account"}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {isTherapist ? (
                    <Link
                      to="/therapist/dashboard"
                      search={{ tab: undefined }}
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2.5 text-sm text-foreground/80 hover:bg-secondary/50"
                    >
                      Therapist dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/client/dashboard"
                        onClick={() => setAccountOpen(false)}
                        className="block px-4 py-2.5 text-sm text-foreground/80 hover:bg-secondary/50"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/client/reviews"
                        onClick={() => setAccountOpen(false)}
                        className="block px-4 py-2.5 text-sm text-foreground/80 hover:bg-secondary/50"
                      >
                        My reviews
                      </Link>
                    </>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-secondary/50"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative" ref={signinRef}>
              <button
                type="button"
                onClick={() => setSigninOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground/70 hover:text-primary"
              >
                Sign in
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {signinOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <Link
                    to="/client/signup"
                    onClick={() => setSigninOpen(false)}
                    className="block px-4 py-2.5 text-sm text-foreground/80 hover:bg-secondary/50"
                  >
                    Patient sign in
                  </Link>
                  {!hideTherapistSignin && (
                    <Link
                      to="/therapist/signin"
                      onClick={() => setSigninOpen(false)}
                      className="block border-t border-border px-4 py-2.5 text-sm text-foreground/80 hover:bg-secondary/50"
                    >
                      Therapist sign in
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
          {isHome ? (
            <a
              href="#apply"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold tracking-wide text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Join Veyro
            </a>
          ) : (
            <Link
              to="/therapists"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold tracking-wide text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Get Matched
            </Link>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-border/40 bg-background lg:hidden">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-accent/50"
              >
                {l.label}
              </a>
            ))}
            {session ? (
              <>
                {isTherapist ? (
                  <Link
                    to="/therapist/dashboard"
                    search={{ tab: undefined }}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-accent/50"
                  >
                    Therapist dashboard
                  </Link>
                ) : (
                  <Link
                    to="/client/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-accent/50"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                  className="rounded-md px-2 py-2 text-left text-sm font-medium text-foreground/80 hover:bg-accent/50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/client/signup"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-accent/50"
                >
                  Patient sign in
                </Link>
                {!hideTherapistSignin && (
                  <Link
                    to="/therapist/signin"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-accent/50"
                  >
                    Therapist sign in
                  </Link>
                )}
              </>
            )}
            {isHome ? (
              <a
                href="#apply"
                onClick={() => setMenuOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold tracking-wide text-primary-foreground"
              >
                Join Veyro
              </a>
            ) : (
              <Link
                to="/therapists"
                onClick={() => setMenuOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold tracking-wide text-primary-foreground"
              >
                Get Matched
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
