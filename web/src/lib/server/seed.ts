import type { PGlite } from "@electric-sql/pglite";
import { hashPassword } from "./password";
import { demoMode } from "./env";
import { ASPECTS, type Aspect, type Mood } from "../art";

export const DEMO = {
  admin: { email: "admin@handmade.test", password: "Admin@12345" },
  seller: { email: "seller@handmade.test", password: "Seller@12345" },
  buyer: { email: "buyer@handmade.test", password: "Buyer@12345" },
};
const SEED_VERSION = "3";

const CATEGORIES: [string, string][] = [
  ["home-decor", "Home Décor"], ["handmade-jewellery", "Handmade Jewellery"], ["art-and-paintings", "Art and Paintings"],
  ["pottery-and-ceramics", "Pottery and Ceramics"], ["handmade-textiles", "Handmade Textiles"], ["bags-and-accessories", "Bags and Accessories"],
  ["personalised-gifts", "Personalised Gifts"], ["traditional-indian-crafts", "Traditional Indian Crafts"], ["wooden-crafts", "Wooden Crafts"],
  ["handmade-lifestyle", "Handmade Lifestyle"],
];

type P = {
  t: string; c: string; price: number; orig?: number; d: string; m: string[]; g: number; custom?: boolean; stock: number;
  k: string; moods: Mood[]; one?: boolean; how: string; a: Aspect; ago: number; img?: [string, number, number];
};
type S = { brand: string; slug: string; email: string; city: string; state: string; craft: string; tagline: string; story: string; products: P[] };

const SELLERS: S[] = [
  {
    brand: "Mitti Studio", slug: "mitti-studio", email: DEMO.seller.email, city: "Khurja", state: "Uttar Pradesh", craft: "Wheel-thrown stoneware",
    tagline: "Quiet pottery for daily rituals",
    story: "A two-person pottery studio in Khurja, shaping stoneware by hand since 2015. Every piece is thrown on the wheel, glazed in small batches and fired twice.",
    products: [
      { t: "Hand-thrown Terracotta Lamp", c: "home-decor", price: 1899, orig: 2299, d: "A hand-thrown lamp base with a warm, matte glaze and a linen shade. Each piece varies slightly.", m: ["Terracotta", "Cotton wire"], g: 1400, stock: 12, k: "lamp", moods: ["earthy", "contemporary"], how: "Thrown on the wheel, bisque-fired, glazed by hand and fired again at 1,100°C. Takes about nine days start to finish.", a: "tall", ago: 3 },
      { t: "Glazed Ceramic Mug Set", c: "pottery-and-ceramics", price: 999, d: "Set of two wheel-thrown stoneware mugs, dishwasher safe.", m: ["Stoneware"], g: 800, stock: 30, k: "mug", moods: ["minimal", "earthy"], how: "Each mug is pulled from a single lump of clay and trimmed by hand, then dipped in a satin glaze.", a: "square", ago: 20 },
      { t: "Speckled Serving Bowl", c: "pottery-and-ceramics", price: 1299, d: "Wide serving bowl with a speckled cream glaze.", m: ["Stoneware"], g: 900, stock: 18, k: "bowl", moods: ["minimal"], how: "Thrown in one piece, the speckle comes from iron-rich clay showing through the glaze.", a: "landscape", ago: 40 },
      { t: "Terracotta Planter Trio", c: "home-decor", price: 1499, d: "Three nesting planters with drainage holes, left unglazed so the clay breathes.", m: ["Terracotta"], g: 1600, stock: 14, k: "planter", moods: ["earthy"], how: "Formed in a hand-turned mould and finished with a cut-in rim pattern.", a: "portrait", ago: 6 },
      { t: "Raku Fired Vase", c: "home-decor", price: 2599, d: "A single raku-fired vase. The crackle and metallic bloom are different on every firing, so no two exist.", m: ["Stoneware", "Raku glaze"], g: 1100, stock: 1, k: "vase", moods: ["contemporary", "earthy"], one: true, how: "Pulled from the kiln at peak heat and smothered in sawdust. The smoke decides the colours.", a: "tall", ago: 2 },
    ],
  },
  {
    brand: "Rang Rekha", slug: "rang-rekha", email: "rangrekha@handmade.test", city: "Bagru", state: "Rajasthan", craft: "Natural-dye block printing",
    tagline: "Printed by hand, dyed by the river",
    story: "Block printers from Bagru, working with natural dyes passed down through four generations. Indigo, madder and harda are mixed in the courtyard and every colour is washed in the sun.",
    products: [
      { t: "Block-printed Cotton Tote", c: "bags-and-accessories", price: 799, d: "Roomy tote, hand block-printed with indigo dye.", m: ["Cotton", "Natural dye"], g: 350, stock: 40, k: "tote", moods: ["colourful", "traditional"], how: "Carved teak blocks are stamped one repeat at a time, then the cloth is dried flat in the sun.", a: "portrait", ago: 25 },
      { t: "Indigo Table Runner", c: "handmade-textiles", price: 1199, orig: 1499, d: "Hand-printed table runner, 180 cm.", m: ["Cotton"], g: 300, stock: 25, k: "scarf", moods: ["traditional", "colourful"], how: "Resist-printed with clay, then dipped in indigo vats up to six times for depth.", a: "landscape", ago: 55 },
      { t: "Indigo Cushion Cover", c: "home-decor", price: 899, d: "A 40 × 40 cm cushion cover with a hand-blocked geometric pattern and a hidden zip.", m: ["Cotton", "Natural dye"], g: 220, stock: 22, k: "cushion", moods: ["colourful", "contemporary"], how: "Blocks are aligned by eye, so small imperfections are part of the print.", a: "square", ago: 5 },
      { t: "Madder Dyed Scarf", c: "handmade-textiles", price: 1299, d: "A soft cotton scarf dyed with madder root in warm rust and blush.", m: ["Cotton", "Madder root"], g: 160, stock: 16, k: "scarf", moods: ["earthy", "colourful"], how: "Madder root is simmered for hours; the fabric is dipped, aired and dipped again.", a: "tall", ago: 9 },
      { t: "Block-printed Table Napkins", c: "handmade-lifestyle", price: 649, d: "Set of four napkins in a small floral repeat.", m: ["Cotton"], g: 260, stock: 35, k: "napkins", moods: ["traditional", "colourful"], how: "Printed in two passes, one for the outline and one for the fill.", a: "square", ago: 12 },
    ],
  },
  {
    brand: "Tarakasi Works", slug: "tarakasi-works", email: "tarakasi@handmade.test", city: "Cuttack", state: "Odisha", craft: "Silver filigree (tarakasi)",
    tagline: "Silver spun finer than thread",
    story: "Silver filigree artisans from Cuttack, working in the 500-year-old tarakasi tradition. Silver is drawn into wire thinner than a hair and coiled into lace.",
    products: [
      { t: "Silver Filigree Earrings", c: "handmade-jewellery", price: 1499, orig: 1699, d: "Lightweight filigree earrings in 92.5 silver.", m: ["92.5 Silver"], g: 20, stock: 15, k: "earrings", moods: ["traditional", "minimal"], how: "Wire is hand-drawn, twisted and soldered into a frame, then coiled inside tendril by tendril.", a: "portrait", ago: 30 },
      { t: "Filigree Pendant", c: "handmade-jewellery", price: 1999, d: "Delicate hand-twisted silver pendant on a 16-inch chain.", m: ["92.5 Silver"], g: 25, stock: 10, k: "pendant", moods: ["traditional", "contemporary"], how: "Over 200 solder joints, each placed with a pin-fine torch.", a: "square", ago: 45 },
      { t: "Filigree Jhumka Earrings", c: "handmade-jewellery", price: 2299, d: "Bell-shaped jhumkas with a lattice of silver wire.", m: ["92.5 Silver"], g: 28, stock: 8, k: "earrings", moods: ["traditional"], how: "The dome is built over a wax core that melts away, leaving a hollow, featherlight shape.", a: "tall", ago: 7 },
      { t: "Silver Leaf Ring", c: "handmade-jewellery", price: 1199, d: "An adjustable ring with a single hand-cut leaf. One of a kind — the veins are engraved freehand.", m: ["92.5 Silver"], g: 8, stock: 1, k: "ring", moods: ["minimal", "contemporary"], one: true, how: "The leaf is cut from a sheet and engraved freehand under a loupe.", a: "square", ago: 4 },
    ],
  },
  {
    brand: "Rang Meena Jewels", slug: "rang-meena", email: "rangmeena@handmade.test", city: "Jaipur", state: "Rajasthan", craft: "Terracotta, thread and shell jewellery",
    tagline: "Clay, thread and shell, shaped by hand",
    story: "A small Jaipur workshop making terracotta, thread-embroidered and cowrie-shell jewellery. Pendants are shaped from clay, fired and painted by hand, then strung on cords braided in the studio.",
    products: [
      { t: "Hand-embroidered Floral Necklace Set", c: "handmade-jewellery", price: 1499, d: "Round hand-embroidered floral pendant with matching studs, on a braided cotton thread with pom-pom beads.", m: ["Cotton thread", "Fabric"], g: 40, stock: 9, k: "pendant", moods: ["colourful"], how: "Each flower is stitched in silk thread over a fabric disc, then edged with golden beads.", a: "portrait", ago: 2, img: ["/products/jewel-1.jpg", 736, 1165] },
      { t: "Terracotta Flower Pendant Set", c: "handmade-jewellery", price: 1299, orig: 1599, d: "Hand-painted terracotta disc with clay jasmine flowers, a matching pair of studs and a braided pink-and-white cord.", m: ["Terracotta", "Cotton cord", "Shell"], g: 40, stock: 10, k: "pendant", moods: ["traditional"], how: "Flowers are shaped petal by petal from clay, fired, then painted by hand.", a: "portrait", ago: 3, img: ["/products/jewel-2.jpg", 736, 977] },
      { t: "Rainbow Thread Choker Set", c: "handmade-jewellery", price: 1199, d: "Braided silk-thread choker with silver ghungroo drops and matching crochet earrings. Tie-back cord, adjustable.", m: ["Silk thread", "Oxidised metal"], g: 40, stock: 11, k: "pendant", moods: ["colourful"], how: "Wrapped and braided by hand over several hours, then finished with tiny hand-tied bells.", a: "portrait", ago: 4, img: ["/products/jewel-3.jpg", 1079, 1289] },
      { t: "Warli Terracotta Necklace Set", c: "handmade-jewellery", price: 1399, d: "Hand-painted terracotta pendant with floral motifs, wooden beads and matching floral earrings.", m: ["Terracotta", "Wooden beads", "Cotton cord"], g: 40, stock: 12, k: "pendant", moods: ["traditional"], how: "Painted in acrylic with a fine brush, sealed with a clear coat so the colours last.", a: "portrait", ago: 5, img: ["/products/jewel-4.jpg", 736, 1104] },
      { t: "Shell Flower Jewellery Set", c: "handmade-jewellery", price: 2199, orig: 2599, d: "A full bridal-style set with a red thread necklace, shell-flower pendant, studs and a matching pair of large earrings.", m: ["Cotton thread", "Seashell", "Metal"], g: 40, stock: 13, k: "pendant", moods: ["traditional"], how: "Each shell petal is cut, polished and glued by hand onto a hand-wrapped thread base.", a: "portrait", ago: 6, img: ["/products/jewel-5.jpg", 736, 1069] },
      { t: "Terracotta Sunflower Set", c: "handmade-jewellery", price: 1699, d: "Handmade sunflower pendant with cowrie drops, a mini brooch and a pair of studs, on a black braided cord.", m: ["Terracotta", "Cowrie shell", "Cotton cord"], g: 40, stock: 14, k: "pendant", moods: ["earthy"], how: "Each petal is rolled and pinched from clay by hand before firing and painting.", a: "portrait", ago: 7, img: ["/products/jewel-6.jpg", 735, 945] },
      { t: "Embroidered Emerald Necklace Set", c: "handmade-jewellery", price: 2499, orig: 2999, d: "Emerald-green thread choker with hand-embroidered floral panels, bead drops and matching earrings.", m: ["Cotton thread", "Glass beads"], g: 40, stock: 15, k: "pendant", moods: ["traditional"], how: "Stitched in cotton thread with French knots, a slow process: one set takes about three days.", a: "portrait", ago: 8, img: ["/products/jewel-7.jpg", 360, 538] },
      { t: "Lotus Terracotta Pendant Set", c: "handmade-jewellery", price: 1799, d: "Lotus-painted terracotta pendant ringed with cowrie shells and jute, with matching earrings. One of a kind.", m: ["Terracotta", "Cowrie shell", "Jute"], g: 40, stock: 1, k: "pendant", moods: ["earthy"], one: true, how: "The lotus is painted freehand and the jute is wound around the disc by hand, so no two are the same.", a: "portrait", ago: 9, img: ["/products/jewel-8.jpg", 720, 969] },
      { t: "Veena Terracotta Pearl Set", c: "handmade-jewellery", price: 1999, d: "Veena-shaped terracotta pendant with red petals, pearl-bead chain and matching studs.", m: ["Terracotta", "Faux pearl"], g: 40, stock: 17, k: "pendant", moods: ["traditional"], how: "Moulded in clay, hand-painted in turmeric yellow and red, and strung on a pearl chain.", a: "portrait", ago: 10, img: ["/products/jewel-9.jpg", 736, 898] },
    ],
  },
  {
    brand: "Kashth Crafts", slug: "kashth-crafts", email: "kashth@handmade.test", city: "Saharanpur", state: "Uttar Pradesh", craft: "Hand-carved woodwork",
    tagline: "Wood that remembers the hand",
    story: "Sheesham and mango wood carved in Saharanpur by a family workshop. Three generations share one bench and a collection of chisels older than the shop itself.",
    products: [
      { t: "Sheesham Serving Tray", c: "wooden-crafts", price: 1299, d: "Hand-carved sheesham tray with brass handles.", m: ["Sheesham wood", "Brass"], g: 1100, stock: 20, k: "tray", moods: ["earthy", "traditional"], how: "Cut from one board so the grain flows across the whole tray, finished with food-safe oil.", a: "landscape", ago: 35 },
      { t: "Name-engraved Wooden Keepsake", c: "personalised-gifts", price: 599, d: "Engraved with a name or short message of your choice. Made to order.", m: ["Mango wood"], g: 250, custom: true, stock: 50, k: "keepsake", moods: ["minimal", "contemporary"], how: "Your words are set out by hand and engraved with a fine chisel, then oiled.", a: "square", ago: 15 },
      { t: "Madhubani Wall Painting", c: "art-and-paintings", price: 3499, d: "Original Madhubani painting on handmade paper, made to order.", m: ["Handmade paper", "Natural pigments"], g: 400, custom: true, stock: 5, k: "painting", moods: ["colourful", "traditional"], how: "Drawn with a bamboo nib in natural pigments, line by line, over about a week.", a: "portrait", ago: 22 },
      { t: "Carved Wooden Jewellery Box", c: "wooden-crafts", price: 2199, d: "A lidded box with a hand-carved floral lid and a velvet-lined tray.", m: ["Sheesham wood", "Brass"], g: 700, stock: 9, k: "box", moods: ["traditional", "earthy"], how: "Carved in relief, then joined without nails.", a: "square", ago: 10 },
      { t: "Neem Wood Comb", c: "handmade-lifestyle", price: 349, d: "A wide-tooth comb cut from neem wood, kind to hair and static-free.", m: ["Neem wood"], g: 40, stock: 60, k: "comb", moods: ["minimal", "earthy"], how: "Every tooth is sawn then sanded smooth by hand.", a: "landscape", ago: 18 },
      { t: "Hand-painted Peacock Coaster Set", c: "home-decor", price: 799, d: "Set of four hand-painted wooden coasters with a peacock motif, sealed with food-safe lacquer.", m: ["Mango wood", "Lacquer"], g: 450, stock: 24, k: "coasters", moods: ["colourful", "traditional"], how: "Each peacock is painted freehand and sealed with seven coats of lacquer.", a: "square", ago: 8 },
    ],
  },
  {
    brand: "Pattachitra Collective", slug: "pattachitra-collective", email: "pattachitra@handmade.test", city: "Raghurajpur", state: "Odisha", craft: "Pattachitra scroll painting",
    tagline: "Stories painted on cloth, as they have been for centuries",
    story: "A collective of chitrakar families in the heritage craft village of Raghurajpur. They paint mythology and folklore on tamarind-gum-stiffened cloth with colours ground from stone and shell.",
    products: [
      { t: "Pattachitra Tree of Life", c: "art-and-paintings", price: 2999, d: "A single painting of the tree of life on treated cloth. Painted once, never repeated.", m: ["Cotton cloth", "Stone pigments"], g: 350, stock: 1, k: "painting", moods: ["traditional", "colourful"], one: true, how: "The cloth is layered and polished with a stone before painting. Black outlines are drawn last.", a: "tall", ago: 1 },
      { t: "Pattachitra Bookmark Set", c: "traditional-indian-crafts", price: 299, d: "Three hand-painted bookmarks in miniature pattachitra motifs.", m: ["Treated cloth", "Stone pigments"], g: 30, stock: 80, k: "bookmark", moods: ["traditional", "colourful"], how: "Painted at the end of the day from leftover pigments on cloth offcuts.", a: "tall", ago: 13 },
    ],
  },
  {
    brand: "Kutch Threads", slug: "kutch-threads", email: "kutch@handmade.test", city: "Bhuj", state: "Gujarat", craft: "Kutch embroidery & mirror work",
    tagline: "Mirrors, thread and desert light",
    story: "A women-led embroidery group in Bhuj, stitching Kutchi mirror work and kharek patterns. Each design is worked from memory, never from a pattern.",
    products: [
      { t: "Kutch Embroidered Pouch", c: "bags-and-accessories", price: 549, d: "A zip pouch with dense Kutchi embroidery and small mirrors.", m: ["Cotton", "Silk thread", "Mirrors"], g: 90, stock: 28, k: "pouch", moods: ["colourful", "traditional"], how: "Stitched by hand over about two days.", a: "square", ago: 11 },
      { t: "Mirror-work Wall Hanging", c: "home-decor", price: 1799, d: "A hand-embroidered wall hanging with dozens of tiny mirrors on a cotton drape.", m: ["Cotton", "Mirrors", "Silk thread"], g: 500, stock: 6, k: "hanging", moods: ["colourful", "traditional"], how: "Mirrors are held in place with interlaced stitches.", a: "portrait", ago: 14 },
    ],
  },
  {
    brand: "Bidri & Brass Co.", slug: "bidri-brass", email: "bidri@handmade.test", city: "Bidar", state: "Karnataka", craft: "Bidri metal inlay",
    tagline: "Silver on black, cut by hand",
    story: "Bidri artists from Bidar, one of the few places the craft survives. Zinc is cast, inlaid with pure silver and blackened with soil from the old fort.",
    products: [
      { t: "Bidri Inlay Trinket Dish", c: "traditional-indian-crafts", price: 1999, d: "A small round dish with silver inlay on a black ground.", m: ["Zinc alloy", "Silver inlay"], g: 220, stock: 7, k: "dish", moods: ["traditional", "contemporary"], how: "Silver wire is hammered into engraved lines, then the dish is darkened with Bidar fort soil.", a: "landscape", ago: 16 },
    ],
  },
];

async function seedCategories(db: PGlite) {
  const ids = new Map<string, string>();
  let i = 0;
  for (const [slug, name] of CATEGORIES) {
    const r = await db.query<{ id: string }>("insert into categories (slug, name, sort_order) values ($1,$2,$3) returning id", [slug, name, i++]);
    ids.set(slug, r.rows[0].id);
  }
  return ids;
}

/** First admin of a live site, from ADMIN_EMAIL / ADMIN_PASSWORD. Does nothing once any super admin exists. */
async function bootstrapAdmin(db: PGlite) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  if ((await db.query("select 1 from user_roles where role = 'super_admin' limit 1")).rows.length) return;
  await db.transaction(async (t) => {
    const u = await t.query<{ id: string }>("insert into users (email, full_name, password_hash) values ($1,'Platform Admin',$2) returning id", [email, hashPassword(password)]);
    await t.query("insert into user_roles (user_id, role) values ($1,'super_admin')", [u.rows[0].id]);
  });
}

export async function seedIfEmpty(db: PGlite) {
  const n = await db.query<{ c: number }>("select count(*)::int as c from categories");
  if (!demoMode()) {
    // a live site gets reference data only: no demo accounts, and nothing is ever rebuilt
    if (!n.rows[0].c) await seedCategories(db);
    await bootstrapAdmin(db);
    return;
  }
  if (n.rows[0].c > 0) {
    const v = await db.query<{ value: string }>("select value from settings where key = 'demo_seed_version'");
    const demo = await db.query("select 1 from users where email = $1", [DEMO.admin.email]);
    // Existing demo-only data from an older seed → rebuild it. Databases without the demo admin are never touched.
    if (v.rows[0]?.value === SEED_VERSION || !demo.rows.length) return;
    await db.exec("truncate table users, categories, coupons, collections, newsletter_subscribers, banners, homepage_sections, audit_logs cascade");
    await db.exec("alter sequence order_number_seq restart with 1001");
  }
  await seed(db);
  await db.query("insert into settings (key, value) values ('demo_seed_version', $1) on conflict (key) do update set value = excluded.value", [SEED_VERSION]);
}

async function seed(db: PGlite) {
  const catId = await seedCategories(db);
  const mkUser = async (email: string, name: string, role: string, pw: string) => {
    const u = await db.query<{ id: string }>("insert into users (email, full_name, password_hash) values ($1,$2,$3) returning id", [email, name, hashPassword(pw)]);
    await db.query("insert into user_roles (user_id, role) values ($1,$2)", [u.rows[0].id, role]);
    return u.rows[0].id;
  };
  await mkUser(DEMO.admin.email, "Platform Admin", "super_admin", DEMO.admin.password);
  const buyer = await mkUser(DEMO.buyer.email, "Demo Buyer", "buyer", DEMO.buyer.password);
  await db.query("insert into buyer_profiles (user_id) values ($1)", [buyer]);
  await db.query("insert into addresses (user_id, kind, name, phone, line1, city, state, pincode, is_default) values ($1,'shipping','Demo Buyer','9876543210','12 MG Road','Bengaluru','Karnataka','560001',true)", [buyer]);

  let n = 0;
  const sellerIds: Record<string, string> = {};
  const productIds: Record<string, string> = {};
  for (const s of SELLERS) {
    const uid = await mkUser(s.email, s.brand, "seller", DEMO.seller.password);
    const sp = await db.query<{ id: string }>(
      `insert into seller_profiles (user_id, brand_name, slug, seller_type, status, story, location, craft, tagline, profile_image_url)
       values ($1,$2,$3,'small_business','approved',$4,$5,$6,$7,$8) returning id`,
      [uid, s.brand, s.slug, s.story, `${s.city}, ${s.state}`, s.craft, s.tagline, `/art/maker-${s.slug.slice(0, 8).replace(/[^a-z0-9]/g, "")}.svg?m=${["earthy", "colourful", "traditional", "contemporary"][n % 4]}&a=portrait&l=${s.brand[0]}`]);
    const sid = sp.rows[0].id;
    sellerIds[s.slug] = sid;
    await db.query("insert into addresses (seller_id, kind, name, phone, line1, city, state, pincode) values ($1,'pickup',$2,'9800000000','Workshop Lane 4','Jaipur','Rajasthan','302001')", [sid, s.brand]);
    await db.query("insert into seller_bank_accounts (seller_id, account_holder, account_last4, ifsc, provider_ref) values ($1,$2,'4321','HDFC0000123',$3)", [sid, s.brand, "mockfa_seed"]);
    for (const p of s.products) {
      n++;
      const row = await db.query<{ id: string }>(
        `insert into products (seller_id, category_id, title, description, materials, price_paise, original_price_paise, weight_grams, processing_days,
           is_custom, status, featured, moods, one_of_a_kind, process_note, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',$11,$12,$13,$14, now() - ($15 || ' days')::interval) returning id`,
        [sid, catId.get(p.c), p.t, p.d, p.m, p.price * 100, p.orig ? p.orig * 100 : null, p.g, p.custom ? 10 : 3, !!p.custom, p.price > 1500, p.moods, !!p.one, p.how, String(p.ago)]);
      const pid = row.rows[0].id;
      productIds[p.t] = pid;
      const [w, h] = ASPECTS[p.a];
      if (p.img) {
        // a real photo supplied for this product (test data)
        await db.query("insert into product_images (product_id, url, alt, position, width, height) values ($1,$2,$3,0,$4,$5)", [pid, p.img[0], p.t, p.img[1], p.img[2]]);
      } else for (let v = 0; v < 3; v++) {
        // the first image uses the product's own aspect; detail shots are square-ish crops
        await db.query("insert into product_images (product_id, url, alt, position, width, height) values ($1,$2,$3,$4,$5,$6)",
          [pid, `/art/${p.k}-${n}.svg?m=${p.moods[0]}&v=${v}&a=${p.a}`, `${p.t} — view ${v + 1} (demo artwork)`, v, w, h]);
      }
      const variant = await db.query<{ id: string }>("insert into product_variants (product_id, sku, label) values ($1,$2,'Default') returning id", [pid, `${s.slug}-${pid.slice(0, 6)}`]);
      await db.query("insert into product_inventory (variant_id, on_hand) values ($1,$2)", [variant.rows[0].id, p.stock]);
    }
  }

  await db.query(`insert into coupons (code, kind, value, min_order_paise, max_discount_paise, per_user_limit) values ('WELCOME10','percent',10,50000,30000,1), ('FLAT100','fixed',10000,100000,null,5)`);

  const col = async (slug: string, title: string, description: string, where: string, kind = "curated") => {
    const c = await db.query<{ id: string }>("insert into collections (slug, title, description, kind) values ($1,$2,$3,$4) returning id", [slug, title, description, kind]);
    await db.query(`insert into collection_products select $1, p.id from products p join categories c on c.id = p.category_id where p.status = 'approved' and (${where})`, [c.rows[0].id]);
  };
  await col("home-styling", "Home styling", "Lamps, planters, cushions and pieces that make a room yours.", "c.slug in ('home-decor','handmade-textiles') or p.title ilike '%vase%'");
  await col("thoughtful-gifting", "Thoughtful gifting", "Pieces with a story, ready to give.", "c.slug in ('personalised-gifts','handmade-jewellery') or p.price_paise <= 69900");
  await col("everyday-objects", "Everyday objects", "Things you will reach for every single day.", "c.slug in ('pottery-and-ceramics','handmade-lifestyle','bags-and-accessories')");
  await col("traditional-crafts", "Traditional crafts", "Heritage techniques, kept alive by the hands that know them.", "c.slug in ('traditional-indian-crafts','art-and-paintings') or 'traditional' = any(p.moods)");
  await col("gifts-under-999", "Gifts under ₹999", "Thoughtful, handmade, easy on the wallet.", "p.price_paise <= 99900");
  await col("this-weeks-drop", "This week's drop: Kutch & Odisha", "A small, hand-picked selection from two craft traditions. A new drop is published each week.", "p.title in ('Pattachitra Tree of Life','Pattachitra Bookmark Set','Kutch Embroidered Pouch','Mirror-work Wall Hanging','Filigree Jhumka Earrings')", "drop");

  // a couple of honest demo reviews on delivered-style history aren't fabricated: reviews require real orders, so none are seeded.
  void sellerIds; void productIds;
}
