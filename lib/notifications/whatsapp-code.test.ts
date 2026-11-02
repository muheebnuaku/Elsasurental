import { afterEach, describe, expect, it, vi } from "vitest";
import { sendWhatsAppCode } from "./channels";

// Meta's AUTHENTICATION templates need the code in the body AND in the copy-code button.
describe("sendWhatsAppCode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });

  it("sends an authentication template with the code in the body and button", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "12345";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWhatsAppCode("+233241234567", "482913");

    expect(result).toEqual({ status: "sent", providerId: "wamid.1" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/12345/messages");
    const body = JSON.parse(String(init.body));
    expect(body.to).toBe("233241234567");
    expect(body.template.name).toBe("elsasu_login_code");
    expect(body.template.components).toEqual([
      { type: "body", parameters: [{ type: "text", text: "482913" }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "482913" }] },
    ]);
  });

  it("does nothing when WhatsApp isn't set up", async () => {
    expect(await sendWhatsAppCode("+233241234567", "482913")).toEqual({ status: "skipped" });
  });
});
