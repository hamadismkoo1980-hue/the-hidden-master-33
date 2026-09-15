# السيد الخفي 33 — 3D Cloud Edition

نسخة تأسيسية جديدة للمشروع، مصممة لتُطوَّر عبر المتصفح باستخدام GitHub Codespaces وتُنشر كأصول ويب ثابتة.

## التقنية

- Three.js 0.186.0
- WebGPURenderer عند توفر WebGPU مع fallback إلى WebGL 2
- JavaScript Modules
- فصل بيانات المراحل عن محرك اللعبة
- Canvas/WebGL/WebGPU للعرض
- تحميل الأصول لاحقًا عند الحاجة

Three.js 0.186.0 هو الإصدار الحالي المنشور على npm عند إعداد هذا المشروع. WebGPURenderer يدعم WebGPU مع fallback إلى WebGL 2.

## تشغيل سريع

افتح المستودع في GitHub Codespaces ثم استخدم Preview/Live Server أو أي خادم ملفات ثابت.

لا يحتاج المشروع إلى تثبيت Three.js محليًا؛ يتم تحميله عبر CDN.

## النشر

المشروع مناسب لـ GitHub Pages أو Cloudflare Pages. لا ترفع ملفات نماذج أو صوت كبيرة إلى Pages إذا تجاوز الملف الواحد 25 MiB؛ استخدم تخزينًا منفصلًا مثل R2 عند الحاجة.
