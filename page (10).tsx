"use client";

import { useState } from "react";
import Link from "next/link";
import { type Lang } from "@/lib/i18n";

const content = {
  ar: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: نوفمبر 2026",
    sections: [
      {
        h: "1. من نحن",
        p: "مات بريس (MatPris) تطبيق لمقارنة أسعار وعروض المواد الغذائية في السويد بين متاجر مثل ICA وWillys وLidl وMatvärlden. التطبيق لا يبيع منتجات ولا يعالج مدفوعات.",
      },
      {
        h: "2. البيانات التي نجمعها",
        p: "السلة وتفضيلات اللغة تُحفظ محليًا على جهازك (localStorage). عند استخدام صفحة الإدارة، تُحفظ جلسة المشرف محليًا. لا نجمع بيانات شخصية حساسة دون موافقتك. رسائل التواصل عبر نموذج الاتصال تُرسل إلى بريد المشرف أو تُحفظ محليًا للعرض.",
      },
      {
        h: "3. ملفات تعريف الارتباط",
        p: "قد تستخدم بيئة الاستضافة (مثل Vercel) ملفات تقنية ضرورية للتشغيل والأمان. لا نستخدم إعلانات تتبع من طرف ثالث في النسخة الأساسية.",
      },
      {
        h: "4. مصادر الأسعار",
        p: "الأسعار والعروض تُستورد من صفحات عروض عامة للمتاجر أو من ملفات يرفعها المشرف. قد تختلف الأسعار في المتجر الفعلي. التطبيق للمرجعية فقط.",
      },
      {
        h: "5. حقوقك",
        p: "يمكنك مسح بيانات المتصفح (localStorage) في أي وقت لحذف السلة والجلسات والسجلات المحلية. للاستفسارات: استخدم صفحة «تواصل معنا».",
      },
      {
        h: "6. الأمان",
        p: "نطبّق رؤوس أمان (HTTPS، X-Frame-Options، وغيرها) وحدودًا لمعدل الطلبات على المسارات الحساسة. كلمات مرور الإدارة تُضبط عبر متغيرات البيئة ولا تُخزَّن في الكود العام.",
      },
      {
        h: "7. التغييرات",
        p: "قد نحدّث هذه السياسة عند إضافة ميزات جديدة. تاريخ آخر تحديث يظهر أعلى الصفحة.",
      },
    ],
    home: "الرئيسية",
    contact: "تواصل معنا",
  },
  sv: {
    title: "Integritetspolicy",
    updated: "Senast uppdaterad: november 2026",
    sections: [
      {
        h: "1. Om oss",
        p: "MatPris är en app för att jämföra matpriser och erbjudanden i Sverige (ICA, Willys, Lidl, Matvärlden). Appen säljer inga varor och hanterar inga betalningar.",
      },
      {
        h: "2. Vilka uppgifter vi samlar",
        p: "Kundvagn och språkpreferens sparas lokalt i din webbläsare (localStorage). Adminsession sparas lokalt. Vi samlar inte in känsliga personuppgifter utan ditt samtycke. Kontaktmeddelanden skickas till admin eller sparas lokalt.",
      },
      {
        h: "3. Cookies",
        p: "Hosting (t.ex. Vercel) kan använda nödvändiga tekniska cookies. Vi använder inte tredjepartsannonsering i basversionen.",
      },
      {
        h: "4. Priskällor",
        p: "Priser importeras från publika erbjudandesidor eller filer som admin laddar upp. Priser i butik kan skilja sig. Appen är endast vägledande.",
      },
      {
        h: "5. Dina rättigheter",
        p: "Du kan rensa webbläsardata (localStorage) när som helst. Kontakta oss via kontaktssidan vid frågor.",
      },
      {
        h: "6. Säkerhet",
        p: "Vi använder säkerhetsheaders (HTTPS m.m.) och begränar antal anrop till känsliga sidor. Adminlösenord sätts via miljövariabler.",
      },
      {
        h: "7. Ändringar",
        p: "Policyn kan uppdateras när nya funktioner läggs till.",
      },
    ],
    home: "Hem",
    contact: "Kontakta oss",
  },
};

export default function PrivacyPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const c = content[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">{c.title}</h1>
          <div className="flex gap-2 items-center text-sm">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="border rounded-lg px-2 py-1"
            >
              <option value="ar">العربية</option>
              <option value="sv">Svenska</option>
            </select>
            <Link href="/" className="text-blue-600 hover:underline">
              {c.home}
            </Link>
            <Link href="/contact" className="text-blue-600 hover:underline">
              {c.contact}
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <p className="text-sm text-slate-500">{c.updated}</p>
        {c.sections.map((s) => (
          <section key={s.h} className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-slate-900 mb-2">{s.h}</h2>
            <p className="text-slate-700 text-sm leading-relaxed">{s.p}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
