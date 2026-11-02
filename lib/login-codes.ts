// Where login codes go, for the wording on screen. With NEXT_PUBLIC_WHATSAPP_CODES=on the first code
// goes by WhatsApp and a resend goes by SMS (see app/api/auth/sms-hook). Otherwise every code is an SMS.
export const codesByWhatsApp = process.env.NEXT_PUBLIC_WHATSAPP_CODES === "on";

export const codeCopy = codesByWhatsApp
  ? {
      sendButton: "Send me a code",
      registerLine: "We'll send one code on WhatsApp to confirm your number.",
      resetLine: "We'll send a code on WhatsApp, then you choose a new password. First time with a password? This sets one up.",
      sentTo: "We sent a 6-digit code on WhatsApp to",
      resend: "No WhatsApp? Text me the code",
      wrong: "That code isn't right or has expired. Use the newest code we sent, or get a new one below.",
    }
  : {
      sendButton: "Text me a code",
      registerLine: "We'll text you one code to confirm your number.",
      resetLine: "We'll text you a code, then you choose a new password. First time with a password? This sets one up.",
      sentTo: "We texted a 6-digit code to",
      resend: "Resend code",
      wrong: "That code isn't right or has expired. Use the newest text we sent, or tap Resend code.",
    };
