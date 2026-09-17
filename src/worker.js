const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "same-origin",
};

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

function parseBasicAuthorization(value) {
  if (!value || !value.startsWith("Basic ")) return null;
  try {
    const decoded = atob(value.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

async function isAuthorized(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const credentials = parseBasicAuthorization(
    request.headers.get("authorization"),
  );
  if (!credentials) return false;
  const expectedUsername = env.ADMIN_USERNAME || "zaal-admin";
  const [usernameMatches, passwordMatches] = await Promise.all([
    timingSafeEqual(credentials.username, expectedUsername),
    timingSafeEqual(credentials.password, env.ADMIN_PASSWORD),
  ]);
  return usernameMatches && passwordMatches;
}

function unauthorized(missingConfiguration = false) {
  if (missingConfiguration) {
    return new Response(
      "Zaal admin authentication is not configured. Set ADMIN_PASSWORD as a Worker secret.",
      {
        status: 503,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      },
    );
  }

  return new Response("Authentication required / ورود مدیر لازم است", {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="Zaal Admin", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
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
    if (!isPlainObject(product.i) || !isPlainObject(product.i.fa) || !isPlainObject(product.i.en)) {
      return `Product ${product.id} is missing bilingual content.`;
    }
    for (const language of ["fa", "en"]) {
      for (const key of ["n", "s", "d", "g"]) {
        if (!validString(product.i[language][key] || "", 5000)) {
          return `Product ${product.id} has invalid ${language}.${key} content.`;
        }
      }
    }
    for (const key of ["aliases", "tasteTags", "palateTags", "allergens", "dietary"]) {
      if (!Array.isArray(product[key]) || product[key].length > 100) {
        return `Product ${product.id} has an invalid ${key} list.`;
      }
      if (!product[key].every((value) => validString(value, 240))) {
        return `Product ${product.id} has an invalid ${key} value.`;
      }
    }
  }

  const encoded = JSON.stringify(catalog);
  if (new TextEncoder().encode(encoded).byteLength > 900000) {
    return "Catalog is larger than the 900 KB limit.";
  }
  return null;
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

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function putCatalog(request, env) {
  if (!sameOrigin(request)) {
    return errorResponse("Cross-origin writes are not allowed.", 403, "BAD_ORIGIN");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
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
            message: "The catalog changed in another session. Reload and try again.",
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

async function health(env) {
  try {
    const row = await env.DB.prepare(
      "SELECT revision, updated_at FROM catalog WHERE id = 1",
    ).first();
    return json({
      ok: Boolean(row),
      database: Boolean(row),
      revision: Number(row?.revision || 0),
      updatedAt: row?.updated_at || null,
    }, row ? 200 : 503);
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
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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

    const adminPath = path === "/admin" || path.startsWith("/admin/");
    if (adminPath) {
      if (!env.ADMIN_PASSWORD) return unauthorized(true);
      if (!(await isAuthorized(request, env))) return unauthorized(false);

      if (path === "/admin/api/catalog") {
        if (request.method === "GET") return getCatalog(env);
        if (request.method === "PUT") return putCatalog(request, env);
        return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
      }

      return withAdminHeaders(await env.ASSETS.fetch(request));
    }

    return env.ASSETS.fetch(request);
  },
};
