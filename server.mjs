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
const SECTION_KEYS = [
  "bbb",
  "fofocas",
  "celebridades",
  "esportes",
  "noticias",
  "mundo_fofocas",
  "x_twitter",
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
    name: "O Tempo Esportes",
    url: "https://news.google.com/rss/search?q=site:otempo.com.br+esportes&hl=pt-BR&gl=BR&ceid=BR:pt-419",
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
    name: "X / Twitter BR",
    url: "https://news.google.com/rss/search?q=site:x.com+Brasil+tend%C3%AAncia+OR+trending&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
  {
    name: "X / Twitter BBB",
    url: "https://news.google.com/rss/search?q=site:x.com+BBB&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
  {
    name: "X / Twitter Esportes",
    url: "https://news.google.com/rss/search?q=site:x.com+futebol+OR+esportes+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
  {
    name: "X / Twitter Famosos",
    url: "https://news.google.com/rss/search?q=site:x.com+famosos+OR+celebridades&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
];

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
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

function toIsoDate(value, fallbackIso) {
  if (!value) return fallbackIso;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallbackIso;
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function todayIso() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
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
  return `https://trends.google.com/trends/explore?geo=BR&q=${q}`;
}

function categoryFromText(text, hint) {
  const t = text.toLowerCase();

  if (hint === "x_twitter") return "x_twitter";
  if (hint === "mundo_fofocas") return "mundo_fofocas";

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

  if (hint === "fofocas") return "fofocas";
  if (hint === "celebridades") return "celebridades";
  if (hint === "esportes") return "esportes";

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
      const pubDateRaw =
        extractTag(block, "pubDate") ||
        extractTag(block, "published") ||
        extractTag(block, "updated");
      const publishedAt = toIsoDate(pubDateRaw, today);
      const sourceName = sourceTag || source.name;
      const title = normalizeTitle(rawTitle, sourceName);

      if (!title) return null;

      const allText = `${title} ${description} ${sourceName}`;

      return {
        name: title,
        badge: badgeForItem(idx, publishedAt, today),
        desc: description,
        source: sourceName,
        url: cleanText(link),
        published_at: publishedAt,
        category: categoryFromText(allText, source.hint),
      };
    })
    .filter(Boolean)
    .filter((item) => item.published_at === today);
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

async function buildTrends() {
  const today = todayIso();
  const tasks = SOURCES.map(async (source) => {
    try {
      const xml = await fetchText(source.url);
      const items = parseRssItems(xml, source, today);
      return { source: source.name, ok: true, items, count: items.length };
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

  const seen = new Set();
  const deduped = merged.filter((item) => {
    const key = item.name.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const payload = {
    bbb: [],
    fofocas: [],
    celebridades: [],
    esportes: [],
    noticias: [],
    mundo_fofocas: [],
    x_twitter: [],
  };

  for (const section of SECTION_KEYS) {
    payload[section] = deduped
      .filter((item) => item.category === section)
      .slice(0, 10)
      .map((item) => ({
        name: item.name,
        badge: item.badge,
        desc: item.desc,
        source: item.source,
        published_at: item.published_at,
        url: item.url || buildFallbackUrl(item.name, item.category),
      }));
  }

  payload.meta = {
    updated_at: new Date().toISOString(),
    timezone: "America/Sao_Paulo",
    date: today,
    sources_ok: results.filter((r) => r.ok).length,
    sources_total: results.length,
  };

  return payload;
}

async function handleTrends(_req, res) {
  try {
    const trends = await buildTrends();
    sendJson(res, 200, trends);
  } catch (error) {
    sendJson(res, 500, {
      error: "Falha ao buscar trends em fontes abertas.",
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
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/trends") {
    await handleTrends(req, res);
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
});
