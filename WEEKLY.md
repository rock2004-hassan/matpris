# التحديث الأسبوعي – عموم السويد (Hela Sverige)

التطبيق **ليس مربوطًا بمدينة واحدة**. الأسعار عروض **وطنية** من:
- Willys e-handel
- Coop (عروض العضوية الوطنية)
- Lidl reklamblad «i alla butiker»
- ICA (ملف عروض – الموقع يحمي من البوتات)

---

## من يشغّل التحديث؟

| الطريقة | الوصف |
|---------|--------|
| **GitHub Action** | كل **إثنين 05:00 UTC** تلقائيًا + زر يدوي `Run workflow` |
| **محليًا** | `npm run weekly` |

البوت `matpris-bot` يرفع الأسعار إلى المستودع → Vercel يعيد النشر.

---

## الأوامر

```bash
npm run scrape   # سحب من المواقع → CSV + XLSX
npm run update   # استيراد إلى products.json
npm run weekly   # الاثنان معًا
```

الملفات:
```
data/imports/willys/2026-W48.csv
data/imports/willys/2026-W48.xlsx
data/imports/coop/...
data/imports/lidl/...
data/imports/ica/...
```

---

## المتاجر المحمية (ICA / أحيانًا Willys)

1. افتح صفحة العروض في المتصفح
2. انسخ إلى Excel بالأعمدة:
   `Namn | Varumärke/Storlek | Erbjudandepris | Ordinarie pris | Jämförpris`
3. احفظ كـ `data/imports/ica/2026-Wxx.xlsx`
4. `npm run update` أو ارفع إلى GitHub

Lidl: إن كان الـ API بدون منتجات، افتح PDF الوطني من:
`data/imports/lidl/YYYY-Www-flyer.json` → حقل `pdf`

---

## التغطية

**Hela Sverige** – لا اختيار مدينة في التطبيق.
الأسعار المعروضة هي عروض السلاسل على مستوى البلاد.
