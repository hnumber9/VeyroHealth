import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, User } from "lucide-react";
import veyroLogo from "@/assets/veyro-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyTherapistProfile } from "@/lib/therapist-profiles.functions";

export function TherapistPortalHeader() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [session, setSession] = useState<{
    email: string | null;
    displayName: string | null;
  } | null>(null);
  const nav = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const fetchProfile = useServerFn(getMyTherapistProfile);

  useEffect(() => {
    async function refresh() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setSession(null);
        return;
      }
      const u = data.session.user;
      let displayName: string | null = null;
      try {
        const { profile } = await fetchProfile({});
        displayName = profile?.display_name ?? null;
      } catch {
        // fall through to auth name
      }
      setSession({
        email: u.email ?? null,
        displayName:
          displayName ||
          (u.user_metadata?.first_name as string) ||
          (u.user_metadata?.full_name as string)?.split(" ")[0] ||
          u.email?.split("@")[0] ||
          null,
      });
    }
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        refresh();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current || !menuRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function handleSignOut() {
    setAccountOpen(false);
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2" aria-label="Veyro">
          <img src={veyroLogo} alt="Veyro" className="h-14 w-auto md:h-16" />
        </Link>
        <div className="relative flex items-center" ref={menuRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground/80 hover:border-primary/40"
          >
            <User className="h-4 w-4" />
            {session?.displayName || "Account"}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {accountOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-secondary/50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
