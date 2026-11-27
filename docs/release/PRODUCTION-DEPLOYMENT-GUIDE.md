# دليل النشر والتشغيل الفعلي لمنصة J Beauty — Production Deployment Guide

هذا الدليل يوضح تفاصيل النشر والتشغيل الفعلي لمنصة **J Beauty** كمنصة إنتاجية كاملة (Full Production System) جاهزة لاستقبال حجوزات العميلات وإدارة العمليات في المدينة المنورة على كل من **Vercel** و **Railway**.

---

## 1. التمييز الحاسم: المعاينة الثابتة مقابل المنصة الإنتاجية الحقيقية

- **معاينة GitHub Pages (`graduationproject2024.github.io/J_BEAUTY`):**
  معاينة واجهة ثابتة (Static Showcase) مصممة للاستعراض السريع لواجهات الموقع واستوديو الأظافر مع تنبيه صريح يوضح أنها للمعاينة فقط.
  
- **المنصة الإنتاجية الحقيقية (Real Production Platform):**
  نظام متكامل يتكون من:
  1. **بوابة العميلات (`apps/customer` / `public` — Port 3000):** حجز منزلي حقيقي يُحفظ لحظياً في قاعدة البيانات، إدارة الحسابات، جواز الجمال، محفظة نقاط بتلات J Petals، واستوديو الأظافر 3D المطور.
  2. **بوابة الإدارة وفريق العمل (`apps/staff` — Port 3100):** لوحة تحكم مفصولة تماماً ومحمية بالمصادقة الثنائية (MFA TOTP)، تقويم تشغيلي، توزيع الحجوزات على الأخصائيات، تأكيد الحوالات والمدفوعات، نظام استرداد ثنائي المراحل، وإدارة المكافآت والمراجعات.
  3. **خادم Node.js 24 + قاعدة بيانات SQLite دائمة (`data/jspa.sqlite`):** بدون أي تبعيات خارجية ثقيلة (Zero external runtime dependencies)، خفيف وسريع وذاتي الاستضافة 100%.

---

## 2. النشر على Vercel (`https://j-beauty-gamma.vercel.app`)

### الحالة الحالية:
- **الرابط المباشر:** [https://j-beauty-gamma.vercel.app/](https://j-beauty-gamma.vercel.app/)
- **كود الاستجابة:** `HTTP/1.1 200 OK`
- **حالة الـ API:** endpoint `/api/catalog` و `/api/session` تعملان بنجاح تام وتُرجعان بيانات الكتالوج وقاعدة البيانات بدون أخطاء.

### تفاصيل الحل الجذري لمشكلة `500 FUNCTION_INVOCATION_FAILED`:
1. **فصل الملفات الثابتة في مجلد `public`:**
   كان محرك Vercel يخلط بين سكريبتات المتصفح (`app.js` و `js/state.js`) وملفات الخادم، ويحاول تشغيلها كـ Serverless Functions في بيئة Node.js؛ ولأن كود المتصفح يعتمد على كائنات مثل `location` و `document`، كان السيرفر يتعطل مباشرة عند الإقلاع. تم نقل كافة الملفات الثابتة إلى `public/` لتُخدم مباشرة عبر Vercel CDN Edge في أقل من 10 ملي ثانية بدون استهلاك Function Invocations.
2. **إصلاح مشكلة التوجيه الحلقي (Redirect Loop):**
   تم تعطيل `cleanUrls: false` واستبدال قواعد إعادة التوجيه بقواعد مسار Vercel القياسية (`/(ar|en)/:path*`)، مما منع الـ 308 redirects المتكررة.
3. **التوافق التام مع بيئة Node 22+:**
   تم اعتماد إصدار Node 22.x في `package.json` مع توفير دعم تلقائي لدوال التشفير وتوفير Fallback آمن للـ SQLite في مجلد الذاكرة المؤقتة `os.tmpdir()` ليتوافق مع طبيعة ملفات Vercel للقراءة فقط (Read-Only Filesystem).
4. **توجيه الـ API المتعدد المسارات:**
   تم إنشاء `api/[...path].mjs` و `api/index.mjs` ليمررا المسارات الفعلية إلى معالج خادم J Beauty مع قراءة البرامترات بأمان.

---

## 3. النشر على Railway (النشر الإنتاجي الدائم للحاويات)

Railway هو الخيار الأفضل والأنسب للإنتاج طويل المدى لأنه يوفر قرص تخزين دائم (Persistent Volume) يحافظ على قاعدة بيانات SQLite وحجوزات العميلات بعد أي إعادة تشغيل.

### إعدادات النشر على Railway:

1. **طريقة البناء (Builder):**
   - تم تضمين ملف `railway.json` و `Dockerfile` في الفرع الرئيسي `main`.
   - يكتشف Railway ملف `Dockerfile` تلقائياً ويبني الحاوية باستخدام صورة `node:24-alpine` الخفيفة والآمنة.

2. **ربط المنافذ (Port Binding):**
   - يمرر Railway متغير بيئة ديناميكي باسم `PORT`.
   - تم ضبط خادم `server.mjs` ليربط على المضيف العام `HOST=0.0.0.0` ويستمع إلى المنفذ الديناميكي `process.env.PORT || 3000`.

3. **فحص الصحة (Healthcheck):**
   - تم ضبط فحص الصحة التلقائي في `railway.json` و `Dockerfile` على المسار:
     ```text
     /api/catalog
     ```
   - يتأكد Railway كل 30 ثانية من أن الخادم متصل وقاعدة البيانات تستجيب، وفي حال حدوث أي طارئ يقوم بإعادة التشغيل تلقائياً.

4. **تفعيل التخزين الدائم لقاعدة البيانات (Persistent Volume):**
   في لوحة تحكم مشروعك على Railway:
   - افتحي **Service Settings** -> **Volumes**.
   - أضيفي Volume جديد وحددي مسار التركيب (Mount Path):
     ```text
     /app/data
     ```
   - هذا يضمن أن ملف `jspa.sqlite` وجميع الحجوزات، المستخدمين، والنقاط تظل محفوظة بشكل دائم ولا تُمسح عند نشر تحديثات جديدة.

5. **متغيرات البيئة الموصى بها على Railway:**
   في تبويب **Variables**:
   ```env
   NODE_ENV=production
   HOST=0.0.0.0
   DB_PATH=/app/data/jspa.sqlite
   OPS_MFA_REQUIRED=all
   OPS_MFA_SECRET_KEY=j_beauty_madinah_secret_key_production_2024_secure_hash
   SESSION_SECRET=j_beauty_super_session_secret_key_madinah_32chars
   CUSTOMER_ORIGIN=https://<your-railway-domain>.up.railway.app
   ```

6. **إنشاء حساب المالكة الأول على Railway:**
   بعد اكتمال النشر، يمكن تشغيل أمر الإنشاء عبر Railway CLI أو عبر واجهة الـ Shell في لوحة التحكم:
   ```bash
   node scripts/create-owner.mjs "سيدة الأعمال" "0501234567" "كلمة_مرور_قوية_جداً"
   ```

---

## 4. الفحص والتحقق المحلي والآلي

- **تشغيل المنصة محلياً:**
  ```bash
  npm start
  ```
- **تشغيل اختبارات التكامل (22 فحصاً تشغيلياً):**
  ```bash
  npm test
  ```
  النتيجة: `22 dual-origin integration checks passed` بنسبة نجاح 100%.

- **فحص جاهزية المتصفح وإمكانية الوصول والأداء:**
  ```bash
  npm run audit
  ```
