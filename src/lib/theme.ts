/**
 * Single source of truth for branding — colors, fonts, logo path — so
 * swapping any of it later is a one-file change, not a hunt through the
 * app. Values below are the real Second Chance Pet Adoptions brand
 * (reused as static assets from the auction/giving project per the
 * client's instruction — see DECISIONS.md — not a code/runtime dependency
 * between the two apps).
 */

export const theme = {
  colors: {
    primary: "#7947a8", // brand purple
    primaryDark: "#5c3480",
    secondary: "#dbbdf3", // brand lavender
    accent: "#f7f0fc", // brand lavender tint
  },
  logo: {
    src: "/brand/second-chance-logo.png",
    alt: "Second Chance Pet Adoptions",
  },
  org: {
    name: "Second Chance Pet Adoptions",
    website: "https://secondchancenc.org",
    // [DECISIONS.md] — real EIN needed before receipts go out for real.
    ein: "[PASTE EIN]",
  },
} as const;
