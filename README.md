# زال / Zaal — وب‌سایت و منوی دیجیتال D1

این بسته شامل نسخهٔ واقعی منوی زال برای Cloudflare Workers Static Assets و Cloudflare D1 است.

## محتوای نسخه

- ۹ دسته‌بندی و ۵۹ محصول؛ ۵۳ محصول از منوی چاپی و ۶ محصول فقط از ZIP تصاویر
- ۵۰ تصویر WebP بهینه‌شده در `public/assets/products/`
- ۱۲ محصول بدون قیمت با نمایش «قیمت به‌زودی / Price pending»
- ۸ محصول بدون تصویر با Placeholder برند
- Price variantهای اسپرسو، آمریکانو و کورتادو
- شرح، روایت، محتویات، آلرژن و Dietary برای تکمیل بعدی
- Taste/Palate فعلاً بر اساس نام محصول برچسب‌گذاری اولیه شده و باید توسط باریستا بازبینی شود

فهرست بازبینی در `data/menu-import-review.csv` و کاتالوگ مستقل در `data/catalog-real-v1.json` است.

## مسیرها

- `/fa/` و `/en/`: سایت برند
- `/fa/menu/` و `/en/menu/`: منوی عمومی
- `/admin/`: پنل مدیریت
- `/api/catalog`: کاتالوگ عمومی
- `/api/health`: سلامت D1 و revision

## Deploy

- Branch: `main`
- Root: `/`
- Build command: خالی
- Deploy command: `node deploy.mjs`
- Build secret: `ADMIN_PASSWORD`

## وارد کردن منوی واقعی در D1

Deploy کاتالوگ جاری D1 را خودکار overwrite نمی‌کند. پس از Build موفق:

1. `https://zaalcafe.ir/admin/` را باز کنید.
2. دکمهٔ «بارگذاری منوی واقعی» را بزنید.
3. «بارگذاری و ذخیره» را تأیید کنید.
4. revision یک واحد افزایش می‌یابد و نسخهٔ قبلی در `catalog_history` باقی می‌ماند.
5. `/api/health`، `/fa/menu/` و `/en/menu/` را بررسی کنید.

برای این نسخه نیازی به اجرای دوبارهٔ Migration نیست. نام کاربری پیش‌فرض `zaal-admin` است و رمز در Repository ذخیره نمی‌شود. سفارش و پرداخت آنلاین فعال نیست.


## فونت نسخهٔ 1.1

- فونت اصلی فارسی و انگلیسی: Vazirmatn v33.003 Variable
- وزن‌های فعال: 100 تا 900
- فایل به‌صورت WOFF2 و self-hosted در `public/assets/fonts/` قرار دارد.
- فونت با `font-display: swap` و preload بارگذاری می‌شود.
- مجوز رسمی OFL در `licenses/Vazirmatn-OFL.txt` نگهداری می‌شود.
- این به‌روزرسانی تغییری در D1 یا کاتالوگ ایجاد نمی‌کند.
