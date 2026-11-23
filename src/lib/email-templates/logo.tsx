import * as React from "react";
import { Img, Link, Section } from "@react-email/components";

export const LOGO_URL = "https://www.veyrohealth.com/veyro-logo.png";
export const SITE_URL = "https://www.veyrohealth.com";

/** Veyro wordmark shown at the top of every email. */
export const EmailLogo = () => (
  <Section style={wrap}>
    <Link href={SITE_URL}>
      <Img src={LOGO_URL} width="132" alt="Veyro" style={img} />
    </Link>
  </Section>
);

const wrap = { padding: "4px 0 20px", textAlign: "left" as const };
const img = { display: "block", width: "132px", height: "auto", border: "0" };
