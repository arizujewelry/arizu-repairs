# 🏪 אריזו — מערכת ניהול תיקונים

מערכת ניהול תיקונים מלאה לחנות אריזו תכשיטים.

---

## 🚀 הפעלה מקומית

### דרישות מקדמיות
- [Node.js](https://nodejs.org) גרסה 18 ומעלה
- npm

---

### שלב 1 — שכפול הפרויקט והגדרת `.env`

```bash
# העתק קובץ הסביבה
cp .env.example server/.env
```

ערוך את `server/.env` עם הפרטים שלך:

```env
PORT=3001
JWT_SECRET=הכנס-מחרוזת-סודית-ארוכה
RESEND_API_KEY=re_xxxxxxxxx       # ראה שלב 3
FROM_EMAIL=INFO@ARIZU.CO.IL
FROM_NAME=אריזו תכשיטים
```

---

### שלב 2 — התקנת תלויות

```bash
# שרת
cd server
npm install

# לקוח
cd ../client
npm install
```

---

### שלב 3 — קבלת API Key מ-Resend (שליחת מיילים)

1. היכנס לאתר [resend.com](https://resend.com) וצור חשבון חינמי
2. לחץ על **"API Keys"** בתפריט הצד
3. לחץ **"Create API Key"** ותן לו שם (לדוגמה: "arizu")
4. העתק את המפתח והוסף אותו ל-`.env` כ-`RESEND_API_KEY`

**לשימוש עם דומיין אמיתי (`@arizu.co.il`):**
- לך ל-**Domains** ב-Resend
- הוסף את הדומיין `arizu.co.il` ואמת אותו (הוספת DNS records)
- לאחר אימות — המיילים ייצאו מ-`INFO@ARIZU.CO.IL`

**בשלב הפיתוח** (בלי דומיין מאומת):
- שנה `FROM_EMAIL=onboarding@resend.dev` ב-`.env`
- המיילים יישלחו רק אל כתובת האימייל שהרשמת אליה ב-Resend

---

### שלב 4 — יצירת משתמשים ראשוניים

```bash
cd server
npm run seed
```

**פרטי כניסה:**

| תפקיד | שם משתמש | סיסמה |
|--------|----------|--------|
| עובד   | `employee` | `arizu123` |
| מנהל   | `admin`    | `arizuadmin` |

---

### שלב 5 — הוספת הלוגו

שמור את קובץ הלוגו של אריזו כ:
```
client/public/logo.png
```

---

### שלב 6 — הפעלה

פתח **שני** חלונות טרמינל:

```bash
# טרמינל 1 — שרת
cd server
npm run dev
```

```bash
# טרמינל 2 — לקוח
cd client
npm run dev
```

פתח בדפדפן: **http://localhost:5173**

---

## ☁️ העלאה לענן — Railway (מומלץ)

### למה Railway?
- חינמי לשימוש בסיסי ($5/חודש לשימוש מלא)
- תומך SQLite עם אחסון קבוע (Persistent Volume)
- פריסה אוטומטית מ-GitHub

### שלבים:

1. **צור חשבון** ב-[railway.app](https://railway.app)

2. **דחוף לGitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # צור repo ב-GitHub ודחוף אליו
   ```

3. **צור פרויקט חדש ב-Railway:**
   - לחץ "New Project" → "Deploy from GitHub repo"
   - בחר את ה-repo שלך

4. **הוסף Volume לאחסון הDB:**
   - לך ל-Settings → Volumes
   - הוסף volume עם Mount Path: `/app/data`
   - הוסף volume נוסף עם Mount Path: `/app/uploads`

5. **הגדר משתני סביבה:**
   - לך ל-Variables והוסף:
     ```
     JWT_SECRET=המחרוזת-הסודית-שלך
     RESEND_API_KEY=re_xxxxxxxxx
     FROM_EMAIL=INFO@ARIZU.CO.IL
     FROM_NAME=אריזו תכשיטים
     NODE_ENV=production
     ```

6. **הרץ seed לאחר הפריסה הראשונה:**
   - לך ל-Railway CLI או ב-Deploy → Shell:
   ```bash
   node seed.js
   ```

7. **קבל URL** — Railway יתן לך URL כמו `https://arizu-xxx.railway.app`

---

## 📱 שימוש בנייד

האפליקציה מותאמת במלואה לשימוש בנייד.
כניסה מהדפדפן בטלפון — אין צורך להתקין שום דבר.

---

## 🔧 תכונות המערכת

- **תיקון חדש** — רישום מהיר עם כל הפרטים + תמונה
- **רשימת תיקונים** — חיפוש, סינון, עריכה, מחיקה, שינוי סטטוס
- **שליחת מייל** — כפתור לשליחת עדכון מייל ללקוח בכל עת
- **היסטוריית שינויים** — מי שינה מה ומתי
- **יצוא לאקסל** — ייצוא הרשימה לקובץ xlsx
- **ניהול סטטוסים** — הוסף ספקים וסטטוסים מותאמים
- **דשבורד** — סטטיסטיקות ותיקונים אחרונים

---

## 🏗️ מבנה הפרויקט

```
/
├── client/              # React + Vite frontend
│   ├── public/          # ← שמור כאן את logo.png
│   └── src/
│       ├── pages/       # דפים: Login, NewRepair, RepairsList, Dashboard, StatusManager
│       ├── components/  # Navbar, Toast, StatusBadge, RepairModal, EditRepairModal
│       └── context/     # AuthContext
│
├── server/              # Express backend
│   ├── routes/          # auth.js, repairs.js, statuses.js
│   ├── middleware/      # auth.js (JWT)
│   ├── data/            # repairs.db (SQLite)
│   ├── uploads/         # תמונות שהועלו
│   ├── index.js         # נקודת כניסה
│   └── seed.js          # יצירת משתמשים ראשוניים
│
├── Dockerfile           # לפריסה בענן
├── railway.json         # הגדרות Railway
└── .env.example         # דוגמה לקובץ סביבה
```
