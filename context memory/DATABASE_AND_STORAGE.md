# 🗄️ Database & Storage Architecture

## 1. Overview
Riverdale Kayaking uses a **Zero-Downtime Hybrid Architecture** implemented in [db.js](file:///d:/vibe%20code/river%20dale/db.js). It seamlessly bridges enterprise cloud persistence with reliable local fallback.

- **Primary Engine:** MongoDB Cloud (MongoDB Atlas M0 Free Tier or self-hosted).
- **Fallback Engine:** Atomic JSON file store in `data/`.
- **Auto-Migration:** On the first successful connection to MongoDB, existing JSON records are automatically seeded to MongoDB without data loss.

---

## 2. Data Models & Schemas

### A. Booking Model (`BookingSchema`)
Stores customer reservations and management state.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `refId` | String | Yes | Unique reference number (e.g., `RDK-2026-4892`), indexed. |
| `name` | String | Yes | Customer full name. |
| `contact` | String | Yes | Phone number or email address. |
| `tourId` | String | Yes | Package identifier (`sunrise-paddling`, `guided-tours`, etc.). |
| `tourName` | String | Yes | Human-readable tour title. |
| `date` | String | Yes | Tour date (format: `YYYY-MM-DD`). |
| `slot` | String | Yes | Selected time slot (e.g., `Sunrise 6:00 AM`). |
| `kayakers` | Number | Default: 1 | Number of participants (1 – 50). |
| `unitPrice` | Number | Default: 1200 | Price per kayaker in INR. |
| `totalPrice` | Number | Default: 1200 | Computed total (`unitPrice * kayakers`). |
| `status` | String | Enum | Status: `'Pending'`, `'Confirmed'`, `'Completed'`, `'Cancelled'`. |
| `notes` | String | Optional | Internal admin notes (payment mode, guide assigned, etc.). |
| `createdAt` | Date | Default: Now | ISO timestamp of booking submission. |

### B. Content Model (`ContentSchema`)
Stores dynamic CMS content for the landing page.

| Field | Type | Description |
| :--- | :--- | :--- |
| `key` | String | Unique document key (`site_content`). |
| `data` | Object | Full JSON payload including packages, hero copy, about text, photos, and Instagram feeds. |
| `updatedAt` | Date | Last updated timestamp. |

### C. Admin Model (`AdminSchema`)
Manages authentication and active sessions.

| Field | Type | Description |
| :--- | :--- | :--- |
| `username` | String | Unique username (default: `admin`). |
| `passwordHash` | String | SHA-256 hash of `password + salt`. |
| `salt` | String | Cryptographic salt. |
| `sessions` | Array | List of active `{ token: String, expiresAt: Date }` objects. |

---

## 3. Environment Configuration

To connect MongoDB Cloud, provide `MONGODB_URI` in `.env` (local) or in the Render.com Environment settings:

```bash
# Example URI
MONGODB_URI=mongodb+srv://riverdale_admin:MyStrongPassword123@cluster0.xxxxx.mongodb.net/riverdale?retryWrites=true&w=majority
```

### Fallback Behavior:
If `MONGODB_URI` is omitted or MongoDB is unreachable:
1. `initDB()` catches the connection error gracefully.
2. The server outputs: `🔄 Falling back seamlessly to local JSON database (data/)...`
3. Reads/writes immediately redirect to `data/bookings.json`, `data/site-content.json`, and `data/admin.json`.
4. Zero HTTP 500 crashes occur for clients.
