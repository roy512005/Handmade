import { q, q1 } from "./db";

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export type ProductCardRow = {
  id: string; title: string; price_paise: number; original_price_paise: number | null;
  is_custom: boolean; category_slug: string; category_name: string;
  brand_name: string; seller_slug: string; seller_id: string;
  image_url: string | null; rating: number | null; review_count: number; stock: number;
  featured: boolean; created_at: string;
  moods: string[]; one_of_a_kind: boolean; is_new: boolean; img_w: number | null; img_h: number | null; image2: string | null;
};

const SELECT = `
  select p.id, p.title, p.price_paise, p.original_price_paise, p.is_custom, p.featured, p.created_at,
         p.moods, p.one_of_a_kind, (p.created_at > now() - interval '14 days') is_new,
         (select width from product_images where product_id = p.id order by position limit 1) img_w,
         (select height from product_images where product_id = p.id order by position limit 1) img_h,
         (select url from product_images where product_id = p.id order by position offset 1 limit 1) image2,
         c.slug category_slug, c.name category_name,
         s.brand_name, s.slug seller_slug, s.id seller_id,
         (select url from product_images where product_id = p.id order by position limit 1) image_url,
         (select avg(rating)::float8 from reviews where product_id = p.id and status = 'published') rating,
         (select count(*)::int from reviews where product_id = p.id and status = 'published') review_count,
         coalesce((select sum(i.on_hand - i.reserved) from product_variants v join product_inventory i on i.variant_id = v.id
                   where v.product_id = p.id and v.active), 0)::int stock
  from products p
  join seller_profiles s on s.id = p.seller_id
  join categories c on c.id = p.category_id
  where p.status = 'approved' and s.status = 'approved' and c.active`;

export type SortKey = "newest" | "price-asc" | "price-desc" | "rating" | "popular" | "for-you" | "daily";
export const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "for-you", label: "Picked for you" },
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Customer rating" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export type ListOpts = {
  q?: string; category?: string; seller?: string; collection?: string; material?: string;
  min?: number; max?: number; custom?: boolean; inStock?: boolean; featured?: boolean;
  sort?: SortKey; page?: number; pageSize?: number; exclude?: string;
  mood?: string; oneOfAKind?: boolean; isNew?: boolean; ids?: string[];
  prefs?: { cats: string[]; moods: string[]; sellers: string[] };
};

export async function listProducts(o: ListOpts = {}) {
  const params: unknown[] = [];
  let where = "";
  const add = (cond: string, v: unknown) => { params.push(v); where += ` and ${cond.replaceAll("$$", `$${params.length}`)}`; };
  if (o.q?.trim()) {
    const term = `%${o.q.trim().replace(/[%_\\]/g, "\\$&")}%`;
    add("(p.title ilike $$ or s.brand_name ilike $$ or c.name ilike $$ or p.description ilike $$)", term);
  }
  if (o.category) add("c.slug = $$", o.category);
  if (o.seller) add("s.slug = $$", o.seller);
  if (o.collection) add("p.id in (select cp.product_id from collection_products cp join collections co on co.id = cp.collection_id where co.slug = $$ and co.active)", o.collection);
  if (o.material) add("exists (select 1 from unnest(p.materials) m where m ilike $$)", o.material);
  if (o.min !== undefined) add("p.price_paise >= $$", o.min);
  if (o.max !== undefined) add("p.price_paise <= $$", o.max);
  if (o.custom) where += " and p.is_custom";
  if (o.featured) where += " and p.featured";
  if (o.exclude && isUuid(o.exclude)) add("p.id <> $$", o.exclude);
  if (o.mood) add("$$ = any(p.moods)", o.mood);
  if (o.oneOfAKind) where += " and p.one_of_a_kind";
  if (o.isNew) where += " and p.created_at > now() - interval '14 days'";
  if (o.ids) add("p.id = any($$::uuid[])", o.ids.filter(isUuid));

  const filterParamCount = params.length; // parameters used by WHERE only (the count query must not receive sort parameters)
  let forYou = "p.created_at desc";
  if (o.sort === "for-you" && o.prefs) {
    params.push(o.prefs.cats.filter(isUuid)); const a = params.length;
    params.push(o.prefs.moods); const b = params.length;
    params.push(o.prefs.sellers.filter(isUuid)); const c = params.length;
    forYou = `(case when p.category_id = any($${a}::uuid[]) then 2 else 0 end
      + (select count(*) from unnest(p.moods) m where m = any($${b}::text[]))
      + (case when p.seller_id = any($${c}::uuid[]) then 3 else 0 end)) desc, p.created_at desc`;
  }
  const order = {
    "for-you": forYou,
    daily: "md5(p.id::text || current_date::text)",
    newest: "p.created_at desc",
    popular: "(select coalesce(sum(quantity),0) from order_items where product_id = p.id) desc, p.created_at desc",
    rating: "coalesce((select avg(rating) from reviews where product_id = p.id), 0) desc, p.created_at desc",
    "price-asc": "p.price_paise asc",
    "price-desc": "p.price_paise desc",
  }[o.sort ?? "newest"];

  if (o.inStock) where += ` and exists (select 1 from product_variants v join product_inventory i on i.variant_id = v.id
                                          where v.product_id = p.id and v.active and i.on_hand - i.reserved > 0)`;

  const page = Math.max(1, o.page ?? 1);
  const size = o.pageSize ?? 12;
  const inner = `${SELECT}${where}`;
  const rows = await q<ProductCardRow>(`${inner} order by ${order} limit ${size} offset ${(page - 1) * size}`, params);
  const total = (await q1<{ n: number }>(`select count(*)::int n from (${inner}) x`, params.slice(0, filterParamCount)))?.n ?? 0;
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / size)) };
}

export async function getCategories() {
  return q<{ id: string; slug: string; name: string; n: number; cover: string | null }>(
    `select c.id, c.slug, c.name,
       (select i.url from products p join product_images i on i.product_id = p.id and i.position = 0 join seller_profiles s on s.id = p.seller_id
         where p.category_id = c.id and p.status = 'approved' and s.status = 'approved' order by p.created_at desc limit 1) cover,
       (select count(*)::int from products p join seller_profiles s on s.id = p.seller_id
        where p.category_id = c.id and p.status = 'approved' and s.status = 'approved') n
     from categories c where c.active order by c.sort_order, c.name`);
}
export const getCategory = (slug: string) => q1<{ id: string; slug: string; name: string }>("select id, slug, name from categories where slug = $1 and active", [slug]);

export async function getProduct(id: string) {
  if (!isUuid(id)) return undefined;
  const p = await q1<ProductCardRow & {
    description: string | null; materials: string[]; weight_grams: number | null;
    length_mm: number | null; width_mm: number | null; height_mm: number | null;
    processing_days: number; custom_options: unknown; seller_story: string | null; process_note: string | null;
    seller_location: string | null; seller_craft: string | null; seller_tagline: string | null; seller_image: string | null;
  }>(
    `select x.*, p.description, p.materials, p.weight_grams, p.length_mm, p.width_mm, p.height_mm, p.processing_days,
            p.custom_options, p.process_note, s.story seller_story, s.location seller_location, s.craft seller_craft, s.tagline seller_tagline, s.profile_image_url seller_image
     from (${SELECT} and p.id = $1) x join products p on p.id = x.id join seller_profiles s on s.id = p.seller_id`, [id]);
  if (!p) return undefined;
  const images = await q<{ url: string; alt: string | null; width: number | null; height: number | null }>("select url, alt, width, height from product_images where product_id = $1 order by position", [id]);
  const variants = await q<{ id: string; label: string; price_paise: number | null; available: number }>(
    `select v.id, v.label, v.price_paise, (i.on_hand - i.reserved)::int available
     from product_variants v join product_inventory i on i.variant_id = v.id
     where v.product_id = $1 and v.active order by v.label`, [id]);
  const reviews = await q<{ id: string; rating: number; body: string | null; photos: string[]; created_at: string; name: string | null }>(
    `select r.id, r.rating, r.body, r.photos, r.created_at, u.full_name name
     from reviews r join users u on u.id = r.user_id where r.product_id = $1 and r.status = 'published' order by r.created_at desc limit 20`, [id]);
  return { ...p, images, variants, reviews };
}

export type MakerRow = { id: string; brand_name: string; slug: string; story: string | null; profile_image_url: string | null; location: string | null; craft: string | null; tagline: string | null; n: number; followers: number; cover: string | null };
export async function getSellerBySlug(slug: string) {
  return q1<MakerRow>(
    `select s.id, s.brand_name, s.slug, s.story, s.profile_image_url, s.location, s.craft, s.tagline,
       (select count(*)::int from products p where p.seller_id = s.id and p.status = 'approved') n,
       (select count(*)::int from follows f where f.seller_id = s.id) followers, null::text cover
     from seller_profiles s where s.slug = $1 and s.status = 'approved'`, [slug]);
}
export async function listSellers() {
  return q<MakerRow>(
    `select s.id, s.brand_name, s.slug, s.story, s.profile_image_url, s.location, s.craft, s.tagline,
       (select count(*)::int from products p where p.seller_id = s.id and p.status = 'approved') n,
       (select count(*)::int from follows f where f.seller_id = s.id) followers,
       (select url from product_images i join products p on p.id = i.product_id where p.seller_id = s.id and p.status = 'approved' order by p.created_at desc, i.position limit 1) cover
     from seller_profiles s where s.status = 'approved' order by s.brand_name`);
}
export async function productsByIds(ids: string[]) {
  const clean = ids.filter(isUuid);
  if (!clean.length) return [];
  const rows = await q<ProductCardRow>(`${SELECT} and p.id = any($1::uuid[])`, [clean]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return clean.map((i) => byId.get(i)).filter(Boolean) as ProductCardRow[];
}
export async function getCollections() {
  return q<{ slug: string; title: string; description: string | null; kind: string; n: number; cover: string | null }>(
    `select c.slug, c.title, c.description, c.kind,
       (select count(*)::int from collection_products cp join products p on p.id = cp.product_id where cp.collection_id = c.id and p.status = 'approved') n,
       (select i.url from collection_products cp join products p on p.id = cp.product_id join product_images i on i.product_id = p.id and i.position = 0
         where cp.collection_id = c.id and p.status = 'approved' order by p.created_at desc limit 1) cover
     from collections c where c.active order by (c.kind = 'drop') desc, c.created_at, c.title`);
}
export async function suggestions(term: string) {
  if (term.trim().length < 2) return [];
  const t = `%${term.trim()}%`;
  return q<{ label: string; href: string }>(
    `(select p.title label, '/products/' || p.id href from products p join seller_profiles s on s.id = p.seller_id
       where p.status = 'approved' and s.status = 'approved' and p.title ilike $1 limit 5)
     union all (select brand_name, '/makers/' || slug from seller_profiles where status = 'approved' and brand_name ilike $1 limit 3)
     union all (select name, '/categories/' || slug from categories where active and name ilike $1 limit 3)`, [t]);
}

export async function distinctMaterials() {
  return (await q<{ m: string }>(
    `select distinct m from products p, unnest(p.materials) m where p.status = 'approved' order by m`)).map((r) => r.m);
}
