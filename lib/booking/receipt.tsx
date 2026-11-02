import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { place, type BookingGroup } from "@/lib/booking/details";
import { tripTypeLabels } from "@/lib/content";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatGhanaPhone } from "@/lib/phone";
import { site } from "@/lib/site";

// PDF receipt for a booking (and its group). Uses the built-in Helvetica, so "GHS" instead of the ₵ glyph.
const money = (n: number) => formatMoney(n).replace("GH₵", "GHS ");
const ORANGE = "#EA580C"; // PDF has no CSS variables; mirrors the brand-orange token
const INK = "#0A0A0A";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: INK },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  logo: { height: 36 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  muted: { color: "#5c5c63" },
  box: { borderWidth: 1, borderColor: "#e6e6e8", borderRadius: 6, padding: 12, marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  total: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 6, borderTopWidth: 1, borderTopColor: "#e6e6e8" },
  stamp: { color: ORANGE, fontFamily: "Helvetica-Bold", fontSize: 12 },
  foot: { position: "absolute", bottom: 32, left: 40, right: 40, fontSize: 8, color: "#5c5c63", textAlign: "center" },
});

type Line = { label: string; amount: number };

function Receipt({ g }: { g: BookingGroup }) {
  const snap = (g.lead.quote_snapshot ?? {}) as { lines?: Line[] };
  const lines = snap.lines ?? [];
  const successful = g.payments.filter((p) => p.status === "success");
  const from = place(g.lead.pickup);
  const to = place(g.lead.dropoff);

  return (
    <Document title={`Elsasu receipt ${g.lead.ref_code}`} author={site.name}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image style={s.logo} src={path.join(process.cwd(), "public", "brand", "logo.png")} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>Receipt</Text>
            <Text style={s.muted}>Ref {g.lead.ref_code}</Text>
            <Text style={s.muted}>Issued {formatDateTime(new Date().toISOString())}</Text>
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.bold}>{g.lead.contact_name}</Text>
          <Text style={s.muted}>{formatGhanaPhone(g.lead.contact_phone)}{g.lead.contact_email ? ` · ${g.lead.contact_email}` : ""}</Text>
        </View>

        <View style={s.box}>
          <Text style={s.bold}>{tripTypeLabels[g.lead.trip_type]}</Text>
          <Text>{formatDateTime(g.lead.start_at)} – {formatDateTime(g.lead.end_at)}</Text>
          <Text>{from ?? "Pick-up"}{to ? ` → ${to}` : ""}</Text>
          <Text style={s.muted}>
            {g.bookings.reduce((n, b) => n + b.passengers, 0)} passengers · {g.bookings.length} van{g.bookings.length > 1 ? "s" : ""} · driver & fuel included
          </Text>
        </View>

        <View style={s.box}>
          {lines.map((l, i) => (
            <View key={i} style={s.row}>
              <Text style={{ maxWidth: "75%" }}>{l.label}</Text>
              <Text>{money(l.amount)}</Text>
            </View>
          ))}
          <View style={s.total}><Text style={s.bold}>Total</Text><Text style={s.bold}>{money(g.total)}</Text></View>
          {successful.map((p) => (
            <View key={p.reference} style={s.row}>
              <Text style={s.muted}>Paid {p.paid_at ? formatDateTime(p.paid_at) : ""} · {p.method === "momo" ? "Mobile Money" : p.method === "card" ? "Card" : p.method ?? ""} · {p.reference}</Text>
              <Text>-{money(Number(p.amount))}</Text>
            </View>
          ))}
          <View style={s.total}>
            <Text style={s.bold}>Balance due</Text>
            <Text style={g.balance > 0 ? s.stamp : s.bold}>{g.balance > 0 ? money(g.balance) : "PAID IN FULL"}</Text>
          </View>
        </View>

        <Text style={s.foot}>
          {site.name} · {site.address} · {formatGhanaPhone(site.phone)} · {site.email}{"\n"}Payments processed securely by Paystack. Thank you for riding with us.
        </Text>
      </Page>
    </Document>
  );
}

export function renderReceipt(g: BookingGroup) {
  return renderToBuffer(<Receipt g={g} />);
}
