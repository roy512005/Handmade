/**
 * Demo product artwork. There are no photographs in the demo data, so we generate
 * textured, studio-style compositions as SVG. Real seller uploads replace these.
 */
export type Mood = "earthy" | "minimal" | "colourful" | "traditional" | "contemporary";
export const MOODS: { key: Mood; label: string; blurb: string }[] = [
  { key: "earthy", label: "Earthy", blurb: "Clay, wood and warm tones" },
  { key: "minimal", label: "Minimal", blurb: "Quiet shapes, soft neutrals" },
  { key: "colourful", label: "Colourful", blurb: "Bold dyes and bright prints" },
  { key: "traditional", label: "Traditional", blurb: "Heritage motifs and techniques" },
  { key: "contemporary", label: "Contemporary", blurb: "Modern forms, handmade soul" },
];

const PAL: Record<Mood, { bg: string[]; obj: string[]; acc: string[] }> = {
  earthy: { bg: ["#E9DCC6", "#DCC7A8", "#E4D3BC"], obj: ["#B5623F", "#9A5233", "#C27A52", "#8A6B45"], acc: ["#5E6B3F", "#D9B982", "#7B4A2E"] },
  minimal: { bg: ["#EFEBE3", "#E6E2DA", "#F2EFE8"], obj: ["#F7F4EE", "#D9D4C9", "#BDB7AA", "#8E897E"], acc: ["#282723", "#A39D90", "#C9C3B6"] },
  colourful: { bg: ["#F6D9A0", "#F3C9B5", "#CDE3DD"], obj: ["#D2452F", "#1F7A8C", "#E2A12B", "#B0386B"], acc: ["#293D35", "#F7F3EA", "#6C3FA0"] },
  traditional: { bg: ["#E8D6B5", "#D8C3A0", "#E0CCAA"], obj: ["#223A6B", "#7A1F2B", "#B8892E", "#2F5D4B"], acc: ["#D9B982", "#F7F3EA", "#7A1F2B"] },
  contemporary: { bg: ["#DCE3DA", "#EADBD2", "#E3E6E2"], obj: ["#293D35", "#C66D4B", "#1F2A26", "#8FA695"], acc: ["#F7F3EA", "#D9B982", "#282723"] },
};

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

export const ASPECTS = { portrait: [800, 1000], square: [900, 900], tall: [800, 1100], landscape: [1000, 800] } as const;
export type Aspect = keyof typeof ASPECTS;
export const KINDS = ["vase", "lamp", "bowl", "mug", "planter", "tote", "pouch", "earrings", "pendant", "ring", "tray", "coasters", "painting", "hanging", "throw", "scarf", "box", "dish", "comb", "bookmark", "napkins", "keepsake", "cushion", "maker", "palette"] as const;
export type Kind = (typeof KINDS)[number];

function esc(s: string) { return s.replace(/[<>&"']/g, ""); }

export function artSvg(kind: string, seedStr: string, mood: Mood, view: number, aspect: Aspect, letter = ""): string {
  const [W, H] = ASPECTS[aspect];
  const seed = hash(`${kind}|${seedStr}|${mood}`);
  const r = rng(seed);
  const p = PAL[mood];
  const bg = p.bg[(seed + view) % p.bg.length];
  const obj = pick(r, p.obj), obj2 = pick(r, p.obj), acc = pick(r, p.acc);
  const cx = W / 2;
  const ground = H * (view === 1 ? 0.82 : 0.7);
  const scale = (Math.min(W, H) / 1000) * (view === 1 ? 1.9 : view === 2 ? 1.25 : 1.45);
  const id = `g${seed.toString(36)}${view}`;
  const shade = `<linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>`;
  const o = `fill="${obj}"`;
  const hl = `fill="url(#${id}s)"`;
  let body = "";
  const body2 = (d: string, f = o) => `<path d="${d}" ${f}/><path d="${d}" ${hl}/>`;
  switch (kind) {
    case "vase": body = body2("M-90,0C-150,-110 -160,-240 -62,-300L-44,-390L44,-390L62,-300C160,-240 150,-110 90,0Z") + `<ellipse cx="0" cy="-390" rx="44" ry="10" fill="#000" opacity=".25"/>` + `<path d="M-120,-150Q0,-120 120,-150" stroke="${acc}" stroke-width="7" fill="none" opacity=".8"/><path d="M-110,-210Q0,-180 110,-210" stroke="${acc}" stroke-width="3" fill="none" opacity=".7"/>`; break;
    case "lamp": body = body2("M-75,0C-115,-80 -105,-200 -40,-290L40,-290C105,-200 115,-80 75,0Z") + `<path d="M-150,-290L150,-290L100,-470L-100,-470Z" fill="${p.bg[0]}"/><path d="M-150,-290L150,-290L100,-470L-100,-470Z" ${hl}/><ellipse cx="0" cy="-470" rx="100" ry="14" fill="#fff" opacity=".35"/>`; break;
    case "bowl": body = body2("M-200,-180C-200,-40 -120,0 0,0C120,0 200,-40 200,-180Z") + `<ellipse cx="0" cy="-180" rx="200" ry="26" fill="${obj2}"/><ellipse cx="0" cy="-178" rx="176" ry="18" fill="#000" opacity=".22"/>`; break;
    case "mug": body = body2("M-110,-230L-110,-20Q-110,0 -90,0L90,0Q110,0 110,-20L110,-230Z") + `<path d="M110,-190C190,-190 190,-70 108,-70" stroke="${obj}" stroke-width="26" fill="none"/><ellipse cx="0" cy="-230" rx="110" ry="16" fill="${obj2}"/><ellipse cx="0" cy="-228" rx="92" ry="11" fill="#000" opacity=".3"/>`; break;
    case "planter": body = `<g fill="${acc}"><path d="M0,-250C-60,-330 -150,-320 -170,-260C-120,-250 -60,-250 0,-250Z"/><path d="M0,-250C40,-360 120,-390 160,-330C110,-300 50,-280 0,-250Z"/><path d="M0,-250C-10,-380 30,-440 70,-450C60,-380 30,-310 0,-250Z"/></g>` + body2("M-130,-250L130,-250L100,0L-100,0Z") + `<rect x="-140" y="-270" width="280" height="30" rx="4" fill="${obj2}"/>`; break;
    case "tote": case "pouch": { const w = kind === "tote" ? 150 : 120, h = kind === "tote" ? 270 : 190; let dots = ""; for (let i = 0; i < 16; i++) dots += `<circle cx="${-w + 30 + (i % 4) * ((2 * w - 60) / 3)}" cy="${-h + 40 + Math.floor(i / 4) * (h - 70) / 3}" r="9" fill="${acc}" opacity=".8"/>`; body = body2(`M${-w},-${h}H${w}V0H${-w}Z`) + dots + (kind === "tote" ? `<path d="M-70,-${h}C-70,-${h + 130} 70,-${h + 130} 70,-${h}" stroke="${obj}" stroke-width="16" fill="none"/>` : `<rect x="${-w}" y="-${h}" width="${2 * w}" height="26" fill="${obj2}"/>`); break; }
    case "earrings": body = [-85, 85].map((x) => `<path d="M${x},-380V-330" stroke="${acc}" stroke-width="5"/><path d="M${x},-330C${x - 55},-260 ${x - 45},-130 ${x},-90C${x + 45},-130 ${x + 55},-260 ${x},-330Z" fill="${p.bg[0] === bg ? "#C9C9CD" : "#D5D6DA"}"/><path d="M${x},-330C${x - 55},-260 ${x - 45},-130 ${x},-90C${x + 45},-130 ${x + 55},-260 ${x},-330Z" ${hl}/><circle cx="${x}" cy="-230" r="16" fill="none" stroke="#9A9CA2" stroke-width="4"/>`).join(""); break;
    case "pendant": body = `<path d="M-170,-430C-120,-100 120,-100 170,-430" stroke="#B9BBC1" stroke-width="5" fill="none"/><circle cx="0" cy="-185" r="62" fill="#D5D6DA"/><circle cx="0" cy="-185" r="62" ${hl}/><circle cx="0" cy="-185" r="38" fill="none" stroke="#9A9CA2" stroke-width="5"/><circle cx="0" cy="-185" r="14" fill="${acc}"/>`; break;
    case "ring": body = `<ellipse cx="0" cy="-90" rx="130" ry="130" fill="none" stroke="#D5D6DA" stroke-width="34"/><ellipse cx="0" cy="-90" rx="130" ry="130" fill="none" stroke="url(#${id}s)" stroke-width="34"/><path d="M-26,-215L0,-250L26,-215L0,-195Z" fill="${acc}"/>`; break;
    case "tray": body = body2("M-260,-60C-260,-20 -150,0 0,0C150,0 260,-20 260,-60C260,-95 150,-110 0,-110C-150,-110 -260,-95 -260,-60Z") + `<ellipse cx="0" cy="-62" rx="215" ry="34" fill="#000" opacity=".16"/><rect x="-290" y="-72" width="50" height="16" rx="8" fill="#B9965B"/><rect x="240" y="-72" width="50" height="16" rx="8" fill="#B9965B"/>`; break;
    case "coasters": body = [0, 1, 2].map((i) => `<ellipse cx="${(i - 1) * 40}" cy="${-30 - i * 34}" rx="150" ry="36" fill="${i === 2 ? obj : obj2}"/><ellipse cx="${(i - 1) * 40}" cy="${-30 - i * 34}" rx="150" ry="36" ${hl}/>`).join("") + `<g stroke="${acc}" stroke-width="5" fill="none"><path d="M-60,-124q60,-34 120,0"/><path d="M-40,-132q40,-18 80,0"/></g><circle cx="0" cy="-126" r="9" fill="${acc}"/>`; break;
    case "painting": { let shapes = ""; for (let i = 0; i < 6; i++) shapes += `<circle cx="${-120 + r() * 240}" cy="${-420 + r() * 330}" r="${25 + r() * 60}" fill="${pick(r, [...p.obj, ...p.acc])}" opacity=".85"/>`; body = `<rect x="-190" y="-500" width="380" height="460" fill="#F7F3EA" stroke="#2b2b2b" stroke-width="14"/><rect x="-170" y="-480" width="340" height="420" fill="${bg}"/>${shapes}<path d="M-170,-120Q-60,-200 0,-120T170,-150V-60H-170Z" fill="${obj}" opacity=".9"/>`; break; }
    case "hanging": { let m = ""; for (let i = 0; i < 9; i++) m += `<circle cx="${-90 + (i % 3) * 90}" cy="${-380 + Math.floor(i / 3) * 100}" r="14" fill="#E8E8EC" stroke="${acc}" stroke-width="3"/>`; body = `<rect x="-200" y="-520" width="400" height="14" rx="7" fill="#7B5A36"/>` + body2("M-170,-506H170V-110L90,-150L0,-100L-90,-150L-170,-110Z") + m + `<path d="M-170,-506V-110M170,-506V-110" stroke="${acc}" stroke-width="6"/>`; break; }
    case "throw": case "scarf": case "cushion": { let st = ""; for (let i = 0; i < 9; i++) st += `<rect x="-230" y="${-300 + i * 30}" width="460" height="${i % 3 === 0 ? 14 : 7}" fill="${i % 2 ? acc : obj2}" opacity=".9"/>`; body = `<path d="M-230,-310Q0,-350 230,-310L250,0Q0,40 -250,0Z" ${o}/>${st}<path d="M-230,-310Q0,-350 230,-310L250,0Q0,40 -250,0Z" ${hl}/>` + (kind !== "cushion" ? Array.from({ length: 22 }, (_, i) => `<path d="M${-240 + i * 22},4v26" stroke="${obj2}" stroke-width="4"/>`).join("") : ""); break; }
    case "box": case "dish": case "keepsake": { const h = kind === "box" ? 190 : kind === "dish" ? 60 : 250; const w = kind === "dish" ? 230 : 170; body = `<rect x="${-w}" y="${-h}" width="${2 * w}" height="${h}" rx="10" ${o}/><rect x="${-w}" y="${-h}" width="${2 * w}" height="${h}" rx="10" ${hl}/>` + (kind === "box" ? `<rect x="${-w - 8}" y="${-h - 40}" width="${2 * w + 16}" height="46" rx="8" fill="${obj2}"/>` : "") + `<g stroke="${acc}" stroke-width="4" fill="none" opacity=".9"><path d="M${-w + 30},${-h / 2}h${2 * w - 60}"/><path d="M${-w + 60},${-h / 2 + 20}h${2 * w - 120}"/></g>`; break; }
    case "comb": body = `<rect x="-230" y="-120" width="460" height="90" rx="40" ${o}/><rect x="-230" y="-120" width="460" height="90" rx="40" ${hl}/>` + Array.from({ length: 26 }, (_, i) => `<rect x="${-210 + i * 16}" y="-34" width="7" height="62" rx="3" fill="${obj}"/>`).join(""); break;
    case "bookmark": body = [-100, 0, 100].map((x, i) => `<g transform="rotate(${(i - 1) * 6} ${x} 0)"><path d="M${x - 40},-380H${x + 40}V-20L${x},-60L${x - 40},-20Z" fill="${[obj, obj2, acc][i]}"/><path d="M${x - 40},-380H${x + 40}V-20L${x},-60L${x - 40},-20Z" ${hl}/><circle cx="${x}" cy="-290" r="22" fill="none" stroke="#F7F3EA" stroke-width="4"/><path d="M${x - 20},-200h40M${x - 20},-170h40" stroke="#F7F3EA" stroke-width="4"/></g>`).join(""); break;
    case "napkins": body = [0, 1, 2].map((i) => `<g transform="rotate(${(i - 1) * 9} 0 -${30 + i * 18})"><rect x="-180" y="${-90 - i * 26}" width="360" height="90" rx="4" fill="${[obj, obj2, p.bg[1]][i]}"/><rect x="-180" y="${-90 - i * 26}" width="360" height="90" rx="4" ${hl}/><path d="M-150,${-60 - i * 26}h300" stroke="${acc}" stroke-width="4" stroke-dasharray="14 10"/></g>`).join(""); break;
    case "maker": { body = `<circle cx="0" cy="-260" r="230" fill="${obj}" opacity=".9"/><path d="M-330,0Q-330,-230 0,-250Q330,-230 330,0Z" fill="${obj2}" opacity=".85"/><path d="M-250,0Q-250,-150 0,-170Q250,-150 250,0Z" fill="${acc}" opacity=".9"/>` + (letter ? `<text x="0" y="-215" font-family="Georgia,serif" font-size="230" text-anchor="middle" fill="#F7F3EA">${esc(letter.slice(0, 1).toUpperCase())}</text>` : ""); break; }
    case "palette": { body = `<path d="M-320,0V-330Q-320,-520 -160,-520Q0,-520 0,-330V0Z" fill="${obj}"/><path d="M0,0V-250Q0,-400 130,-400Q260,-400 260,-250V0Z" fill="${obj2}"/><circle cx="-20" cy="-130" r="110" fill="${acc}" opacity=".9"/>`; break; }
    default: body = body2("M-150,0A150,150 0 1 1 150,0Z");
  }

  // background composition: arch/circle + floor + shadow + grain
  const arch = view === 2 ? `<circle cx="${cx + (r() - 0.5) * W * 0.3}" cy="${H * 0.36}" r="${W * 0.34}" fill="${p.bg[(seed + 1) % p.bg.length]}" opacity=".8"/>`
    : `<path d="M${W * 0.14},${ground}V${H * 0.34}Q${W * 0.14},${H * 0.12} ${cx},${H * 0.12}Q${W * 0.86},${H * 0.12} ${W * 0.86},${H * 0.34}V${ground}Z" fill="${p.bg[(seed + 2) % p.bg.length]}" opacity=".75"/>`;
  const prop = view === 2 ? `<g transform="translate(${W * 0.82} ${ground}) scale(${scale * 0.5})"><path d="M0,0V-260" stroke="${acc}" stroke-width="7"/><path d="M0,-130C60,-170 90,-230 70,-290C20,-250 -5,-190 0,-130Z" fill="${acc}" opacity=".85"/><path d="M0,-80C-60,-120 -85,-180 -65,-240C-20,-200 5,-140 0,-80Z" fill="${acc}" opacity=".7"/></g>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"><defs>${shade}<filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed % 97}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0"/></filter><radialGradient id="${id}v" cx=".5" cy=".45" r=".8"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="${bg}"/>${arch}<rect y="${ground}" width="${W}" height="${H - ground}" fill="#000" opacity=".06"/>` +
    `<ellipse cx="${cx}" cy="${ground + 6}" rx="${210 * scale}" ry="${22 * scale}" fill="#000" opacity=".22" filter="blur(6px)"/>` + prop +
    `<g transform="translate(${cx} ${ground}) scale(${scale})">${body}</g>` +
    `<rect width="${W}" height="${H}" fill="url(#${id}v)"/><rect width="${W}" height="${H}" filter="url(#${id}n)" opacity=".5" style="mix-blend-mode:multiply"/></svg>`;
}
