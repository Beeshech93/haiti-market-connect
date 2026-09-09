import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { categoriesQuery } from "@/lib/catalog";
import { formatHTG } from "@/lib/format";
import { translateText } from "@/lib/translate.functions";


export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

const EMPTY = {
  name_fr: "",
  name_ht: "",
  description_fr: "",
  description_ht: "",
  source: "SHEIN",
  source_url: "",
  purchase_price: "",
  selling_price: "",
  sale_price: "",
  shipping_cost: "",
  stock: "0",
  category_id: "",
  images: "",
  sizes: "",
  size_extra_price: "",
  is_featured: false,
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function AdminProducts() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const categories = useQuery(categoriesQuery());
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState<"name" | "description" | null>(null);
  const runTranslate = useServerFn(translateText);

  async function handleTranslate(field: "name" | "description") {
    const frValue = field === "name" ? form.name_fr : form.description_fr;
    const htValue = field === "name" ? form.name_ht : form.description_ht;

    let from: "fr" | "ht";
    let text: string;
    if (frValue.trim() && !htValue.trim()) {
      from = "fr";
      text = frValue.trim();
    } else if (htValue.trim() && !frValue.trim()) {
      from = "ht";
      text = htValue.trim();
    } else if (frValue.trim() && htValue.trim()) {
      if (!window.confirm(t("admin.translateOverwrite"))) return;
      from = "fr";
      text = frValue.trim();
    } else {
      toast.error(t("admin.translateEmpty"));
      return;
    }

    const to = from === "fr" ? "ht" : "fr";
    setTranslating(field);
    try {
      const result = await runTranslate({ data: { text, from, to } });
      const key = `${field}_${to}` as "name_fr" | "name_ht" | "description_fr" | "description_ht";
      setForm((current) => ({ ...current, [key]: result.text }));
      toast.success(t("admin.translated"));
    } catch (error) {
      console.error(error);
      toast.error(t("admin.translateError"));
    } finally {
      setTranslating(null);
    }
  }


  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name_fr, name_ht, selling_price, sale_price, stock, status, source")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const startEdit = async (id: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(url, sort_order), product_variants(kind, value, extra_price, sort_order)")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast.error(t("error.generic"));
      return;
    }

    const images = [...(data.product_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => image.url);
    const variants = [...(data.product_variants ?? [])]
      .filter((variant) => variant.kind === "size")
      .sort((a, b) => a.sort_order - b.sort_order);

    setEditingId(id);
    setForm({
      name_fr: data.name_fr ?? "",
      name_ht: data.name_ht ?? "",
      description_fr: data.description_fr ?? "",
      description_ht: data.description_ht ?? "",
      source: data.source ?? "SHEIN",
      source_url: data.source_url ?? "",
      purchase_price: String(data.purchase_price ?? ""),
      selling_price: String(data.selling_price ?? ""),
      sale_price: data.sale_price === null ? "" : String(data.sale_price),
      shipping_cost: String(data.shipping_cost ?? ""),
      stock: String(data.stock ?? 0),
      category_id: data.category_id ?? "",
      images: images.join("\n"),
      sizes: variants.map((variant) => variant.value).join(", "),
      size_extra_price: variants.length > 0 ? String(variants[0].extra_price ?? 0) : "",
      is_featured: data.is_featured ?? false,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name_fr || !form.name_ht || !form.selling_price) {
      toast.error(t("error.requiredFields"));
      return;
    }
    setBusy(true);

    const payload = {
      name_fr: form.name_fr,
      name_ht: form.name_ht,
      description_fr: form.description_fr || null,
      description_ht: form.description_ht || null,
      source: form.source as "SHEIN" | "TEMU" | "AUTRE",
      source_url: form.source_url || null,
      purchase_price: Number(form.purchase_price || 0),
      selling_price: Number(form.selling_price),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      shipping_cost: Number(form.shipping_cost || 0),
      stock: Number(form.stock || 0),
      category_id: form.category_id || null,
      is_featured: form.is_featured,
    };

    let productId = editingId;

    if (editingId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingId);
      if (error) {
        setBusy(false);
        toast.error(t("error.generic"));
        return;
      }
    } else {
      const { data: product, error } = await supabase
        .from("products")
        .insert({ ...payload, slug: `${slugify(form.name_fr)}-${Date.now().toString(36)}` })
        .select("id")
        .single();

      if (error || !product) {
        setBusy(false);
        toast.error(t("error.generic"));
        return;
      }
      productId = product.id;
    }

    const urls = form.images
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (editingId) {
      await supabase.from("product_images").delete().eq("product_id", productId!);
    }
    if (urls.length > 0) {
      await supabase
        .from("product_images")
        .insert(urls.map((url, index) => ({ product_id: productId!, url, sort_order: index })));
    }

    const sizes = form.sizes
      .split(/[,\n]/)
      .map((size) => size.trim())
      .filter(Boolean);
    if (editingId) {
      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId!)
        .eq("kind", "size");
    }
    if (sizes.length > 0) {
      const extraPrice = Number(form.size_extra_price || 0);
      await supabase.from("product_variants").insert(
        sizes.map((size, index) => ({
          product_id: productId!,
          kind: "size",
          value: size,
          extra_price: extraPrice,
          sort_order: index,
        })),
      );
    }

    const wasEditing = editingId !== null;
    setBusy(false);
    setEditingId(null);
    setForm(EMPTY);
    toast.success(wasEditing ? t("admin.updated") : t("admin.saved"));
    await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    await queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const toggleStatus = async (id: string, status: string) => {
    await supabase
      .from("products")
      .update({ status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
      .eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={submit}
        className="h-fit space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card"
      >
        <h2 className="font-bold">
          {editingId ? t("admin.editProduct") : t("admin.newProduct")}
        </h2>

        <div className="space-y-1.5">
          <Label>{t("admin.source")}</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.source}
            onChange={(event) => setForm({ ...form, source: event.target.value })}
          >
            <option value="SHEIN">SHEIN</option>
            <option value="TEMU">TEMU</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>

        <TextField
          label={t("admin.sourceUrl")}
          value={form.source_url}
          onChange={(value) => setForm({ ...form, source_url: value })}
          placeholder="https://"
        />
        <TextField
          label={t("admin.nameFr")}
          value={form.name_fr}
          onChange={(value) => setForm({ ...form, name_fr: value })}
        />
        <TextField
          label={t("admin.nameHt")}
          value={form.name_ht}
          onChange={(value) => setForm({ ...form, name_ht: value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t("admin.purchasePrice")}
            value={form.purchase_price}
            onChange={(value) => setForm({ ...form, purchase_price: value })}
            type="number"
          />
          <TextField
            label={t("admin.sellingPrice")}
            value={form.selling_price}
            onChange={(value) => setForm({ ...form, selling_price: value })}
            type="number"
          />
          <TextField
            label={t("admin.salePrice")}
            value={form.sale_price}
            onChange={(value) => setForm({ ...form, sale_price: value })}
            type="number"
          />
          <TextField
            label={t("admin.shippingCost")}
            value={form.shipping_cost}
            onChange={(value) => setForm({ ...form, shipping_cost: value })}
            type="number"
          />
          <TextField
            label={t("admin.stock")}
            value={form.stock}
            onChange={(value) => setForm({ ...form, stock: value })}
            type="number"
          />
          <div className="space-y-1.5">
            <Label>{t("admin.category")}</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.category_id}
              onChange={(event) => setForm({ ...form, category_id: event.target.value })}
            >
              <option value="">—</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {lang === "ht" ? category.name_ht : category.name_fr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>{t("admin.nameFr")} / {t("admin.nameHt")}</Label>
            <TranslateButton
              busy={translating === "name"}
              disabled={translating !== null}
              label={t("admin.translate")}
              busyLabel={t("admin.translating")}
              onClick={() => void handleTranslate("name")}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t("admin.descFr")}</Label>
          <Textarea
            rows={3}
            value={form.description_fr}
            onChange={(event) => setForm({ ...form, description_fr: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>{t("admin.descHt")}</Label>
            <TranslateButton
              busy={translating === "description"}
              disabled={translating !== null}
              label={t("admin.translate")}
              busyLabel={t("admin.translating")}
              onClick={() => void handleTranslate("description")}
            />
          </div>
          <Textarea
            rows={3}
            value={form.description_ht}
            onChange={(event) => setForm({ ...form, description_ht: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("admin.images")}</Label>
          <Textarea
            rows={3}
            value={form.images}
            onChange={(event) => setForm({ ...form, images: event.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t("admin.sizes")}
            value={form.sizes}
            onChange={(value) => setForm({ ...form, sizes: value })}
            placeholder="S, M, L, XL"
          />
          <TextField
            label={t("admin.sizeExtraPrice")}
            value={form.size_extra_price}
            onChange={(value) => setForm({ ...form, size_extra_price: value })}
            type="number"
            placeholder="0"
          />
        </div>


        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(event) => setForm({ ...form, is_featured: event.target.checked })}
          />
          {t("admin.featured")}
        </label>

        <Button type="submit" disabled={busy} className="w-full rounded-full">
          {busy ? t("loading") : editingId ? t("admin.update") : t("common.save")}
        </Button>
        {editingId ? (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full"
            onClick={cancelEdit}
          >
            {t("admin.cancelEdit")}
          </Button>
        ) : null}
      </form>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-bold">{t("admin.products")}</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {(products.data ?? []).map((product) => (
            <li key={product.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {lang === "ht" ? product.name_ht : product.name_fr}
                </p>
                <p className="text-xs text-muted-foreground">
                  {product.source} · {t("admin.stock")}: {product.stock} ·{" "}
                  {formatHTG(Number(product.sale_price ?? product.selling_price))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => void startEdit(product.id)}
                >
                  {t("admin.edit")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => void toggleStatus(product.id, product.status)}
                >
                  {product.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TranslateButton({
  busy,
  disabled,
  label,
  busyLabel,
  onClick,
}: {
  busy: boolean;
  disabled: boolean;
  label: string;
  busyLabel: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 rounded-full text-xs"
      disabled={disabled}
      onClick={onClick}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Languages className="size-3.5" />
      )}
      {busy ? busyLabel : label}
    </Button>
  );
}


function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
