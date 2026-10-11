const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "same-origin",
  "x-robots-tag": "noindex",
};

// ---- Public pages: per-route SEO head (canonical, hreflang, language, titles) ----
const SITE = "https://zaalcafe.ir";
const PAGE_ROUTES = {
  "/": { lang: "fa", view: "home", canonical: "/" },
  "/fa/": { lang: "fa", view: "home", canonical: "/" },
  "/en/": { lang: "en", view: "home", canonical: "/en/" },
  "/fa/menu/": { lang: "fa", view: "menu", canonical: "/fa/menu/" },
  "/en/menu/": { lang: "en", view: "menu", canonical: "/en/menu/" },
};
const ROUTE_REDIRECTS = {
  "/fa": "/fa/",
  "/en": "/en/",
  "/fa/menu": "/fa/menu/",
  "/en/menu": "/en/menu/",
  "/menu": "/fa/menu/",
  "/menu/": "/fa/menu/",
};
const ALTERNATES = {
  home: { fa: "/", en: "/en/", "x-default": "/" },
  menu: { fa: "/fa/menu/", en: "/en/menu/", "x-default": "/fa/menu/" },
};
const PAGE_META = {
  fa: {
    home: {
      title: "زال کافه | منوی دیجیتال و اطلاعات مراجعه",
      description: "زال کافه در اصفهان؛ منوی دیجیتال دوزبانه، پیشنهاد بر اساس مزه، مسیر مراجعه و داستان زال.",
    },
    menu: {
      title: "منوی زال کافه | نوشیدنی‌ها و قیمت‌ها",
      description: "منوی کامل زال کافه در اصفهان؛ قهوه و اسپرسو، نوشیدنی‌های گرم و سرد، میلک‌شیک، چای و دمنوش، کیک و کوکی با قیمت و جست‌وجو بر اساس مزه.",
    },
    locale: "fa_IR",
    altLocale: "en_US",
  },
  en: {
    home: {
      title: "Zaal Cafe | Menu and visitor information",
      description: "Zaal Cafe in Isfahan: a bilingual digital menu, taste-based picks, directions and the story of Zaal.",
    },
    menu: {
      title: "Zaal Cafe menu | Drinks and prices",
      description: "The full Zaal Cafe menu in Isfahan: espresso and coffee, hot and cold drinks, milkshakes, tea and herbal infusions, cakes and cookies, with prices and taste-based search.",
    },
    locale: "en_US",
    altLocale: "fa_IR",
  },
};
const PUBLIC_HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "public, max-age=0, must-revalidate",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

async function servePublicPage(request, env, url, route) {
  const headers = new Headers(request.headers);
  headers.delete("if-none-match");
  headers.delete("if-modified-since");
  const asset = await env.ASSETS.fetch(new Request(new URL("/", url), { method: "GET", headers }));
  if (!asset.ok) return asset;

  const { lang, view } = route;
  const meta = PAGE_META[lang][view];
  const canonical = SITE + route.canonical;
  const alternates = Object.entries(ALTERNATES[view])
    .map(([hl, href]) => `<link rel="alternate" hreflang="${hl}" href="${SITE}${href}">`)
    .join("\n  ");
  const heroDir = lang === "en" ? "ltr" : "rtl";
  const swapHero = (value) => (value || "").replace(/hero-rtl-/g, `hero-${heroDir}-`);

  let rewriter = new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", lang);
        el.setAttribute("dir", lang === "fa" ? "rtl" : "ltr");
        el.setAttribute("data-view", view);
      },
    })
    .on("title", { element(el) { el.setInnerContent(meta.title); } })
    .on('meta[name="description"]', { element(el) { el.setAttribute("content", meta.description); } })
    .on('meta[property="og:title"]', { element(el) { el.setAttribute("content", meta.title); } })
    .on('meta[property="og:description"]', { element(el) { el.setAttribute("content", meta.description); } })
    .on('meta[property="og:url"]', { element(el) { el.setAttribute("content", canonical); } })
    .on('meta[property="og:locale"]', { element(el) { el.setAttribute("content", PAGE_META[lang].locale); } })
    .on('meta[property="og:locale:alternate"]', { element(el) { el.setAttribute("content", PAGE_META[lang].altLocale); } })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", canonical);
        el.after(`\n  ${alternates}`, { html: true });
      },
    })
    .on('link[rel="alternate"][hreflang]', { element(el) { el.remove(); } })
    .on("#homeView", {
      element(el) {
        const cls = (el.getAttribute("class") || "").split(/\s+/).filter((c) => c && c !== "active");
        if (view === "home") cls.push("active");
        el.setAttribute("class", cls.join(" "));
      },
    })
    .on("#menuView", {
      element(el) {
        const cls = (el.getAttribute("class") || "").split(/\s+/).filter((c) => c && c !== "active");
        if (view === "menu") cls.push("active");
        el.setAttribute("class", cls.join(" "));
      },
    });

  if (view === "home") {
    rewriter = rewriter
      .on("#heroPreload", { element(el) { el.setAttribute("imagesrcset", swapHero(el.getAttribute("imagesrcset"))); } })
      .on(".zc-hero source", { element(el) { el.setAttribute("srcset", swapHero(el.getAttribute("srcset"))); } })
      .on(".zc-hero-img", {
        element(el) {
          el.setAttribute("srcset", swapHero(el.getAttribute("srcset")));
          el.setAttribute("src", swapHero(el.getAttribute("src")));
          el.setAttribute("data-hero", lang);
          if (lang === "en") el.setAttribute("alt", "A cafe setting");
        },
      });
  } else {
    // The hero is hidden on menu pages: do not download it up front.
    rewriter = rewriter
      .on("#heroPreload", { element(el) { el.remove(); } })
      .on(".zc-hero source", { element(el) { el.removeAttribute("srcset"); } })
      .on(".zc-hero-img", {
        element(el) {
          el.removeAttribute("srcset");
          el.removeAttribute("src");
          el.removeAttribute("fetchpriority");
        },
      });
  }

  const out = rewriter.transform(asset);
  const responseHeaders = new Headers(PUBLIC_HTML_HEADERS);
  return new Response(request.method === "HEAD" ? null : out.body, { status: 200, headers: responseHeaders });
}

function assetCacheControl(path) {
  if (path.startsWith("/assets/fonts/")) return "public, max-age=31536000, immutable";
  if (path.startsWith("/assets/tastes/") || path.startsWith("/assets/hero/")) return "public, max-age=2592000, stale-while-revalidate=86400";
  if (path.startsWith("/assets/")) return "public, max-age=86400, stale-while-revalidate=86400";
  return null;
}

async function servePublicAsset(request, env, path) {
  const response = await env.ASSETS.fetch(request);
  const type = response.headers.get("content-type") || "";
  if (type.startsWith("text/html") && response.status === 200) {
    // Unknown address: keep the page usable, but tell search engines it does not exist.
    const headers = new Headers(response.headers);
    headers.set("x-robots-tag", "noindex");
    headers.set("cache-control", "no-store");
    return new Response(response.body, { status: 404, headers });
  }
  const cache = (response.status === 200 || response.status === 304) ? assetCacheControl(path) : null;
  if (!cache) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", cache);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const SESSION_COOKIE = "zaal_admin_session";
const SESSION_MAX_AGE_SHORT = 60 * 60 * 24 * 7;
const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function errorResponse(message, status = 500, code = "INTERNAL_ERROR") {
  return json({ ok: false, error: { code, message } }, status);
}

async function digest(value) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

async function timingSafeEqual(a, b) {
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validString(value, maxLength = 4000) {
  return typeof value === "string" && value.length <= maxLength;
}

function validateTaxonomy(items, label) {
  if (!Array.isArray(items) || items.length > 100) {
    return `${label} must be an array with at most 100 entries.`;
  }
  const ids = new Set();
  for (const item of items) {
    if (
      !Array.isArray(item) ||
      item.length !== 3 ||
      !item.every((value) => validString(value, 120)) ||
      !item[0]
    ) {
      return `${label} contains an invalid entry.`;
    }
    if (ids.has(item[0])) return `${label} contains a duplicate id.`;
    ids.add(item[0]);
  }
  return null;
}

function validateCatalog(catalog) {
  if (!isPlainObject(catalog)) return "Catalog must be an object.";
  if (!Number.isInteger(catalog.version) || catalog.version < 1) {
    return "Catalog version is invalid.";
  }

  const tasteError = validateTaxonomy(catalog.taste, "Taste taxonomy");
  if (tasteError) return tasteError;
  const palateError = validateTaxonomy(catalog.palate, "Palate taxonomy");
  if (palateError) return palateError;

  if (!Array.isArray(catalog.categories) || catalog.categories.length > 100) {
    return "Categories must be an array with at most 100 entries.";
  }
  if (!Array.isArray(catalog.products) || catalog.products.length > 1000) {
    return "Products must be an array with at most 1000 entries.";
  }

  const categoryIds = new Set();
  for (const category of catalog.categories) {
    if (
      !isPlainObject(category) ||
      !validString(category.id, 120) ||
      !category.id ||
      !validString(category.fa, 240) ||
      !validString(category.en, 240) ||
      !validString(category.faDesc || "", 1000) ||
      !validString(category.enDesc || "", 1000) ||
      !Number.isFinite(Number(category.order))
    ) {
      return "A category is invalid.";
    }
    if (categoryIds.has(category.id)) return "Category ids must be unique.";
    categoryIds.add(category.id);
  }

  const productIds = new Set();
  const allowedStatuses = new Set(["available", "sold_out", "hidden"]);
  for (const product of catalog.products) {
    if (!isPlainObject(product)) return "A product is invalid.";
    if (!validString(product.id, 160) || !product.id) {
      return "A product id is invalid.";
    }
    if (productIds.has(product.id)) return "Product ids must be unique.";
    productIds.add(product.id);
    if (!categoryIds.has(product.categoryId)) {
      return `Product ${product.id} references an unknown category.`;
    }
    if (!allowedStatuses.has(product.status)) {
      return `Product ${product.id} has an invalid status.`;
    }
    if (
      !Number.isInteger(product.price) ||
      product.price < 0 ||
      product.price > 1000000000
    ) {
      return `Product ${product.id} has an invalid price.`;
    }
    if (
      !isPlainObject(product.i) ||
      !isPlainObject(product.i.fa) ||
      !isPlainObject(product.i.en)
    ) {
      return `Product ${product.id} is missing bilingual content.`;
    }
    for (const language of ["fa", "en"]) {
      for (const key of ["n", "s", "d", "g"]) {
        if (!validString(product.i[language][key] || "", 5000)) {
          return `Product ${product.id} has invalid ${language}.${key} content.`;
        }
      }
    }
    for (const key of [
      "aliases",
      "tasteTags",
      "palateTags",
      "allergens",
      "dietary",
    ]) {
      if (!Array.isArray(product[key]) || product[key].length > 100) {
        return `Product ${product.id} has an invalid ${key} list.`;
      }
      if (!product[key].every((value) => validString(value, 240))) {
        return `Product ${product.id} has an invalid ${key} value.`;
      }
    }
    if (
      product.image !== null &&
      product.image !== undefined &&
      (!validString(product.image, 500) ||
        !/^\/assets\/products\/[a-z0-9-]+\.webp$/.test(product.image))
    ) {
      return `Product ${product.id} has an invalid image path.`;
    }
    if (!Array.isArray(product.priceVariants) || product.priceVariants.length > 30) {
      return `Product ${product.id} has an invalid priceVariants list.`;
    }
    for (const variant of product.priceVariants) {
      if (
        !isPlainObject(variant) ||
        !validString(variant.fa, 240) ||
        !validString(variant.en, 240) ||
        !Number.isInteger(variant.price) ||
        variant.price < 0 ||
        variant.price > 1000000000
      ) {
        return `Product ${product.id} has an invalid price variant.`;
      }
    }
  }

  const encoded = JSON.stringify(catalog);
  if (new TextEncoder().encode(encoded).byteLength > 900000) {
    return "Catalog is larger than the 900 KB limit.";
  }
  return null;
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeString(value) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecodeToString(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmacSign(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function parseCookies(request) {
  const header = request.headers.get("cookie");
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(/;\s*/)
      .map((part) => {
        const [name, ...value] = part.split("=");
        return [name, value.join("=")];
      })
      .filter(([name]) => Boolean(name)),
  );
}

function getSessionSecret(env) {
  return env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || "";
}

async function createSessionToken(env, remember) {
  const maxAge = remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_SHORT;
  const payload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + maxAge,
  };
  const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
  const signature = await hmacSign(getSessionSecret(env), encodedPayload);
  return { token: `${encodedPayload}.${signature}`, maxAge };
}

async function verifySessionToken(token, env) {
  if (!token || !getSessionSecret(env)) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;
  const expectedSignature = await hmacSign(getSessionSecret(env), encodedPayload);
  if (!(await timingSafeEqual(signature, expectedSignature))) return false;
  let payload;
  try {
    payload = JSON.parse(base64UrlDecodeToString(encodedPayload));
  } catch {
    return false;
  }
  if (!payload || payload.v !== 1 || !Number.isInteger(payload.exp)) return false;
  return payload.exp > Math.floor(Date.now() / 1000);
}

async function isAuthenticated(request, env) {
  const cookies = parseCookies(request);
  return verifySessionToken(cookies[SESSION_COOKIE], env);
}

function sessionCookieHeader(token, maxAge) {
  return `${SESSION_COOKIE}=${token}; Max-Age=${maxAge}; Path=/admin; HttpOnly; Secure; SameSite=Lax`;
}

function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/admin; HttpOnly; Secure; SameSite=Lax`;
}

function normalizeNextPath(value) {
  if (!value || typeof value !== "string") return "/admin/";
  if (!value.startsWith("/admin")) return "/admin/";
  if (value.startsWith("//")) return "/admin/";
  return value;
}

function htmlResponse(markup, status = 200, extraHeaders = {}) {
  return new Response(markup, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
      "x-frame-options": "DENY",
      "x-robots-tag": "noindex, nofollow",
      ...extraHeaders,
    },
  });
}

function redirectResponse(location, extraHeaders = {}) {
  return new Response(null, {
    status: 303,
    headers: {
      location,
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

function renderLoginPage(nextPath, hasError = false) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#5E716B">
  <title>ورود مدیر | زال کافه</title>
  <link rel="preload" href="/assets/fonts/vazirmatn-variable.woff2" as="font" type="font/woff2" crossorigin>
  <style>
    @font-face{font-family:'Vazirmatn';src:url('/assets/fonts/vazirmatn-variable.woff2') format('woff2');font-style:normal;font-weight:100 900;font-display:swap}
    :root{--g:#5E716B;--o:#E35335;--m:#f5f5f2;--line:rgba(0,0,0,.14)}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:linear-gradient(180deg,#f7f7f4,#ece9e1);color:#111;font:15px/1.8 'Vazirmatn','Noto Sans Arabic',Tahoma,Arial,sans-serif;padding:1rem}form{width:min(420px,100%);background:#fff;border:1px solid var(--line);border-radius:28px;padding:1.2rem 1.2rem 1.35rem;box-shadow:0 20px 60px rgba(0,0,0,.08)}h1{margin:.25rem 0 0;font-size:1.9rem;line-height:1.1}p{margin:.45rem 0 0;color:#666}.badge{display:inline-block;padding:.3rem .65rem;border-radius:999px;background:#eef1ef;color:var(--g);font-weight:800;font-size:.82rem}label{display:grid;gap:.35rem;margin-top:1rem;font-weight:800;font-size:.84rem}input{min-height:48px;border:1px solid var(--line);border-radius:14px;padding:.75rem .85rem;background:#fff;font:inherit}button{min-height:48px;border:1px solid var(--o);border-radius:14px;background:var(--o);color:#fff;font:inherit;font-weight:900;cursor:pointer;width:100%;margin-top:1rem}.check{display:flex;align-items:center;gap:.55rem;margin-top:.85rem;font-weight:600}.check input{min-height:auto;width:auto}.error{margin-top:1rem;padding:.7rem .85rem;border-radius:14px;background:#fff3f0;border:1px solid #e1b7ae;color:#b5442e}.hint{font-size:.82rem;color:#777;margin-top:.9rem}
  </style>
</head>
<body>
  <form method="post" action="/admin/login">
    <span class="badge">Zaal Admin</span>
    <h1>ورود مدیر</h1>
    <p>برای ورود به پنل مدیریت منو، رمز عبور را وارد کن.</p>
    ${hasError ? '<div class="error">رمز عبور نادرست است یا نشست معتبر نیست.</div>' : ''}
    <input type="hidden" name="next" value="${escapeHtml(nextPath)}">
    <label>
      <span>رمز عبور</span>
      <input type="password" name="password" autocomplete="current-password" required autofocus>
    </label>
    <label class="check"><input type="checkbox" name="remember" value="1"> مرا برای ۳۰ روز وارد نگه دار</label>
    <button type="submit">ورود</button>
    <div class="hint">اگر این گزینه فعال نباشد، نشست به‌طور پیش‌فرض ۷ روز معتبر می‌ماند.</div>
  </form>
</body>
</html>`;
}

async function readCatalog(env) {
  if (!env.DB) throw new Error("D1 binding DB is missing.");
  const row = await env.DB.prepare(
    "SELECT revision, data, updated_at FROM catalog WHERE id = 1",
  ).first();
  if (!row) throw new Error("Catalog database has not been initialized.");
  return {
    catalog: JSON.parse(row.data),
    revision: Number(row.revision),
    updatedAt: row.updated_at,
  };
}

async function getCatalog(env) {
  try {
    const data = await readCatalog(env);
    return json({ ok: true, ...data });
  } catch (error) {
    console.error("catalog_read_failed", error);
    return errorResponse(
      "Catalog is temporarily unavailable.",
      503,
      "CATALOG_UNAVAILABLE",
    );
  }
}

async function putCatalog(request, env) {
  if (!sameOrigin(request)) {
    return errorResponse(
      "Cross-origin writes are not allowed.",
      403,
      "BAD_ORIGIN",
    );
  }
  if (
    !request.headers.get("content-type")?.toLowerCase().startsWith(
      "application/json",
    )
  ) {
    return errorResponse("Expected application/json.", 415, "BAD_CONTENT_TYPE");
  }

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > 1000000) {
    return errorResponse("Request body is too large.", 413, "BODY_TOO_LARGE");
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return errorResponse("Request body is not valid JSON.", 400, "BAD_JSON");
  }

  const expectedRevision = Number(body.revision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    return errorResponse("Revision is required.", 400, "BAD_REVISION");
  }
  const validationError = validateCatalog(body.catalog);
  if (validationError) {
    return errorResponse(validationError, 400, "INVALID_CATALOG");
  }

  const serialized = JSON.stringify(body.catalog);
  const updatedAt = new Date().toISOString();
  try {
    const result = await env.DB.prepare(
      `UPDATE catalog
       SET data = ?, revision = revision + 1, updated_at = ?
       WHERE id = 1 AND revision = ?`,
    )
      .bind(serialized, updatedAt, expectedRevision)
      .run();

    if (Number(result?.meta?.changes || 0) !== 1) {
      const current = await env.DB.prepare(
        "SELECT revision, updated_at FROM catalog WHERE id = 1",
      ).first();
      return json(
        {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message:
              "The catalog changed in another session. Reload and try again.",
          },
          revision: Number(current?.revision || 0),
          updatedAt: current?.updated_at || null,
        },
        409,
      );
    }

    return json({
      ok: true,
      revision: expectedRevision + 1,
      updatedAt,
    });
  } catch (error) {
    console.error("catalog_write_failed", error);
    return errorResponse(
      "Catalog could not be saved.",
      503,
      "CATALOG_WRITE_FAILED",
    );
  }
}

const HISTORY_LIST_LIMIT = 20;

function parseRevision(value) {
  const number =
    typeof value === "string"
      ? /^[0-9]{1,9}$/.test(value) ? Number(value) : NaN
      : value;
  return Number.isInteger(number) && number >= 1 && number <= 999999999
    ? number
    : null;
}

function revisionConflictResponse(current) {
  return json(
    {
      ok: false,
      error: {
        code: "REVISION_CONFLICT",
        message: "The catalog changed in another session. Reload and try again.",
      },
      revision: Number(current?.revision || 0),
      updatedAt: current?.updated_at || null,
    },
    409,
  );
}

async function getCatalogHistory(env, url) {
  try {
    const requested = url.searchParams.get("revision");
    if (requested !== null) {
      const revision = parseRevision(requested);
      if (revision === null) {
        return errorResponse("Revision is invalid.", 400, "BAD_REVISION");
      }
      let row = await env.DB.prepare(
        "SELECT data, saved_at FROM catalog_history WHERE revision = ?",
      )
        .bind(revision)
        .first();
      if (!row) {
        row = await env.DB.prepare(
          "SELECT data, updated_at AS saved_at FROM catalog WHERE id = 1 AND revision = ?",
        )
          .bind(revision)
          .first();
      }
      if (!row) {
        return errorResponse("This version was not found.", 404, "VERSION_NOT_FOUND");
      }
      return json({
        ok: true,
        revision,
        savedAt: row.saved_at,
        catalog: JSON.parse(row.data),
      });
    }

    const current = await env.DB.prepare(
      `SELECT revision, updated_at,
         CASE WHEN json_valid(data) THEN CASE WHEN json_type(data, '$.products') = 'array' THEN json_array_length(data, '$.products') ELSE 0 END ELSE 0 END AS products
       FROM catalog WHERE id = 1`,
    ).first();
    if (!current) throw new Error("Catalog database has not been initialized.");
    const rows = await env.DB.prepare(
      `SELECT revision, saved_at,
         CASE WHEN json_valid(data) THEN CASE WHEN json_type(data, '$.products') = 'array' THEN json_array_length(data, '$.products') ELSE 0 END ELSE 0 END AS products
       FROM catalog_history ORDER BY revision DESC LIMIT ?`,
    )
      .bind(HISTORY_LIST_LIMIT)
      .all();
    return json({
      ok: true,
      limit: HISTORY_LIST_LIMIT,
      current: {
        revision: Number(current.revision),
        updatedAt: current.updated_at,
        products: Number(current.products || 0),
      },
      items: (rows?.results || []).map((row) => ({
        revision: Number(row.revision),
        savedAt: row.saved_at,
        products: Number(row.products || 0),
      })),
    });
  } catch (error) {
    console.error("catalog_history_failed", error);
    return errorResponse(
      "Catalog history is temporarily unavailable.",
      503,
      "HISTORY_UNAVAILABLE",
    );
  }
}

async function restoreCatalog(request, env) {
  if (!sameOrigin(request)) {
    return errorResponse(
      "Cross-origin writes are not allowed.",
      403,
      "BAD_ORIGIN",
    );
  }
  if (
    !request.headers.get("content-type")?.toLowerCase().startsWith(
      "application/json",
    )
  ) {
    return errorResponse("Expected application/json.", 415, "BAD_CONTENT_TYPE");
  }

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > 4000) {
    return errorResponse("Request body is too large.", 413, "BODY_TOO_LARGE");
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return errorResponse("Request body is not valid JSON.", 400, "BAD_JSON");
  }

  const target = isPlainObject(body) ? parseRevision(body.revision) : null;
  const expectedRevision = isPlainObject(body)
    ? parseRevision(body.expectedRevision)
    : null;
  if (target === null || expectedRevision === null) {
    return errorResponse(
      "Both revision and expectedRevision are required.",
      400,
      "BAD_REVISION",
    );
  }

  try {
    const row = await env.DB.prepare(
      "SELECT data FROM catalog_history WHERE revision = ?",
    )
      .bind(target)
      .first();
    if (!row) {
      return errorResponse("This version was not found.", 404, "VERSION_NOT_FOUND");
    }

    let restored;
    try {
      restored = JSON.parse(row.data);
    } catch {
      restored = null;
    }
    const validationError = validateCatalog(restored);
    if (validationError) {
      return errorResponse(validationError, 400, "INVALID_CATALOG");
    }

    const updatedAt = new Date().toISOString();
    const result = await env.DB.prepare(
      `UPDATE catalog
       SET data = ?, revision = revision + 1, updated_at = ?
       WHERE id = 1 AND revision = ?`,
    )
      .bind(JSON.stringify(restored), updatedAt, expectedRevision)
      .run();

    if (Number(result?.meta?.changes || 0) !== 1) {
      const current = await env.DB.prepare(
        "SELECT revision, updated_at FROM catalog WHERE id = 1",
      ).first();
      return revisionConflictResponse(current);
    }

    return json({
      ok: true,
      revision: expectedRevision + 1,
      updatedAt,
      restoredFrom: target,
    });
  } catch (error) {
    console.error("catalog_restore_failed", error);
    return errorResponse(
      "Catalog could not be restored.",
      503,
      "CATALOG_WRITE_FAILED",
    );
  }
}

async function health(env) {
  try {
    const row = await env.DB.prepare(
      "SELECT revision, updated_at FROM catalog WHERE id = 1",
    ).first();
    return json(
      {
        ok: Boolean(row),
        database: Boolean(row),
        revision: Number(row?.revision || 0),
        updatedAt: row?.updated_at || null,
      },
      row ? 200 : 503,
    );
  } catch (error) {
    console.error("health_check_failed", error);
    return errorResponse("Database unavailable.", 503, "DB_UNAVAILABLE");
  }
}

function withAdminHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "same-origin");
  headers.set("x-frame-options", "DENY");
  const contentType = headers.get("content-type");
  if (contentType && contentType.startsWith("text/html") && !contentType.includes("charset=")) {
    headers.set("content-type", "text/html; charset=utf-8");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleLogin(request, env, url) {
  if (!env.ADMIN_PASSWORD) {
    return htmlResponse("Zaal admin authentication is not configured.", 503);
  }
  if (!sameOrigin(request)) {
    return errorResponse("Cross-origin writes are not allowed.", 403, "BAD_ORIGIN");
  }
  const form = await request.formData();
  const password = String(form.get("password") || "");
  const nextPath = normalizeNextPath(String(form.get("next") || "/admin/"));
  const remember = form.get("remember") === "1";
  if (!(await timingSafeEqual(password, env.ADMIN_PASSWORD))) {
    return htmlResponse(renderLoginPage(nextPath, true), 401);
  }
  const session = await createSessionToken(env, remember);
  return redirectResponse(nextPath, {
    "set-cookie": sessionCookieHeader(session.token, session.maxAge),
  });
}

function handleLogout() {
  return redirectResponse("/admin/login", {
    "set-cookie": clearSessionCookieHeader(),
  });
}

function handleLoginPage(request, url) {
  const nextPath = normalizeNextPath(url.searchParams.get("next") || "/admin/");
  return htmlResponse(renderLoginPage(nextPath, false));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/catalog") {
      if (request.method !== "GET") {
        return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
      }
      return getCatalog(env);
    }

    if (path === "/api/health") {
      if (request.method !== "GET") {
        return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
      }
      return health(env);
    }

    if (path === "/admin/login") {
      if (await isAuthenticated(request, env)) {
        return redirectResponse("/admin/");
      }
      if (request.method === "GET") return handleLoginPage(request, url);
      if (request.method === "POST") return handleLogin(request, env, url);
      return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
    }

    if (path === "/admin/logout") {
      if (request.method === "POST") return handleLogout();
      return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
    }

    const adminPath = path === "/admin" || path.startsWith("/admin/");
    if (adminPath) {
      if (!env.ADMIN_PASSWORD) {
        return htmlResponse("Zaal admin authentication is not configured.", 503);
      }
      const authenticated = await isAuthenticated(request, env);
      if (!authenticated) {
        if (path === "/admin/api/catalog" || path.startsWith("/admin/api/catalog/")) {
          return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
        }
        const nextPath = normalizeNextPath(`${path}${url.search}`);
        return htmlResponse(renderLoginPage(nextPath, false), 401);
      }

      if (path === "/admin/api/catalog") {
        if (request.method === "GET") return getCatalog(env);
        if (request.method === "PUT") return putCatalog(request, env);
        return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
      }

      if (path === "/admin/api/catalog/history") {
        if (request.method === "GET") return getCatalogHistory(env, url);
        return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
      }

      if (path === "/admin/api/catalog/restore") {
        if (request.method === "POST") return restoreCatalog(request, env);
        return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
      }

      return withAdminHeaders(await env.ASSETS.fetch(request));
    }

    if (request.method === "GET" || request.method === "HEAD") {
      if (ROUTE_REDIRECTS[path]) {
        return Response.redirect(`${url.origin}${ROUTE_REDIRECTS[path]}${url.search}`, 301);
      }
      if (PAGE_ROUTES[path]) {
        return servePublicPage(request, env, url, PAGE_ROUTES[path]);
      }
      return servePublicAsset(request, env, path);
    }

    return env.ASSETS.fetch(request);
  },
};