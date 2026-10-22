// Mada Care website settings. Fill these in; an empty value hides the link or keeps the button as it is in the design.
// Do not put passwords or secret keys here: this file is public.
const MADA_SITE = {
  // Booking requests from the website go to the dashboard (Requests page, source "website").
  // The shared database is the same one the dashboard uses (auth.js MADA_CLOUD).
  cloud: { url: "https://mfkiivwcxmqykpobunpn.supabase.co", key: "sb_publishable_jExWWxO-hv5PcALjkBn6RA_vZuico0F" },
  whatsapp: "",        // e.g. "9665XXXXXXXX" (international, digits only)
  appStore: "",        // App Store link of the Mada Care app
  googlePlay: "",      // Google Play link of the Mada Care app
  social: { tiktok: "", instagram: "", linkedin: "", x: "", email: "" },  // footer icons, left to right in the design: TikTok, (2nd icon), LinkedIn, X, email, WhatsApp
  vatNumber: "000000",      // as in the design until the real number is given
  crNumber: "0000000",      // as in the design until the real number is given
  city: "الرياض",
  weather: "غائم"           // static in the design; no weather source is connected
};
