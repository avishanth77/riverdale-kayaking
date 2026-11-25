# 🔒 Admin Panel & Secret Security Controls

## 1. Zero Public Footprint
To prevent unauthorized tampering, spam submissions, or crawler reconnaissance, the **Admin Portal has zero visible links** in the public navigation bar, buttons, or footer.

---

## 2. Secret Access Methods

### A. Desktop Key Combination
- **Shortcut:** `Ctrl + Shift + 9` (Windows/Linux) or `Cmd + Shift + 9` (Mac).
- **Mechanism:** Global `keydown` event listener in `public/js/` opens `/admin` in the current tab.

### B. Secret Mobile Gestures
Because mobile devices lack keyboard shortcuts, three stealth touch gestures are built into the public website:

1. **4-Tap Logo Gesture:**
   - Tap the brand logo in the top navbar **4 times** within 2.5 seconds.
2. **Long-Press Logo Gesture:**
   - Touch and hold the brand logo in the navbar continuously for **2.5 seconds**. A subtle haptic vibration triggers navigation to `/admin`.
3. **3-Tap Footer Copyright:**
   - Tap the copyright text in the footer **3 times** within 2.0 seconds.

---

## 3. Authentication & Session Architecture

- **Configured Credentials:**
  - **Username:** `riverdale`
  - **Password:** Configured via `node scripts/set-admin.js` or the Admin Settings tab
- **Password Storage:** Salted SHA-256 hash (`crypto.createHash('sha256').update(`${password}:${salt}`).digest('hex')`).
- **Session Duration:** 7 days (`7 * 24 * 60 * 60 * 1000 ms`).
- **Token Delivery:** Secure `HttpOnly` cookie named `admin_token`, plus optional HTTP `Authorization: Bearer <token>` support for API clients.
- **Credential Updates:** Admin can change the username and password anytime from the Admin Portal Settings tab or via `node scripts/set-admin.js`; changes sync immediately to MongoDB Cloud and local storage.

---

## 4. Admin Portal Capabilities

1. **Bookings Management:**
   - Real-time search by customer name, phone number, or reference ID (`RDK-...`).
   - Filter by status (`All`, `Pending`, `Confirmed`, `Completed`, `Cancelled`).
   - One-click status badge transitions.
   - Internal note taking (e.g. "Paid 50% advance via UPI", "Requested extra life jacket").
   - Single-click CSV export for offline accounting and WhatsApp communication.
2. **Package & Pricing CRUD:**
   - Live price updating (e.g. ₹1,200 &rarr; ₹1,500).
   - Add new seasonal packages (e.g. "Monsoon Special Kayaking").
   - Delete outdated packages.
3. **Photo & Content CMS:**
   - Drag-and-drop photo upload for hero background, tour cards, and about section.
   - Add, edit, or remove Instagram feed images and captions.
4. **Database Status Monitor:**
   - Header badge indicates whether connected to **MongoDB Cloud Database** or **Local JSON Database**.
