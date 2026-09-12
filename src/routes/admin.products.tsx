import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, ImagePlus, Languages, Loader2, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
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
  colors: "",
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

const QUICK_SIZES: Record<string, string[]> = {
  chaussures: ['8.5"', '9"', '9.5"', '10"', '10.5"', '11"', '11.5"', '12"'],
  cheveux: ['10"', '12"', '14"', '16"', '18"', '20"', '22"', '24"', '26"', '28"', '30"'],
  mode: ["XS", "S", "M", "L", "XL", "XXL"],
  enfants: ["XS", "S", "M", "L", "XL", "XXL"],
};

function parseSizes(value: string) {
  return value
    .split(/[,\n]/)
    .map((size) => size.trim())
    .filter(Boolean);
}

function addSize(value: string, size: string) {
  const current = parseSizes(value);
  if (current.some((existing) => existing.toLowerCase() === size.toLowerCase())) return value;
  return [...current, size].join(", ");
}

const COLOR_SWATCHES: Record<string, string> = {
  Noir: "#111111",
  Blanc: "#ffffff",
  Rouge: "#d32f2f",
  Bleu: "#1e5aa8",
  Vert: "#2e7d32",
  Jaune: "#f2c200",
  Rose: "#e88ab0",
  Gris: "#8a8a8a",
  Marron: "#7b4b2a",
  Beige: "#d9c7a0",
  Doré: "#c9a227",
  Argenté: "#c0c0c0",
  "Noir naturel": "#1b1b1b",
  Brun: "#4a2f1b",
  Châtain: "#6f4a2a",
  Blond: "#d8b96a",
  Roux: "#a14a1f",
  "Gris/Grisonnant": "#9c9c9c",
  Ombré: "#5c3a21",
  Bordeaux: "#6e1423",
};

const QUICK_COLORS_GENERAL = Object.keys(COLOR_SWATCHES).slice(0, 12);
const QUICK_COLORS_CHEVEUX = Object.keys(COLOR_SWATCHES).slice(12);


function AdminProducts() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const categories = useQuery(categoriesQuery());
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState<"name" | "description" | null>(null);
  const runTranslate = useServerFn(translateText);

  const selectedCategorySlug =
    (categories.data ?? []).find((category) => category.id === form.category_id)?.slug ?? "";
  const quickSizes = QUICK_SIZES[selectedCategorySlug] ?? [];

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
    const colorVariants = [...(data.product_variants ?? [])]
      .filter((variant) => variant.kind === "color")
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
      size_extra_price: variants[0] ? String(variants[0].extra_price ?? 0) : "",
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

        <ImageUploader
          urls={form.images.split("\n").map((line) => line.trim()).filter(Boolean)}
          onChange={(urls) => setForm((current) => ({ ...current, images: urls.join("\n") }))}
        />

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

        {quickSizes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {quickSizes.map((size) => {
              const alreadyAdded = parseSizes(form.sizes).some(
                (existing) => existing.toLowerCase() === size.toLowerCase(),
              );
              return (
                <button
                  key={size}
                  type="button"
                  disabled={alreadyAdded}
                  className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
                  onClick={() =>
                    setForm((current) => ({ ...current, sizes: addSize(current.sizes, size) }))
                  }
                >
                  <Plus className="mr-1 inline size-3" />
                  {size}
                </button>
              );
            })}
          </div>
        ) : null}


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

function ImageUploader({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [externalUrl, setExternalUrl] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploading((count) => count + list.length);
    const uploaded: string[] = [];

    for (const file of list) {
      const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${extension || "jpg"}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { ...(file.type ? { contentType: file.type } : {}), upsert: false });

      if (error) {
        console.error(error);
        toast.error(t("admin.uploadError"));
      } else {
        uploaded.push(`/api/public/images/${path}`);
      }
      setUploading((count) => Math.max(0, count - 1));
    }

    if (uploaded.length > 0) onChange([...urls, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= urls.length) return;
    const next = [...urls];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item as string);
    onChange(next);
  };

  const addExternal = () => {
    const value = externalUrl.trim();
    if (!value) return;
    onChange([...urls, value]);
    setExternalUrl("");
  };

  return (
    <div className="space-y-2">
      <Label>{t("admin.images")}</Label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full rounded-full"
        disabled={uploading > 0}
        onClick={() => inputRef.current?.click()}
      >
        {uploading > 0 ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImagePlus className="size-4" />
        )}
        {uploading > 0 ? t("admin.uploading") : t("admin.uploadImages")}
      </Button>

      {urls.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {urls.map((url, index) => (
            <li key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-border">
              <img src={url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
              <button
                type="button"
                aria-label={t("admin.removeImage")}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow"
                onClick={() => onChange(urls.filter((_, position) => position !== index))}
              >
                <X className="size-3.5" />
              </button>
              <div className="flex justify-center gap-1 bg-muted/60 p-1">
                <button
                  type="button"
                  aria-label={t("admin.moveUp")}
                  disabled={index === 0}
                  className="rounded p-1 disabled:opacity-40"
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t("admin.moveDown")}
                  disabled={index === urls.length - 1}
                  className="rounded p-1 disabled:opacity-40"
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t("admin.noImages")}</p>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">{t("admin.imageUrl")}</Label>
          <Input
            value={externalUrl}
            placeholder="https://"
            onChange={(event) => setExternalUrl(event.target.value)}
          />
        </div>
        <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={addExternal}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
