import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { shippingZonesQuery } from "@/lib/catalog";
import { effectivePrice, formatHTG } from "@/lib/format";
import { createOrder } from "@/lib/orders.functions";
import { createPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Commande — Achte La" },
      {
        name: "description",
        content: "Finalisez votre commande Achte La et payez avec MonCash ou NatCash.",
      },
      { property: "og:title", content: "Commande — Achte La" },
      { property: "og:description", content: "Fini kòmand ou epi peye ak MonCash oswa NatCash." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type Provider = "MONCASH" | "NATCASH";

function CheckoutPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { lines, subtotal } = useCart();
  const submitOrder = useServerFn(createOrder);
  const submitPayment = useServerFn(createPayment);

  const [step, setStep] = useState<1 | 2>(1);
  const [zoneId, setZoneId] = useState<string>("");
  const [provider, setProvider] = useState<Provider>("MONCASH");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    department: "",
    delivery_point: "",
    instructions: "",
  });

  const zones = useQuery(shippingZonesQuery());

  useEffect(() => {
    if (!profile) return;
    setForm((current) => ({
      ...current,
      full_name: current.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(" "),
      phone: current.phone || profile.phone || "",
      email: current.email || profile.email || "",
    }));
  }, [profile]);

  useEffect(() => {
    if (!zoneId && zones.data?.[0]) setZoneId(zones.data[0].id);
  }, [zones.data, zoneId]);

  const zone = zones.data?.find((item) => item.id === zoneId);
  const shipping = zone ? Number(zone.price) : 0;
  const total = subtotal + shipping;

  if (!user) {
    return (
      <ShopLayout>
        <div className="container-page py-16 text-center">
          <p className="text-muted-foreground">{t("auth.mustLogin")}</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/auth">{t("nav.login")}</Link>
          </Button>
        </div>
      </ShopLayout>
    );
  }

  if (lines.length === 0) {
    return (
      <ShopLayout>
        <div className="container-page py-16 text-center">
          <p className="text-muted-foreground">{t("checkout.emptyCart")}</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/products">{t("cart.continue")}</Link>
          </Button>
        </div>
      </ShopLayout>
    );
  }

  const goToPayment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!zoneId) {
      toast.error(t("checkout.selectZone"));
      return;
    }
    setStep(2);
  };

  const pay = async () => {
    setBusy(true);
    try {
      const order = await submitOrder({
        data: {
          items: lines.map((line) => ({
            product_id: line.product.id,
            quantity: line.quantity,
            options: line.options,
          })),
          shipping_zone_id: zoneId,
          customer: form,
          client_total: total,
        },
      });

      const payment = await submitPayment({
        data: { order_id: order.order_id, provider },
      });

      if (payment.checkout_url) {
        window.location.href = payment.checkout_url;
        return;
      }
      void navigate({ to: "/orders" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("BAZIK_NOT_CONFIGURED")) toast.error(t("checkout.paymentUnavailable"));
      else if (message.includes("INSUFFICIENT_STOCK")) toast.error(t("product.outOfStock"));
      else toast.error(t("error.payment"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ShopLayout>
      <div className="container-page grid gap-6 py-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-2xl font-extrabold">{t("checkout.title")}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className={step === 1 ? "font-bold text-primary" : "text-muted-foreground"}>
              1. {t("checkout.step1")}
            </span>
            <span className="text-muted-foreground">—</span>
            <span className={step === 2 ? "font-bold text-primary" : "text-muted-foreground"}>
              2. {t("checkout.step2")}
            </span>
          </div>

          {step === 1 ? (
            <form
              onSubmit={goToPayment}
              className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t("checkout.fullName")}
                  value={form.full_name}
                  onChange={(value) => setForm({ ...form, full_name: value })}
                  required
                />
                <Field
                  label={t("checkout.phone")}
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                  required
                />
                <Field
                  label={t("checkout.email")}
                  type="email"
                  value={form.email}
                  onChange={(value) => setForm({ ...form, email: value })}
                  required
                />
                <Field
                  label={t("checkout.city")}
                  value={form.city}
                  onChange={(value) => setForm({ ...form, city: value })}
                  required
                />
                <Field
                  label={t("checkout.department")}
                  value={form.department}
                  onChange={(value) => setForm({ ...form, department: value })}
                />
                <Field
                  label={`${t("checkout.deliveryPoint")} (${t("common.optional")})`}
                  value={form.delivery_point}
                  onChange={(value) => setForm({ ...form, delivery_point: value })}
                />
              </div>
              <Field
                label={t("checkout.address")}
                value={form.address}
                onChange={(value) => setForm({ ...form, address: value })}
                required
              />
              <div className="space-y-1.5">
                <Label htmlFor="instructions">{t("checkout.instructions")}</Label>
                <Textarea
                  id="instructions"
                  value={form.instructions}
                  onChange={(event) => setForm({ ...form, instructions: event.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("checkout.zone")}</Label>
                <div className="grid gap-2">
                  {(zones.data ?? []).map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="radio"
                          name="zone"
                          value={item.id}
                          checked={zoneId === item.id}
                          onChange={() => setZoneId(item.id)}
                        />
                        <span className="truncate">
                          {lang === "ht" ? item.name_ht : item.name_fr}
                          {item.eta_days ? ` · ${item.eta_days}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold">
                        {Number(item.price) === 0 ? t("common.free") : formatHTG(Number(item.price))}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full rounded-full">
                {t("common.next")}
              </Button>
            </form>
          ) : (
            <div className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <Label>{t("checkout.payment")}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["MONCASH", "NATCASH"] as Provider[]).map((item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-4 has-[:checked]:border-primary"
                  >
                    <input
                      type="radio"
                      name="provider"
                      checked={provider === item}
                      onChange={() => setProvider(item)}
                    />
                    <span className="font-semibold">
                      {item === "MONCASH" ? t("checkout.moncash") : t("checkout.natcash")}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setStep(1)}>
                  {t("common.back")}
                </Button>
                <Button disabled={busy} className="rounded-full" onClick={() => void pay()}>
                  {busy ? t("loading") : t("checkout.pay")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-bold">{t("checkout.summary")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lines.map((line) => (
              <li key={line.key} className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate">
                  {line.quantity} × {lang === "ht" ? line.product.name_ht : line.product.name_fr}
                </span>
                <span className="shrink-0">
                  {formatHTG(effectivePrice(line.product) * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
            <Row label={t("cart.subtotal")} value={formatHTG(subtotal)} />
            <Row
              label={t("cart.shipping")}
              value={shipping === 0 ? t("common.free") : formatHTG(shipping)}
            />
            <div className="flex items-center justify-between pt-2 text-base font-extrabold">
              <span>{t("cart.total")}</span>
              <span>{formatHTG(total)}</span>
            </div>
          </dl>
        </aside>
      </div>
    </ShopLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
