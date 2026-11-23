import { createFileRoute, redirect } from "@tanstack/react-router";

/** The former preview home page is now the live home page — keep old links working. */
export const Route = createFileRoute("/home-to-be")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
