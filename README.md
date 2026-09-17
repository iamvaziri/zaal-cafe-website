# زال / Zaal — D1-backed website

وب‌سایت دوزبانه، منوی دیجیتال و پنل مدیریت زال روی Cloudflare Workers Static Assets و Cloudflare D1.

## مسیرها

- `/fa/` و `/en/`: سایت برند
- `/fa/menu/` و `/en/menu/`: منوی عمومی
- `/admin/`: پنل مدیریت محافظت‌شده با HTTP Basic Auth
- `/api/catalog`: API عمومی و فقط‌خواندنی منو
- `/api/health`: سلامت اتصال D1
- `/admin/api/catalog`: API مدیریت محافظت‌شده

## رفتار داده

کاتالوگ در یک رکورد نسخه‌دار D1 ذخیره می‌شود. هر ذخیره از پنل، revision را افزایش می‌دهد و Trigger پایگاه داده نسخهٔ قبلی را در `catalog_history` نگه می‌دارد. به‌روزرسانی هم‌زمان با optimistic concurrency کنترل می‌شود.

## راه‌اندازی Cloudflare

1. در Cloudflare یک D1 database با نام `zaal-cafe-prod` بسازید.
2. UUID پایگاه داده را جای `REPLACE_WITH_D1_DATABASE_ID` در `wrangler.jsonc` قرار دهید.
3. فایل `migrations/0001_catalog.sql` را روی D1 اجرا کنید:

```bash
npx wrangler d1 migrations apply zaal-cafe-prod --remote
```

4. در Worker > Settings > Variables and Secrets یک Secret الزامی بسازید:

```text
ADMIN_PASSWORD=<strong unique password>
```

نام کاربری پیش‌فرض `zaal-admin` است. برای تغییر آن، `ADMIN_USERNAME` را نیز به‌صورت Secret یا variable تعریف کنید.

5. Deploy:

```bash
npx wrangler deploy
```

## امنیت

- رمز در Repository یا `wrangler.jsonc` قرار نمی‌گیرد.
- همهٔ مسیرهای `/admin` و `/admin/*` پیش از Static Assets در Worker احراز هویت می‌شوند.
- API نوشتن فقط same-origin و `application/json` را می‌پذیرد.
- ذخیره با revision انجام می‌شود تا یک نشست، تغییر نشست دیگر را بی‌صدا overwrite نکند.
- Basic Auth فقط روی HTTPS استفاده شود. برای یک CMS بزرگ‌تر یا چندمدیره، بعداً به session-based authentication یا یک IdP ارتقا داده شود.

## وضعیت نسخه

داده‌ها و تصاویر همچنان Mock هستند. سفارش و پرداخت آنلاین در این فاز فعال نیست. عکس واقعی، Price variantها، آلرژن/Dietary، اطلاعات مراجعه، سیاست Reset موجودی، Canonical metadata و QR نهایی هنوز نیازمند داده یا تأیید کسب‌وکارند.
