# دليل النشر والتشغيل الفعلي لمنصة J Beauty — Production Deployment Guide

هذا الدليل يوضح كيفية تشغيل ونشر منصة **J Beauty** كمنصة حقيقية كاملة للإنتاج الفعلي (Full Production System) جاهزة لاستقبال حجوزات العميلات وإدارة العمليات في المدينة المنورة.

---

## 1. التمييز الحاسم: المعاينة الثابتة مقابل المنصة الإنتاجية الحقيقية

- **معاينة GitHub Pages (`graduationproject2024.github.io/J_BEAUTY`):**
  هذه مجرد معاينة واجهة ثابتة (Static Client-Side Showcase) مصممة للاستعراض السريع لواجهات الموقع واستوديو الأظافر دون الحاجة لخادم، وتتضمن تنبيهاً صريحاً يوضح أنها للمعاينة فقط.
  
- **المنصة الإنتاجية الحقيقية (Real Production Platform):**
  نظام متكامل يتكون من:
  1. **بوابة العميلات (`apps/customer` — Port 3000):** حجز مواعيد منزلي حقيقي يُحفظ لحظياً في قاعدة البيانات، إدارة حسابات العميلات وسجل الزيارات، جواز الجمال، محفظة نقاط بتلات J Petals، واستوديو الأظافر 3D.
  2. **بوابة الإدارة وفريق العمل (`apps/staff` — Port 3100):** لوحة تحكم مفصولة تماماً ومحمية بالمصادقة الثنائية (MFA TOTP)، تقويم تشغيلي، توزيع الحجوزات على الأخصائيات، تأكيد الحوالات والمدفوعات، نظام استرداد ثنائي المراحل، إدارة المكافآت والمراجعات.
  3. **خادم Node.js 24 + قاعدة بيانات SQLite دائمة (`data/jspa.sqlite`):** بدون أي تبعيات خارجية ثقيلة (Zero external runtime dependencies)، خفيف وسريع وذاتي الاستضافة 100%.

---

## 2. التشغيل والبدء السريع على جهازك أو خادم محلي

### الخطوة 1: تشغيل المنصة
```bash
npm start
```
سيظهر في الطرفية:
```text
J Beauty Customer Portal running at http://127.0.0.1:3000
J Beauty Operations Portal running at http://127.0.0.1:3100
```
- افتحي بوابة العميلات: `http://localhost:3000/ar/`
- افتحي بوابة العمليات والإدارة: `http://localhost:3100/ar/`

### الخطوة 2: إنشاء حساب المالكة الأول (Owner Bootstrap)
لإنشاء حساب الإدارة الأول للتحكم في المنصة:
```bash
npm run create-owner -- "اسم المالكة" "0501234567" "كلمة_المرور_القوية"
```
بعدها يمكنكِ تسجيل الدخول مباشرة في بوابة العمليات على `http://localhost:3100/ar/login` وتفعيل المصادقة الثنائية (Google Authenticator أو 1Password).

---

## 3. خيارات النشر السحابي المباشر (Live Cloud Deployment)

### الخيار الأول: النشر عبر Docker و Docker Compose (موصى به)
الملفات `Dockerfile` و `docker-compose.yml` جاهزة ومدمجة في المشروع:
```bash
# 1. نسخ ملف الإعدادات
cp .env.example .env

# 2. تعديل المتغيرات الأساسية (الدومين، الهاتف، المفاتيح) في ملف .env
nano .env

# 3. تشغيل الحاوية في الخلفية مع حفظ البيانات الدائمة
docker compose up -d --build
```
قاعدة البيانات ستُحفظ في المجلد المحلي `./data` ولن تُفقد عند إعادة التشغيل أو التحديث.

---

### الخيار الثاني: النشر على خادم خاص VPS (Ubuntu / Debian) مع دومين و SSL
1. **تثبيت Node.js 24 LTS:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
   ```
2. **سحب المشروع وتجهيز المجلد:**
   ```bash
   git clone https://github.com/graduationproject2024/J_BEAUTY.git /var/www/j-beauty
   cd /var/www/j-beauty
   git checkout feat/j-beauty-atelier-v2-quality-recovery
   mkdir -p /var/www/j-beauty/data
   ```
3. **إنشاء خدمة Systemd لتشغيل الخادم تلقائياً:**
   أنشئي ملف `/etc/systemd/system/jbeauty.service`:
   ```ini
   [Unit]
   Description=J Beauty Production Platform
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/j-beauty
   ExecStart=/usr/bin/node server.mjs
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production
   Environment=PORT=3000
   Environment=OPS_PORT=3100
   Environment=HOST=127.0.0.1
   Environment=DB_PATH=/var/www/j-beauty/data/jspa.sqlite
   Environment=OPS_MFA_REQUIRED=all
   Environment=CUSTOMER_ORIGIN=https://jbeauty.sa
   Environment=OPS_ORIGIN=https://ops.jbeauty.sa

   [Install]
   WantedBy=multi-user.target
   ```
   ثم تفعيل الخدمة:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now jbeauty
   ```
4. **ضبط Nginx وشهادة SSL مجانية:**
   استخدمي الملف الجاهز في المشروع:
   ```bash
   sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/jbeauty
   # عدّلي اسم الدومين في الملف، ثم فعّليه:
   sudo ln -s /etc/nginx/sites-available/jbeauty /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d jbeauty.sa -d ops.jbeauty.sa
   ```

---

### الخيار الثالث: النشر عبر المنصات السحابية الجاهزة (Railway / Render)
1. قومي بربط مستودع GitHub `graduationproject2024/J_BEAUTY` بالمنصة (مثل Railway.app أو Render.com).
2. اختاري النشر عبر `Dockerfile`.
3. أضيفي **Persistent Volume Disk** على المسار `/app/data` لضمان دوام ملف قاعدة البيانات SQLite.
4. أضيفي المتغيرات البيئية من ملف `.env.example`.
5. سيتم بناء ونشر الموقع تلقائياً مع رابط HTTPS مباشر ومستقر.

---

## 4. التحقق والنسخ الاحتياطي (Backups & Maintenance)

- **أخذ نسخة احتياطية فورية من قاعدة البيانات:**
  ```bash
  node backup.mjs data/jspa.sqlite backups/jbeauty_backup_$(date +%Y%m%d).sqlite
  ```
- **تشغيل الفحص الأمني وفحص سلامة السجلات:**
  ```bash
  npm test
  ```
- **فحص إمكانية الوصول والأداء:**
  ```bash
  npm run audit
  ```
