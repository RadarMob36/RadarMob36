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
  "vem me buscar hebe",
  "beyonce destruidora",
  "tmz",
  "deuxmoi",
  "revistaquem",
];
const SECTION_KEYS = [
  "bbb",
  "fofocas",
  "celebridades",
  "esportes",
  "noticias",
  "mundo_fofocas",
  "x_twitter",
  "tiktok",
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
  {
    name: "X Trend Topics BR",
    url: "https://news.google.com/rss/search?q=twitter+trending+topics+brasil+site:x.com&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "x_twitter",
  },
  {
    name: "TikTok BR Trends",
    url: "https://news.google.com/rss/search?q=site:tiktok.com+trending+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Viral BR",
    url: "https://news.google.com/rss/search?q=tiktok+viral+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Challenge BR",
    url: "https://news.google.com/rss/search?q=tiktok+challenge+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Música BR",
    url: "https://news.google.com/rss/search?q=tiktok+musica+trend+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Influencers BR",
    url: "https://news.google.com/rss/search?q=tiktok+influenciador+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok Hashtags BR",
    url: "https://news.google.com/rss/search?q=tiktok+hashtags+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "tiktok",
  },
  {
    name: "TikTok ForYou BR",
    url: "https://news.google.com/rss/search?q=tiktok+foryou+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
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
    name: "Instagram Gossip do Dia",
    url: "https://news.google.com/rss/search?q=site:instagram.com/gossipdodia&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
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
  {
    name: "Vem Me Buscar Hebe",
    url: "https://news.google.com/rss/search?q=Vem+Me+Buscar+Hebe+famosos&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
  },
  {
    name: "Beyonce Destruidora",
    url: "https://news.google.com/rss/search?q=Beyonce+Destruidora+famosos&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    hint: "fofocas",
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

function derivePulseTopic(item) {
  const name = String(item?.name || "");
  const desc = String(item?.desc || "");
  const text = `${name} ${desc}`.toLowerCase();

  if (/\bbbb\b|big brother|pared[aã]o|anjo|prova do l[ií]der/.test(text))
    return "BBB";

  const hashtag = name.match(/#([A-Za-z0-9_]+)/);
  if (hashtag?.[1]) return `#${hashtag[1].toUpperCase()}`;

  const sports = [
    "flamengo",
    "palmeiras",
    "corinthians",
    "são paulo",
    "santos",
    "vasco",
    "grêmio",
    "internacional",
    "cruzeiro",
    "atlético mineiro",
    "botafogo",
  ];
  for (const team of sports) {
    if (text.includes(team)) return team.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const head = name.split(/[-|:]/)[0].trim();
  const short = head.split(/\s+/).slice(0, 3).join(" ");
  return short || "Assunto";
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
      const publishedAt = pubDate.date;
      const publishedTime = pubDate.time;
      const sourceName = sourceTag || source.name;
      const title = normalizeTitle(rawTitle, sourceName);

      if (!title) return null;

      const allText = `${title} ${description} ${sourceName}`;

      return {
        name: title,
        badge: badgeForItem(idx, publishedAt, today),
        desc: description,
        source: sourceName,
        url: cleanText(newsItemUrl || link),
        published_at: publishedAt,
        published_time: publishedTime,
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

    let badge = "new";
    if (heatScore >= 12) badge = "hot";
    else if (heatScore >= 7) badge = "rising";

    return {
      name: group.name,
      badge,
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
      url:
        !latest?.url || latest.url.includes("/trending/rss")
          ? buildFallbackUrl(group.name, category)
          : latest.url,
    };
  });

  const payload = {
    bbb: [],
    fofocas: [],
    celebridades: [],
    esportes: [],
    noticias: [],
    mundo_fofocas: [],
    x_twitter: [],
    tiktok: [],
  };

  for (const section of SECTION_KEYS) {
    payload[section] = grouped
      .filter((item) => item.category === section)
      .sort((a, b) => {
        if (b.heatScore !== a.heatScore) return b.heatScore - a.heatScore;
        const ta = Date.parse(`${a.published_at}T${a.published_time || "00:00:00"}-03:00`);
        const tb = Date.parse(`${b.published_at}T${b.published_time || "00:00:00"}-03:00`);
        return tb - ta;
      })
      .slice(0, 10)
      .map((item) => ({
        name: item.name,
        badge: item.badge,
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

const state = {
  trends: null,
  pulse: [],
  hourlyTopics: {},
  topicLabels: {},
  seenItemKeys: new Set(),
  lastRefreshTs: 0,
  lastDateKey: null,
  refreshing: false,
  lastError: null,
};

async function refreshData(force = false) {
  const now = Date.now();
  const freshEnough = now - state.lastRefreshTs < REFRESH_MS / 2;
  if (!force && state.trends && freshEnough) return;
  if (state.refreshing) return;

  state.refreshing = true;
  try {
    const trends = await buildTrends();
    const dateKey = trends?.meta?.date || null;
    if (dateKey && state.lastDateKey && state.lastDateKey !== dateKey) {
      // Virou o dia em SP: reinicia o pulso para refletir apenas o dia atual.
      state.pulse = [];
      state.hourlyTopics = {};
      state.topicLabels = {};
      state.seenItemKeys = new Set();
    }

    // Acumula score por hora (00-23) para formar o gráfico diário.
    for (const section of SECTION_KEYS) {
      const items = Array.isArray(trends?.[section]) ? trends[section] : [];
      for (const item of items) {
        const rawTopic = derivePulseTopic(item);
        const topic = normalizeTopicName(rawTopic);
        if (!topic) continue;
        if (!state.topicLabels[topic]) state.topicLabels[topic] = rawTopic;

        const hour = Number(String(item.published_time || "").slice(0, 2));
        if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;

        const uniqueKey = `${dateKey}|${topic}|${item.source}|${item.published_at}|${item.published_time}|${item.name}`;
        if (state.seenItemKeys.has(uniqueKey)) continue;
        state.seenItemKeys.add(uniqueKey);

        if (!state.hourlyTopics[topic]) {
          state.hourlyTopics[topic] = Array.from({ length: 24 }, () => 0);
        }
        state.hourlyTopics[topic][hour] += itemScore(item);
      }
    }

    const scoreMap = buildScoreMap(trends);
    const checkpoint = {
      ts: new Date().toISOString(),
      total: computeTotalScore(scoreMap),
      topics: scoreMap,
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

  const currentHour = currentHourSp();

  const latest = state.pulse[state.pulse.length - 1].topics;
  const topicNames = Object.entries(state.hourlyTopics)
    .map(([name, points]) => ({
      name,
      total: points.reduce((acc, v) => acc + v, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, PULSE_TOPICS)
    .map((x) => x.name);

  let series = topicNames.map((name) => ({
    name: state.topicLabels[name] || name,
    key: name,
    points: Array.from({ length: currentHour + 1 }, (_, hour) => {
      return {
        ts: `${state.lastDateKey || todayIso()}T${String(hour).padStart(2, "0")}:00:00-03:00`,
        value: state.hourlyTopics[name]?.[hour] || 0,
      };
    }),
  }));

  checkpoints = Array.from({ length: currentHour + 1 }, (_, hour) => ({
    ts: `${state.lastDateKey || todayIso()}T${String(hour).padStart(2, "0")}:00:00-03:00`,
    total: series.reduce((acc, line) => acc + (line.points[hour]?.value || 0), 0),
  }));

  let movers = [];
  movers = topicNames
    .map((name) => {
      const arr = state.hourlyTopics[name] || [];
      const current = arr[currentHour] || 0;
      const prev = currentHour > 0 ? arr[currentHour - 1] || 0 : 0;
      const total = arr.slice(0, currentHour + 1).reduce((acc, v) => acc + v, 0);
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
      const total = (state.hourlyTopics[name] || []).reduce((acc, v) => acc + v, 0);
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
      last_refresh: checkpoints.at(-1)?.ts || null,
      current_hour: currentHour,
    },
  };
}

async function handleTrends(_req, res) {
  try {
    await refreshData(false);
    if (!state.trends) {
      throw new Error("Sem dados disponíveis no momento.");
    }
    sendJson(res, 200, state.trends);
  } catch (error) {
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
