# زال / Zaal — Build اول

نسخهٔ Mock، دوزبانه و Mobile-first وب‌سایت و منوی دیجیتال زال.

## مسیرها
- `/fa/` و `/en/`: برند و مراجعه
- `/fa/menu/` و `/en/menu/`: منوی دیجیتال
- `/admin/`: پنل مدیریت Mock

فایل `public/index.html` مستقیم هم اجرا می‌شود و در حالت فایل از Hash route استفاده می‌کند. برای Cloudflare Workers Static Assets، `wrangler.jsonc` آماده است:

```bash
npx wrangler deploy
```

تغییرات پنل در LocalStorage همان مرورگر ذخیره می‌شوند. منو، قیمت‌ها، تصاویر محصول، Price variantها، Taxonomy، آلرژن/Dietary، آدرس، ساعت، تماس، سیاست Reset موجودی، Canonical و QR هنوز آزمایشی یا در انتظار تأییدند. سفارش، پرداخت و Login واقعی خارج از این Build هستند.

پالت رسمی: `#5E716B`، `#FFFFFF`، `#E8E8E8`، `#404040`، `#000000` و `#E35335`.
