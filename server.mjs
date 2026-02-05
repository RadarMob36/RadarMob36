import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = __filename.slice(0, __filename.lastIndexOf("/"));

function loadDotEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;

    const idx = clean.indexOf("=");
    if (idx <= 0) continue;

    const key = clean.slice(0, idx).trim();
    let value = clean.slice(idx + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const REFRESH_MS = Number(process.env.REFRESH_MS || 120000);
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN || "";
const X_BRAZIL_WOEID = process.env.X_BRAZIL_WOEID || "23424768";
const AUTH_USER = process.env.AUTH_USER || "";
const AUTH_PASS = process.env.AUTH_PASS || "";
const MAX_PULSE_POINTS = 40;
const PULSE_TOPICS = 5;
const CELEBRITY_SOURCES = [
  "uol splash",
  "portal leo dias",
  "leodias",
  "purepeople",
  "contigo",
  "quem",
  "ofuxico",
  "extra famosos",
  "gente (terra)",
  "terra gente",
  "caras",
  "gshow",
  "metrópoles",
  "metropoles",
  "gossip do dia",
  "choquei",
  "alfinetei",
  "rainha matos",
  "tmz",
  "deuxmoi",
  "revistaquem",
];
const SECTION_KEYS = [
  "bbb",
  "fofocas",
  "celebridades",
  "fora_eixo",
  "esportes",
  "noticias",
  "mundo_fofocas",
  "x_twitter",
  "tiktok",
];
const PULSE_SECTIONS = SECTION_KEYS.filter((s) => s !== "fora_eixo");
const FAST_SOURCE_NAMES = new Set([
  "Google Trends BR",
  "G1",
  "CNN Brasil",
  "Portal Leo Dias",
  "Contigo!",
  "OFuxico",
  "Choquei",
  "Trend24 BR",
  "GetDayTrends BR",
]);
const FORA_EIXO_ALLOWED_SOURCES = [
  "correio braziliense",
  "correiobraziliense",
  "diario do amazonas",
  "d24am",
  "correio 24 horas",
  "correio24horas",
  "o povo",
  "opovo",
  "estado de minas",
  "em.com.br",
  "o tempo",
  "otempo",
  "hoje em dia",
  "hojeemdia",
  "gzh",
  "gauchazh",
  "gazeta do povo",
  "gazetadopovo",
  "nsc total",
  "nsctotal",
  "guia de midia",
  "guiademidia",
];

const SOURCES = [
  {
    name: "Google Trends BR",
    url: "https://trends.google.com/trending/rss?geo=BR",
    hint: "noticias",
  },
  {
    name: "G1",
    url: "https://news.google.com/rss/search?q=site:g1.globo.com+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "noticias",
  },
  {
    name: "Correio Braziliense",
    url: "https://news.google.com/rss/search?q=site:correiobraziliense.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "Diário do Amazonas",
    url: "https://news.google.com/rss/search?q=site:d24am.com&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "Correio 24 Horas",
    url: "https://news.google.com/rss/search?q=site:correio24horas.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "O Povo",
    url: "https://news.google.com/rss/search?q=site:opovo.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "Estado de Minas",
    url: "https://news.google.com/rss/search?q=site:em.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "O Tempo",
    url: "https://news.google.com/rss/search?q=site:otempo.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "Hoje em Dia",
    url: "https://news.google.com/rss/search?q=site:hojeemdia.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "GZH",
    url: "https://news.google.com/rss/search?q=site:gauchazh.clicrbs.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "Gazeta do Povo",
    url: "https://news.google.com/rss/search?q=site:gazetadopovo.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "NSC Total",
    url: "https://news.google.com/rss/search?q=site:nsctotal.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Acre)",
    url: "https://www.guiademidia.com.br/jornais.htm#3",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Amapa)",
    url: "https://www.guiademidia.com.br/jornais.htm#7",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Para)",
    url: "https://www.guiademidia.com.br/jornais.htm#29",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Rondonia)",
    url: "https://www.guiademidia.com.br/jornais.htm#49",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Roraima)",
    url: "https://www.guiademidia.com.br/jornais.htm#51",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Tocantins)",
    url: "https://www.guiademidia.com.br/jornais.htm#57",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Pernambuco)",
    url: "https://www.guiademidia.com.br/jornais.htm#40",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Paraiba)",
    url: "https://www.guiademidia.com.br/jornais.htm#36",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Rio Grande do Norte)",
    url: "https://www.guiademidia.com.br/jornais.htm#44",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Piaui)",
    url: "https://www.guiademidia.com.br/jornais.htm#42",
    hint: "fora_eixo",
  },
  {
    name: "Guia de Midia (Sergipe)",
    url: "https://www.guiademidia.com.br/jornais.htm#55",
    hint: "fora_eixo",
  },
  {
    name: "CNN Brasil",
    url: "https://news.google.com/rss/search?q=site:cnnbrasil.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "noticias",
  },
  {
    name: "Extra Famosos",
    url: "https://news.google.com/rss/search?q=site:extra.globo.com+famosos&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "Gente (Terra)",
    url: "https://news.google.com/rss/search?q=site:terra.com.br/diversao/gente&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "UOL Splash",
    url: "https://news.google.com/rss/search?q=site:splash.uol.com.br+celebridades&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "Portal Leo Dias",
    url: "https://news.google.com/rss/search?q=site:leodias.com+famosos&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "Leo Dias Famosos",
    url: "https://news.google.com/rss/search?q=site:portalleodias.com/famosos&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "celebridades",
  },
  {
    name: "Leo Dias Redes Sociais",
    url: "https://news.google.com/rss/search?q=site:portalleodias.com/redes-sociais&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "celebridades",
  },
  {
    name: "Purepeople",
    url: "https://news.google.com/rss/search?q=site:purepeople.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "Contigo!",
    url: "https://news.google.com/rss/search?q=site:contigo.com.br+famosos&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "Quem",
    url: "https://news.google.com/rss/search?q=site:revistaquem.globo.com+celebridades&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "celebridades",
  },
  {
    name: "OFuxico",
    url: "https://news.google.com/rss/search?q=site:ofuxico.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "ge.globo",
    url: "https://news.google.com/rss/search?q=site:ge.globo.com+esportes&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "esportes",
  },
  {
    name: "Lance",
    url: "https://news.google.com/rss/search?q=site:lance.com.br+esportes&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "esportes",
  },
  {
    name: "ESPN Brasil",
    url: "https://news.google.com/rss/search?q=site:espn.com.br+esportes&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "esportes",
  },
  {
    name: "UOL Esporte",
    url: "https://news.google.com/rss/search?q=site:uol.com.br/esporte&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "esportes",
  },
  {
    name: "TMZ",
    url: "https://news.google.com/rss/search?q=site:tmz.com+celebrity&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "mundo_fofocas",
  },
  {
    name: "Deuxmoi",
    url: "https://news.google.com/rss/search?q=Deuxmoi&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "mundo_fofocas",
  },
  {
    name: "People",
    url: "https://news.google.com/rss/search?q=site:people.com+celebrity&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "mundo_fofocas",
  },
  {
    name: "E! Online",
    url: "https://news.google.com/rss/search?q=site:eonline.com+celebrity&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "mundo_fofocas",
  },
  {
    name: "X / Twitter BR",
    url: "https://news.google.com/rss/search?q=site:x.com+Brasil+tend%C3%AAncia+OR+trending+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
  {
    name: "X / Twitter BBB",
    url: "https://news.google.com/rss/search?q=site:x.com+BBB+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
  {
    name: "X / Twitter Esportes",
    url: "https://news.google.com/rss/search?q=site:x.com+futebol+OR+esportes+Brasil+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
  {
    name: "X / Twitter Famosos",
    url: "https://news.google.com/rss/search?q=site:x.com+famosos+OR+celebridades+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
  {
    name: "X Trend Topics BR",
    url: "https://news.google.com/rss/search?q=twitter+trending+topics+brasil+site:x.com&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
  {
    name: "Trend24 BR",
    url: "https://trends24.in/brazil/",
    hint: "x_twitter",
    type: "x_html",
  },
  {
    name: "Trend24 Sao Paulo",
    url: "https://trends24.in/brazil/sao-paulo/",
    hint: "x_twitter",
    type: "x_html",
  },
  {
    name: "GetDayTrends BR",
    url: "https://getdaytrends.com/brazil/",
    hint: "x_twitter",
    type: "x_html",
  },
  {
    name: "TikTok BR Trends",
    url: "https://news.google.com/rss/search?q=site:tiktok.com+trending+brasil+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Viral BR",
    url: "https://news.google.com/rss/search?q=tiktok+viral+brasil+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Challenge BR",
    url: "https://news.google.com/rss/search?q=tiktok+challenge+brasil+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Música BR",
    url: "https://news.google.com/rss/search?q=tiktok+musica+trend+brasil+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Influencers BR",
    url: "https://news.google.com/rss/search?q=tiktok+influenciador+brasil+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Hashtags BR",
    url: "https://news.google.com/rss/search?q=tiktok+hashtags+brasil+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok ForYou BR",
    url: "https://news.google.com/rss/search?q=tiktok+foryou+brasil+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "CARAS Brasil",
    url: "https://news.google.com/rss/search?q=site:caras.com.br+famosos&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "celebridades",
  },
  {
    name: "gshow",
    url: "https://news.google.com/rss/search?q=site:gshow.globo.com+famosos+OR+bbb&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "celebridades",
  },
  {
    name: "Metrópoles Entretenimento",
    url: "https://news.google.com/rss/search?q=site:metropoles.com/entretenimento+famosos&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "celebridades",
  },
  {
    name: "Choquei",
    url: "https://news.google.com/rss/search?q=Choquei+famosos+site:x.com&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "Alfinetei",
    url: "https://news.google.com/rss/search?q=Alfinetei+famosos+site:x.com&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "Rainha Matos",
    url: "https://news.google.com/rss/search?q=Rainha+Matos+famosos+site:x.com&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
];

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(JSON.stringify(payload));
}

function isAuthEnabled() {
  return Boolean(AUTH_USER && AUTH_PASS);
}

function unauthorized(res) {
  res.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="Trends Brasil MOB36"',
  });
  res.end("Unauthorized");
}

function isAuthorized(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Basic ")) return false;
  const encoded = header.slice(6).trim();
  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  return user === AUTH_USER && pass === AUTH_PASS;
}

function htmlDecode(input) {
  return String(input || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function cleanText(input) {
  return htmlDecode(input).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(block, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(regex);
  return m ? htmlDecode(m[1]) : "";
}

function parsePubDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
    time: d.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    ts: d.getTime(),
  };
}

function todayIso() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

function currentHourSp() {
  return Number(
    new Date().toLocaleTimeString("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }),
  );
}

function currentMinuteOfDaySp() {
  const now = new Date();
  const hh = Number(
    now.toLocaleTimeString("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }),
  );
  const mm = Number(
    now.toLocaleTimeString("en-GB", {
      timeZone: "America/Sao_Paulo",
      minute: "2-digit",
      hour12: false,
    }),
  );
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return Math.max(0, Math.min(23 * 60 + 59, hh * 60 + mm));
}

function normalizeTitle(title, sourceName) {
  let t = cleanText(title);
  const parts = t.split(" - ");
  if (parts.length > 1) {
    const tail = (parts.at(-1) || "").toLowerCase();
    const sourceLower = sourceName.toLowerCase();
    if (
      tail.includes(sourceLower) ||
      tail.endsWith(".com") ||
      tail.length <= 24
    ) {
      t = parts.slice(0, -1).join(" - ").trim();
    }
  }
  return t;
}

function buildFallbackUrl(name, category) {
  const q = encodeURIComponent(name);
  if (category === "x_twitter") {
    return `https://x.com/search?q=${q}&src=typed_query`;
  }
  if (category === "tiktok") {
    return `https://www.tiktok.com/search?q=${q}`;
  }
  return `https://trends.google.com/trends/explore?geo=BR&q=${q}`;
}

function normalizeTopicName(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function extractShortXTopic(title) {
  const raw = String(title || "").trim();
  const hash = raw.match(/#[A-Za-z0-9_]+/g);
  if (hash && hash.length) return hash[0];
  const clean = raw
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}#@\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.split(" ").slice(0, 4).join(" ");
}

function isLikelyXTrendTopic(name) {
  const raw = String(name || "").trim();
  if (!raw) return false;
  if (raw.length < 2 || raw.length > 48) return false;

  const t = normalizeTopicName(raw);
  const blocked =
    /\b(trends24|getdaytrends|twitter|x twitter|xcom|x com|youtube|gumroad|feedback|login|sign ?up|privacy|terms|cookies|home|about|contact|download|app|ads|help|status)\b/;
  if (blocked.test(t)) return false;
  if (/^(trending|trend|topics?)$/i.test(t)) return false;

  const words = t.split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  if (words.length === 1 && words[0].length < 3 && !words[0].startsWith("#")) return false;

  const hasUsefulToken =
    /#/.test(raw) || /\d/.test(raw) || words.some((w) => w.length >= 3);
  return hasUsefulToken;
}

function extractCelebrityName(text) {
  try {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return null;

    const blockedStarts = [
      "Marido",
      "Esposa",
      "Filha",
      "Filho",
      "Camarote",
      "Espetáculo",
      "Novela",
      "Reality",
      "Big Brother",
      "BBB",
    ];
    const blockedWhole = [
      "Raizes Em Movimento",
      "Raízes Em Movimento",
      "Tela Quente",
      "Globo",
      "Carnaval 2026",
    ];

    const candidates = [];
    const prepositionHit = raw.match(
      /(?:de|com|sobre|contra|ap[oó]s)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){1,2})/,
    );
    if (prepositionHit?.[1]) candidates.push(prepositionHit[1]);

    const regex =
      /\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){1,2})\b/g;
    let match;
    while ((match = regex.exec(raw))) {
      if (match[1]) candidates.push(match[1]);
    }

    for (const c of candidates) {
      const clean = c.replace(/\s+/g, " ").trim();
      if (!clean || clean.length < 5) continue;
      if (blockedWhole.some((w) => w.toLowerCase() === clean.toLowerCase())) continue;
      if (blockedStarts.some((s) => clean.startsWith(s))) continue;
      return clean;
    }
    return null;
  } catch {
    return null;
  }
}

function derivePulseTopic(item) {
  const name = String(item?.name || "");
  const desc = String(item?.desc || "");
  let text = `${name} ${desc}`.toLowerCase();

  if (item?.category === "bbb") return "BBB";
  if (item?.category === "esportes" && /flamengo|palmeiras|corinthians|vasco|santos|grêmio|internacional|cruzeiro|atlético|botafogo|bahia|fortaleza|ceará/i.test(text)) {
    // segue para detectar time específico abaixo
  } else if (item?.category === "esportes") {
    // Evita tópico genérico no pulso.
    // Se não acharmos assunto específico, o item não entra no gráfico.
    return null;
  }

  // Remove ruído comum que vira "assunto" indevido no gráfico.
  text = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b(g1|cnn brasil|uol|splash|purepeople|contigo|ofuxico|quem|extra|tmz|deuxmoi|alfinetei|choquei|rainha matos|gossip do dia|instagram)\b/g, " ")
    .replace(/[^\p{L}\p{N}#\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/\bbbb\b|big brother|pared[aã]o|anjo|prova do l[ií]der/.test(text)) return "BBB";

  const teams = [
    "flamengo",
    "palmeiras",
    "corinthians",
    "são paulo",
    "santos",
    "vasco",
    "grêmio",
    "cruzeiro",
    "atlético mineiro",
    "atlético-mg",
    "botafogo",
    "bahia",
    "fortaleza",
    "ceará",
    "sport",
  ];
  for (const team of teams) {
    if (text.includes(team)) return team.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // "Internacional" sozinho costuma virar ruído (adjetivo), só aceita em contexto de jogo.
  if (/\b(inter\s*x\s*|x\s*inter\b|internacional\s*x\s*|x\s*internacional\b|sport club internacional)\b/.test(text)) {
    return "Internacional";
  }

  const versus = `${name} ${desc}`.match(/\b([A-Za-zÀ-ÖØ-öø-ÿ]{3,})\s*x\s*([A-Za-zÀ-ÖØ-öø-ÿ]{3,})\b/i);
  if (versus) {
    const left = versus[1].replace(/\b\w/g, (c) => c.toUpperCase());
    const right = versus[2].replace(/\b\w/g, (c) => c.toUpperCase());
    return `${left} x ${right}`;
  }
  if (/\b(brasileir[aã]o|libertadores|copa do brasil)\b/.test(text)) {
    return null;
  }
  if (/\bfutebol\b|champions|nba|nfl|ufc|f1/.test(text)) {
    return null;
  }

  const hashtags = `${name} ${desc}`.match(/#([A-Za-z0-9_]+)/g) || [];
  const usefulTag = hashtags.find((h) => !/^#(fyp|foryou|viral|trend|brasil)$/i.test(h));
  if (usefulTag) return usefulTag.toUpperCase();

  // Pega um rótulo curto e útil do título (sem canal/plataforma).
  const cleanedTitle = name
    .replace(/\b(G1|CNN Brasil|UOL|Splash|Purepeople|Contigo|OFuxico|Quem|Extra|TMZ|Deuxmoi|Alfinetei|Choquei|TikTok|Twitter|X|Trend|Topics|Brasil|Hoje|Agora)\b/gi, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const short = cleanedTitle.split(/\s+/).slice(0, 3).join(" ");

  if (!short || short.length < 3) return null;
  if (/^(alfinetei|choquei|gossip|instagram|portal|x|twitter|tiktok|internacional|esportes|jogos|jogos de hoje|not[ií]cias?)$/i.test(short)) return null;
  return short;
}

function isGenericPulseTopic(topic) {
  const t = normalizeTopicName(topic);
  return /^(internacional|esportes|jogos de hoje|brasileir[aã]o \/ jogos|not[ií]cias sobre|mundo|fofocas?)$/.test(t);
}

function categoryFromText(text, hint) {
  const t = text.toLowerCase();

  if (hint === "x_twitter") return "x_twitter";
  if (hint === "tiktok") return "tiktok";
  if (hint === "mundo_fofocas") return "mundo_fofocas";

  if (/(tiktok|for you|foryou|viralizou|trend do tiktok|challenge|dancinha|áudio viral|audio viral|#fyp)/.test(t)) {
    return "tiktok";
  }

  if (/(bbb|big brother|pared[aã]o|anjo|prova do l[ií]der)/.test(t)) {
    return "bbb";
  }

  if (
    /(futebol|nba|nfl|ufc|f1|f[óo]rmula 1|esporte|brasileir[aã]o|copa|jogo|gol|time|campeonato)/.test(
      t,
    )
  ) {
    return "esportes";
  }

  if (
    /(famos|celebr|atriz|ator|cantor|cantora|reality|novela|hollywood|casal|fofoca|babado)/.test(
      t,
    )
  ) {
    return "celebridades";
  }

  return "noticias";
}

function badgeForItem(index, publishedIso, today) {
  if (publishedIso === today && index < 3) return "hot";
  if (publishedIso === today && index < 7) return "rising";
  return "new";
}

function parseRssItems(xml, source, today) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return blocks
    .map((block, idx) => {
      const rawTitle = extractTag(block, "title");
      const link = extractTag(block, "link");
      const description = cleanText(extractTag(block, "description"));
      const sourceTag = extractTag(block, "source");
      const newsItemUrl = extractTag(block, "h:news_item_url");
      const pubDateRaw =
        extractTag(block, "pubDate") ||
        extractTag(block, "published") ||
        extractTag(block, "updated");
      const pubDate = parsePubDate(pubDateRaw);
      if (!pubDate) return null;
      const nowTs = Date.now();
      const publishedAt = pubDate.date;
      const publishedTime = pubDate.time;
      const publishedTs = pubDate.ts;
      const sourceName = sourceTag || source.name;
      const title = normalizeTitle(rawTitle, sourceName);

      if (!title) return null;

      const allText = `${title} ${description} ${sourceName}`;

      return {
        name: source.hint === "x_twitter" ? extractShortXTopic(title) : title,
        badge: badgeForItem(idx, publishedAt, today),
        desc: description,
        source: sourceName,
        url: cleanText(newsItemUrl || link),
        published_at: publishedAt,
        published_time: publishedTime,
        published_ts: publishedTs,
        is_today: publishedAt === today,
        age_hours: Math.max(0, (nowTs - publishedTs) / 3600000),
        category: categoryFromText(allText, source.hint),
      };
    })
    .filter(Boolean);
}

function isWeakArticle(item) {
  const title = String(item?.name || "").toLowerCase();
  const url = String(item?.url || "").toLowerCase();
  const desc = String(item?.desc || "").toLowerCase();
  const text = `${title} ${desc}`;

  if (/p[aá]gina\s*\d+/.test(text)) return true;
  if (/^\s*not[ií]cias?\s+sobre\b/.test(title)) return true;
  if (/(\/tag\/|\/tags\/|\/categoria\/|\/author\/|\/page\/|\/pagina\/)/.test(url))
    return true;
  if (/(lista de|arquivo de|todas as not[ií]cias)/.test(text)) return true;

  return false;
}

function isOutsideRioSaoPaulo(item) {
  const text = `${item?.name || ""} ${item?.desc || ""} ${item?.source || ""}`.toLowerCase();
  const outsideKeywords = [
    "acre",
    "alagoas",
    "amapá",
    "amapa",
    "amazonas",
    "bahia",
    "ceará",
    "ceara",
    "distrito federal",
    "espírito santo",
    "espirito santo",
    "goiás",
    "goias",
    "maranhão",
    "maranhao",
    "mato grosso",
    "mato grosso do sul",
    "minas gerais",
    "pará",
    "para",
    "paraíba",
    "paraiba",
    "paraná",
    "parana",
    "pernambuco",
    "piauí",
    "piaui",
    "rio grande do norte",
    "rio grande do sul",
    "rondônia",
    "rondonia",
    "roraima",
    "santa catarina",
    "sergipe",
    "tocantins",
    "salvador",
    "fortaleza",
    "belo horizonte",
    "recife",
    "porto alegre",
    "curitiba",
    "manaus",
    "belém",
    "belem",
    "goiânia",
    "goiania",
    "maceió",
    "maceio",
    "natal",
    "joão pessoa",
    "joao pessoa",
    "são luís",
    "sao luis",
    "aracaju",
    "florianópolis",
    "florianopolis",
    "vitória",
    "vitoria",
    "cuiabá",
    "cuiaba",
    "campo grande",
    "palmas",
    "boa vista",
    "rio branco",
    "porto velho",
    "macapá",
    "macapa",
  ];

  return outsideKeywords.some((k) => text.includes(k));
}

function isSportsContent(item) {
  const text = `${item?.name || ""} ${item?.desc || ""} ${item?.source || ""}`.toLowerCase();
  if (/(lance|ge\.|ge |espn|otempo.*esport|uol esporte)/.test(text)) return true;
  return /(futebol|jogo|rodada|campeonato|brasileir[aã]o|libertadores|copa do brasil|gol|zagueiro|volante|meia|atacante|patroc[ií]nio|palmeiras|flamengo|corinthians|santos|gr[eê]mio|internacional|cruzeiro|atl[eé]tico|fluminense|vasco|botafogo|bahia)/.test(text);
}

function isCultureOrGossipLocal(item) {
  const text = `${item?.name || ""} ${item?.desc || ""} ${item?.source || ""}`.toLowerCase();
  return /(fofoca|famos|celebr|atriz|ator|cantor|cantora|novela|reality|bbb|cultura|arte|show|m[uú]sica|festival|teatro|cinema|dan[cç]a|exposi[cç][aã]o|carnaval|bloco|influenciador|babado)/.test(text);
}

function isDisallowedForaEixoContent(item) {
  const text = `${item?.name || ""} ${item?.desc || ""} ${item?.source || ""}`.toLowerCase();
  if (/(bbb|big brother|pared[aã]o|anjo|prova do l[ií]der)/.test(text)) return true;
  if (
    /(prefeito|governador|deputado|senador|senado|c[aâ]mara|congresso|elei[cç][aã]o|partido|pol[ií]tica|ministro|presidente|plen[aá]rio|vereador|prefeitura|governo|secretaria|campanha|mandato|justi[cç]a eleitoral|tribunal|stf|tse|mp|minist[eé]rio p[úu]blico)/.test(
      text,
    )
  )
    return true;
  if (/(economia|econ[oô]mico|d[óo]lar|infla[cç][aã]o|juros|ibovespa|bolsa|banco|pib|emprestimo|finan[cç]as|or[cç]amento|impostos?|tributo|taxa|sal[aá]rio|receita|despesa|d[íi]vida|cr[eé]dito)/.test(text))
    return true;
  return false;
}

function isAllowedForaEixoSource(sourceName) {
  const s = String(sourceName || "").toLowerCase();
  return FORA_EIXO_ALLOWED_SOURCES.some((k) => s.includes(k));
}

function parseXTrendsFromHtml(html, source, today) {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const candidates = [];
  const anchorRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html))) {
    const text = cleanText(match[1]);
    if (!text) continue;
    if (text.length > 64) continue;
    if (!/[#@]|[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/.test(text)) continue;
    if (/^(home|about|login|privacy|terms|contact|more)$/i.test(text)) continue;
    if (!isLikelyXTrendTopic(text)) continue;
    candidates.push(text);
  }

  const seen = new Set();
  return candidates
    .map((name, idx) => ({
      name: extractShortXTopic(name),
      badge: idx < 3 ? "hot" : idx < 7 ? "rising" : "new",
      desc: "Trend topic do X no Brasil",
      source: source.name,
      url: `https://x.com/search?q=${encodeURIComponent(name)}&src=typed_query`,
      published_at: today,
      published_time: time,
      published_ts: now.getTime(),
      is_today: true,
      age_hours: 0,
      category: "x_twitter",
    }))
    .filter((item) => item.name && item.name.length >= 2 && isLikelyXTrendTopic(item.name))
    .filter((item) => {
      const key = normalizeTopicName(item.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "trends-brasil/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "trends-brasil/1.0",
        ...headers,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function parseXTrendsFromApi(payload, source, today) {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const trendList = Array.isArray(payload?.[0]?.trends) ? payload[0].trends : [];
  const seen = new Set();

  return trendList
    .map((trend, idx) => {
      const topic = extractShortXTopic(trend?.name || "");
      const key = normalizeTopicName(topic);
      if (!topic || !key || seen.has(key) || !isLikelyXTrendTopic(topic)) return null;
      seen.add(key);
      return {
        name: topic,
        badge: idx < 3 ? "hot" : idx < 7 ? "rising" : "new",
        desc: "Trend topic oficial do X no Brasil",
        source: source.name,
        url: cleanText(trend?.url) || `https://x.com/search?q=${encodeURIComponent(topic)}&src=typed_query`,
        published_at: today,
        published_time: time,
        published_ts: now.getTime(),
        is_today: true,
        age_hours: 0,
        category: "x_twitter",
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

async function buildTrends(sourceOverride) {
  const today = todayIso();
  const baseSources = Array.isArray(sourceOverride) && sourceOverride.length ? sourceOverride : SOURCES;
  const activeSources = [...baseSources];
  if (X_BEARER_TOKEN) {
    activeSources.unshift({
      name: "X API Official BR",
      url: `https://api.twitter.com/1.1/trends/place.json?id=${encodeURIComponent(X_BRAZIL_WOEID)}`,
      hint: "x_twitter",
      type: "x_api_v1",
    });
  }

  const tasks = activeSources.map(async (source) => {
    try {
      const items = (() => {
        if (source.type === "x_api_v1") {
          return fetchJson(source.url, {
            Authorization: `Bearer ${X_BEARER_TOKEN}`,
          }).then((payload) => parseXTrendsFromApi(payload, source, today));
        }
        return fetchText(source.url).then((raw) =>
          source.type === "x_html" ? parseXTrendsFromHtml(raw, source, today) : parseRssItems(raw, source, today),
        );
      })();
      const resolvedItems = await withTimeout(
        items,
        8000,
        `Timeout ao buscar ${source.name}`,
      );
      return { source: source.name, ok: true, items: resolvedItems, count: resolvedItems.length };
    } catch (error) {
      return {
        source: source.name,
        ok: false,
        items: [],
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const results = await Promise.all(tasks);

  const merged = [];
  for (const r of results) {
    merged.push(...r.items);
  }

  const groups = new Map();
  for (const item of merged.map(applyCategoryRules)) {
    const key = normalizeTopicName(item.name);
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: item.name,
        items: [],
        sourceSet: new Set(),
        categoryVotes: {},
        bestTs: 0,
      });
    }

    const group = groups.get(key);
    group.items.push(item);
    group.sourceSet.add(item.source);
    group.categoryVotes[item.category] = (group.categoryVotes[item.category] || 0) + 1;

    const ts = Date.parse(`${item.published_at}T${item.published_time || "00:00:00"}-03:00`);
    if (Number.isFinite(ts) && ts >= group.bestTs) {
      group.bestTs = ts;
      group.name = item.name;
    }
  }

  function keywordCategory(text) {
    const t = text.toLowerCase();
    if (/(bbb|pared[aã]o|big brother)/.test(t)) return "bbb";
    if (/(tiktok|foryou|challenge|#fyp)/.test(t)) return "tiktok";
    if (/(x.com|twitter|trend topics)/.test(t)) return "x_twitter";
    if (/(tmz|deuxmoi|hollywood)/.test(t)) return "mundo_fofocas";
    if (/(futebol|esporte|jogo|gol|campeonato|nba|nfl|ufc|f1)/.test(t)) return "esportes";
    if (/(fofoca|babado|influenciador|gossip)/.test(t)) return "fofocas";
    if (/(famos|celebr|atriz|ator|cantor|cantora|novela|reality)/.test(t)) return "celebridades";
    return "noticias";
  }

  const grouped = Array.from(groups.values()).map((group) => {
    const latest = [...group.items].sort((a, b) => {
      const ta = Date.parse(`${a.published_at}T${a.published_time || "00:00:00"}-03:00`);
      const tb = Date.parse(`${b.published_at}T${b.published_time || "00:00:00"}-03:00`);
      return tb - ta;
    })[0];

    const textBlob = group.items.map((i) => `${i.name} ${i.desc || ""} ${i.source}`).join(" ");
    const kcat = keywordCategory(textBlob);
    const voted = Object.entries(group.categoryVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || "noticias";
    const category = kcat !== "noticias" ? kcat : voted;

    const sourceCount = group.sourceSet.size;
    const mentionCount = group.items.length;
    const maxItemScore = Math.max(...group.items.map(itemScore));
    const heatScore = sourceCount * 5 + mentionCount * 2 + maxItemScore;

    return {
      name: group.name,
      desc: latest?.desc || "",
      source:
        sourceCount > 1
          ? `${latest?.source || "Web"} +${sourceCount - 1} fontes`
          : latest?.source || "Web",
      published_at: latest?.published_at || today,
      published_time: latest?.published_time || "00:00:00",
      category,
      heatScore,
      mentionCount,
      sourceCount,
      is_today: Boolean(latest?.is_today),
      age_hours: Number(latest?.age_hours ?? 999),
      url:
        !latest?.url || latest.url.includes("/trending/rss")
          ? buildFallbackUrl(group.name, category)
          : latest.url,
    };
  }).filter((item) => !isWeakArticle(item));

  const payload = {
    bbb: [],
    fofocas: [],
    celebridades: [],
    fora_eixo: [],
    esportes: [],
    noticias: [],
    mundo_fofocas: [],
    x_twitter: [],
    tiktok: [],
  };

  for (const section of SECTION_KEYS) {
    const baseItems =
      section === "fora_eixo"
        ? grouped.filter(
            (item) =>
              isAllowedForaEixoSource(item.source) &&
              isOutsideRioSaoPaulo(item) &&
              isCultureOrGossipLocal(item) &&
              !isSportsContent(item) &&
              !isDisallowedForaEixoContent(item),
          )
        : section === "celebridades"
          ? grouped.filter((item) => /(leo dias|gossip do dia|choquei|contigo|ofuxico)/.test(String(item.source || "").toLowerCase()))
          : grouped.filter((item) => item.category === section);

    const ranked = baseItems
      .filter((item) => {
        const source = String(item.source || "").toLowerCase();
        if (section === "noticias") {
          return source.includes("google trends");
        }
        if (section === "mundo_fofocas") {
          return /(tmz|deuxmoi|people|e! online|eonline)/.test(source);
        }
        if (section === "celebridades") {
          return /(leo dias|gossip do dia|choquei|contigo|ofuxico)/.test(source);
        }
        if (section === "x_twitter") {
          return (
            /(x api official br|trend24|getdaytrends|x \/ twitter|x trend topics)/.test(source) &&
            String(item.name || "").length <= 40 &&
            isLikelyXTrendTopic(item.name)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (section === "x_twitter") {
          const score = (src) => {
            const s = String(src || "").toLowerCase();
            if (s.includes("x api official br")) return 3;
            if (s.includes("trend24") || s.includes("getdaytrends")) return 2;
            if (s.includes("x / twitter") || s.includes("x trend topics")) return 1;
            return 0;
          };
          const sa = score(a.source);
          const sb = score(b.source);
          if (sb !== sa) return sb - sa;
        }
        if (b.heatScore !== a.heatScore) return b.heatScore - a.heatScore;
        const ta = Date.parse(`${a.published_at}T${a.published_time || "00:00:00"}-03:00`);
        const tb = Date.parse(`${b.published_at}T${b.published_time || "00:00:00"}-03:00`);
        return tb - ta;
      })
      .filter((item) => item.age_hours <= 48);

    // Preferencia: itens de hoje, depois fallback recente para completar 10.
    let working = ranked;
    if (section === "celebridades") {
      working = ranked.map((item) => {
        const celeb = extractCelebrityName(`${item.name} ${item.desc || ""}`);
        return { ...item, celeb };
      });

      working.sort((a, b) => {
        const ca = a.celeb ? 1 : 0;
        const cb = b.celeb ? 1 : 0;
        if (cb !== ca) return cb - ca;
        if (b.heatScore !== a.heatScore) return b.heatScore - a.heatScore;
        const ta = Date.parse(`${a.published_at}T${a.published_time || "00:00:00"}-03:00`);
        const tb = Date.parse(`${b.published_at}T${b.published_time || "00:00:00"}-03:00`);
        return tb - ta;
      });
    }

    const todayItems = working.filter((x) => x.is_today);
    const fallback = working.filter((x) => !x.is_today);
    let selected = [...todayItems, ...fallback].slice(0, 10);
    if (section === "celebridades") {
      const unique = [];
      const seenCeleb = new Set();
      for (const item of selected) {
        const key = normalizeTopicName(item.celeb || item.name);
        if (item.celeb && seenCeleb.has(key)) continue;
        unique.push(item);
        if (item.celeb) seenCeleb.add(key);
      }
      selected = unique.slice(0, 10);
    }

    payload[section] = selected.map((item, idx) => ({
        name: section === "celebridades" && item.celeb ? item.celeb : item.name,
        badge: idx < 2 ? "hot" : idx < 6 ? "rising" : "new",
        desc: item.desc,
        source: item.source,
        published_at: item.published_at,
        published_time: item.published_time,
        url: item.url,
      }));
  }

  payload.meta = {
    updated_at: new Date().toISOString(),
    timezone: "America/Sao_Paulo",
    date: today,
    sources_ok: results.filter((r) => r.ok).length,
    sources_total: results.length,
    source_status: results.map((r) => ({
      source: r.source,
      ok: r.ok,
      items: r.count,
      error: r.ok ? null : r.error,
    })),
  };

  return payload;
}

function itemScore(item) {
  if (item.badge === "hot") return 3;
  if (item.badge === "rising") return 2;
  return 1;
}

function buildScoreMap(trends) {
  const scores = {};
  for (const section of SECTION_KEYS) {
    const items = Array.isArray(trends?.[section]) ? trends[section] : [];
    for (const item of items) {
      const key = normalizeTopicName(item.name);
      if (!key) continue;
      scores[key] = (scores[key] || 0) + itemScore(item);
    }
  }
  return scores;
}

function isCelebritySource(sourceName) {
  const s = String(sourceName || "").toLowerCase();
  return CELEBRITY_SOURCES.some((k) => s.includes(k));
}

function applyCategoryRules(item) {
  // Mantemos todas as fontes elegíveis para todas as colunas;
  // a consolidação final decide os temas mais quentes por sobreposição.
  return item;
}

function computeTotalScore(scoreMap) {
  return Object.values(scoreMap).reduce((acc, value) => acc + value, 0);
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label || "Timeout")), ms),
    ),
  ]);
}

const state = {
  trends: null,
  pulse: [],
  hourlyTopics: {},
  minuteTopics: {},
  topicLabels: {},
  seenItemKeys: new Set(),
  lastRefreshTs: 0,
  lastDateKey: null,
  refreshing: false,
  refreshPromise: null,
  lastError: null,
};

async function refreshData(force = false) {
  const now = Date.now();
  const freshEnough = now - state.lastRefreshTs < REFRESH_MS / 2;
  if (!force && state.trends && freshEnough) return;
  if (state.refreshPromise) {
    await state.refreshPromise;
    return;
  }

  state.refreshPromise = (async () => {
    state.refreshing = true;
    try {
      const initialSources = state.trends
        ? null
        : SOURCES.filter((s) => FAST_SOURCE_NAMES.has(s.name));
      const trends = await withTimeout(
        buildTrends(initialSources),
        45000,
        "Tempo limite ao buscar fontes.",
      );
      const dateKey = trends?.meta?.date || null;
      if (dateKey && state.lastDateKey && state.lastDateKey !== dateKey) {
        // Virou o dia em SP: reinicia o pulso para refletir apenas o dia atual.
        state.pulse = [];
        state.hourlyTopics = {};
        state.minuteTopics = {};
        state.topicLabels = {};
        state.seenItemKeys = new Set();
      }

      // Acumula score por hora (00-23) e também snapshot por refresh.
      const topicScores = {};
      for (const section of PULSE_SECTIONS) {
        const items = Array.isArray(trends?.[section]) ? trends[section] : [];
        for (const item of items) {
          const rawTopic = derivePulseTopic(item);
          const topic = normalizeTopicName(rawTopic);
          if (!topic) continue;
          if (!state.topicLabels[topic]) state.topicLabels[topic] = rawTopic;
          topicScores[topic] = (topicScores[topic] || 0) + itemScore(item);

          const hour = Number(String(item.published_time || "").slice(0, 2));
          if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
          const minute = Number(String(item.published_time || "").slice(3, 5));
          if (!Number.isInteger(minute) || minute < 0 || minute > 59) continue;
          const minuteOfDay = hour * 60 + minute;

          const uniqueKey = `${dateKey}|${topic}|${item.source}|${item.published_at}|${item.published_time}|${item.name}`;
          if (state.seenItemKeys.has(uniqueKey)) continue;
          state.seenItemKeys.add(uniqueKey);

          if (!state.hourlyTopics[topic]) {
            state.hourlyTopics[topic] = Array.from({ length: 24 }, () => 0);
          }
          state.hourlyTopics[topic][hour] += itemScore(item);
          if (!state.minuteTopics[topic]) {
            state.minuteTopics[topic] = Array.from({ length: 1440 }, () => 0);
          }
          state.minuteTopics[topic][minuteOfDay] += itemScore(item);
        }
      }
      const checkpoint = {
        ts: new Date().toISOString(),
        total: computeTotalScore(topicScores),
        topics: topicScores,
      };

      state.trends = trends;
      state.lastRefreshTs = now;
      state.lastDateKey = dateKey;
      state.lastError = null;
      state.pulse.push(checkpoint);
      if (state.pulse.length > MAX_PULSE_POINTS) {
        state.pulse.shift();
      }
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      state.refreshing = false;
    }
  })();

  try {
    await state.refreshPromise;
  } finally {
    state.refreshPromise = null;
  }
}

function buildPulsePayload() {
  let checkpoints = state.pulse.map((cp) => ({
    ts: cp.ts,
    total: cp.total,
  }));

  if (!state.pulse.length) {
    return {
      checkpoints: [],
      series: [],
      movers: [],
      meta: {
        refresh_ms: REFRESH_MS,
        checkpoints: 0,
      },
    };
  }

  const latestCheckpoint = state.pulse[state.pulse.length - 1];
  const latest = latestCheckpoint?.topics || {};
  const totalsFromCheckpoints = {};
  for (const [name, arr] of Object.entries(state.hourlyTopics || {})) {
    totalsFromCheckpoints[name] = (arr || []).reduce((acc, v) => acc + (Number(v) || 0), 0);
  }

  const sortedTopics = Object.entries(totalsFromCheckpoints)
    .map(([name, total]) => ({
      name,
      total,
    }))
    .filter((x) => !isGenericPulseTopic(state.topicLabels[x.name] || x.name))
    .sort((a, b) => b.total - a.total)
    .map((x) => x.name);

  const picked = [];
  const hasTopic = (pattern) =>
    sortedTopics.find((t) => pattern.test(String(state.topicLabels[t] || t).toLowerCase()));

  const bbbKey = hasTopic(/\bbbb\b|big brother/);
  if (bbbKey) picked.push(bbbKey);

  const sportsKey = hasTopic(/flamengo|palmeiras|corinthians|vasco|santos|gr[eê]mio|internacional|cruzeiro|atl[eé]tico|botafogo|esportes|futebol/);
  if (sportsKey && !picked.includes(sportsKey)) picked.push(sportsKey);

  for (const t of sortedTopics) {
    if (!picked.includes(t)) picked.push(t);
    if (picked.length >= PULSE_TOPICS) break;
  }

  const topicNames = picked.slice(0, PULSE_TOPICS);

  // Série base por hora (00:00 até hora atual), com um ponto extra no minuto atual.
  const currentMinute = currentMinuteOfDaySp();
  const currentHour = Math.floor(currentMinute / 60);
  const currentMinuteInHour = currentMinute % 60;
  const dateKey = state.lastDateKey || todayIso();
  checkpoints = Array.from({ length: currentHour + 1 }, (_, hour) => {
    const hh = String(hour).padStart(2, "0");
    return {
      ts: `${dateKey}T${hh}:00:00-03:00`,
      total: 0,
    };
  });

  const series = topicNames.map((name) => {
    const arr = state.hourlyTopics[name] || Array.from({ length: 24 }, () => 0);
    const points = Array.from({ length: currentHour + 1 }, (_, hour) => {
      const from = Math.max(0, hour - 2);
      const windowValue = arr.slice(from, hour + 1).reduce((acc, v) => acc + (Number(v) || 0), 0);
      return {
        ts: checkpoints[hour].ts,
        value: windowValue,
      };
    });

    if (currentMinuteInHour > 0) {
      const minuteArr = state.minuteTopics[name] || Array.from({ length: 1440 }, () => 0);
      const fromMinute = Math.max(0, currentMinute - 29);
      const minuteWindow = minuteArr
        .slice(fromMinute, currentMinute + 1)
        .reduce((acc, v) => acc + (Number(v) || 0), 0);
      const fallback = points[points.length - 1]?.value || 0;
      points.push({
        ts: `${dateKey}T${String(currentHour).padStart(2, "0")}:${String(currentMinuteInHour).padStart(2, "0")}:00-03:00`,
        value: minuteWindow || fallback,
      });
    }

    return {
      name: state.topicLabels[name] || name,
      key: name,
      points,
    };
  });

  if (currentMinuteInHour > 0) {
    checkpoints.push({
      ts: `${dateKey}T${String(currentHour).padStart(2, "0")}:${String(currentMinuteInHour).padStart(2, "0")}:00-03:00`,
      total: 0,
    });
  }

  checkpoints = checkpoints.map((cp, idx) => ({
    ...cp,
    total: series.reduce((acc, line) => acc + (line.points[idx]?.value || 0), 0),
  }));

  let movers = [];
  movers = topicNames
    .map((name) => {
      const arr = state.hourlyTopics[name] || [];
      const current = Number(arr[currentHour] || 0);
      const prev = Number(currentHour > 0 ? arr[currentHour - 1] || 0 : 0);
      const total = Number(totalsFromCheckpoints[name] || 0);
      return {
        name: state.topicLabels[name] || name,
        delta: current - prev,
        score: total,
      };
    })
    .sort((a, b) => {
      if (b.delta !== a.delta) return b.delta - a.delta;
      return b.score - a.score;
    })
    .slice(0, 8);

  if (!movers.length) {
    movers = topicNames.slice(0, 8).map((name) => {
      const total = Number(totalsFromCheckpoints[name] || 0);
      return { name: state.topicLabels[name] || name, delta: 0, score: total };
    });
  }

  return {
    checkpoints,
    series,
    movers,
    meta: {
      refresh_ms: REFRESH_MS,
      checkpoints: state.pulse.length,
      last_refresh: latestCheckpoint?.ts || null,
      current_hour: currentHour,
    },
  };
}

async function handleTrends(_req, res) {
  try {
    // No primeiro acesso, entrega o dado mais fresco possível.
    await refreshData(true);
    if (!state.trends) {
      throw new Error("Sem dados disponíveis no momento.");
    }
    sendJson(res, 200, state.trends);
  } catch (error) {
    if (state.trends) {
      const fallback = {
        ...state.trends,
        meta: {
          ...(state.trends.meta || {}),
          warning: "Falha no refresh em tempo real; exibindo último snapshot válido.",
        },
      };
      sendJson(res, 200, fallback);
      return;
    }
    sendJson(res, 500, {
      error: "Falha ao buscar trends em fontes abertas.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handlePulse(_req, res) {
  try {
    await refreshData(false);
    sendJson(res, 200, buildPulsePayload());
  } catch (error) {
    sendJson(res, 500, {
      error: "Falha ao montar pulso global.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function serveStatic(res, path) {
  const filePath = join(__dirname, path === "/" ? "index.html" : path.slice(1));
  const ext = extname(filePath);
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };
  const contentType = mimeTypes[ext] || "text/plain; charset=utf-8";

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  if (isAuthEnabled() && !isAuthorized(req)) {
    unauthorized(res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/trends") {
    await handleTrends(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/pulse") {
    await handlePulse(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(res, req.url || "/");
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method Not Allowed");
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
  refreshData(true).catch((error) => {
    console.error("Falha no carregamento inicial:", error);
  });
  setInterval(() => {
    refreshData(true).catch((error) => {
      console.error("Falha no refresh automático:", error);
    });
  }, REFRESH_MS);
});
