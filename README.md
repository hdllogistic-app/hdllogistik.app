# HDL LOGISTIK V2

Web Application Operasional Perusahaan Logistik **HDL LOGISTIK V2**.
Sistem ini menggantikan sistem lama berbasis Google Apps Script + Google Sheets.

> [!IMPORTANT]
> **ISOLASI PROJECT**:
> Project ini **SEPENUHNYA TERPISAH** dari NEXTGEN.
> Dilarang membaca, mengubah, mengakses, atau mengambil file/config/database dari project NEXTGEN.
> Dilarang menggunakan Google Sheets atau Google Apps Script sebagai database.

---

## 🏗️ Target Arsitektur

- **Frontend / Fullstack**: Next.js (App Router), TypeScript, Tailwind CSS
- **Database**: PostgreSQL (Railway PostgreSQL)
- **ORM**: Prisma
- **Timezone**: `Asia/Jakarta`
- **Bahasa UI**: Bahasa Indonesia

---

## 📱 3 Main Interfaces (Satu Codebase & Backend)

1. **Admin / Operational Web** (`/`)
   - Optimized for Desktop/PC.
   - Modul: Dashboard, Manifest, Penjadwalan Driver, Delivery Monitoring, Finance, Operasional, Invoice, Absensi, Salary, Cashflow, Master Data, Settings.

2. **Mobile OPS** (`/ops`)
   - PWA / Mobile-first.
   - Fitur: Scan barcode manifest, pilih driver, assign manifest, input resi manual, monitoring TTD & delivery driver.

3. **Mobile Driver** (`/driver`)
   - PWA / Mobile-first.
   - Fitur: Delivery saya, TTD/Proof of Delivery, Foto POD, Absensi radius/lokasi, Kasbon, Salary, Profile.

---

## 📂 Struktur Route & Modul

```text
src/
├── app/
│   ├── (admin)/          # Layout & page Admin Web (Desktop-first)
│   │   ├── page.tsx      # Path: /
│   │   └── layout.tsx
│   ├── (ops)/            # Layout & page Mobile OPS (Mobile-first)
│   │   └── ops/
│   │       ├── page.tsx  # Path: /ops
│   │       └── layout.tsx
│   └── (driver)/         # Layout & page Mobile Driver (Mobile-first)
│       └── driver/
│           ├── page.tsx  # Path: /driver
│           └── layout.tsx
└── modules/              # Shared Backend & Domain Business Logic
    ├── attendance/
    ├── audit/
    ├── authentication/
    ├── cashflow/
    ├── customers/
    ├── delivery/
    ├── employees/
    ├── finance/
    ├── invoice/
    ├── manifest/
    ├── operational/
    ├── salary/
    └── vehicles/
```

---

## 🛠️ Getting Started

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```
4. Run development server:
   ```bash
   npm run dev
   ```
