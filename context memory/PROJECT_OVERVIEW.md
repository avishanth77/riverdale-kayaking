# 🛶 Project Overview: Riverdale Kayaking Kadalundi

## 1. Business Identity & Purpose
**Riverdale Kayaking Kadalundi** is an eco-tourism adventure provider operating in the lush mangrove backwaters and tidal estuary of Kadalundi, Kozhikode, Kerala.

- **Primary Attraction:** Beginner-friendly kayaking through dense mangrove canopies, tidal creeks, and serene river corridors.
- **Location:** Balathiruthi Island, Kadalundi, Kerala 673634.
- **Coordinates:** `11.1306° N, 75.8300° E`
- **Hours:** 6:00 AM to 6:00 PM Daily.
- **Target Audience:** Solo paddlers, families, couples, photographers, bird-watchers, and corporate groups seeking an authentic nature escape.

---

## 2. Technology Stack

- **Runtime & Backend:** Node.js with Express 5 (`5.3.0`)
- **Database Engine:** Hybrid Adapter (`db.js`)
  - **Cloud:** MongoDB Atlas with Mongoose 9 (`9.13.1`)
  - **Local Fallback:** Robust atomic JSON file storage in `/data`
- **Environment Management:** `dotenv` (`18.0.10`)
- **File Uploads:** `multer` (`2.5.0`) with MIME/extension validation and unique hashing
- **Security & Session:** `cookie-parser` (`1.4.7`) + SHA-256 password hashing with salt + bearer tokens
- **Frontend Architecture:** Vanilla HTML5, modern CSS3 (Custom Properties, Flexbox, CSS Grid), accessible semantic markup, vanilla ES6 JavaScript
- **Deployment Platform:** Render.com (Web Service) connected to GitHub (`origin/main`)

---

## 3. Key Offerings & Experiences

1. **Sunrise Mangrove Kayaking:**
   - 6:00 AM – 8:30 AM | Guided early-morning paddling through morning mist and mangrove tunnels.
2. **Kadalundi Mangrove Eco Tour:**
   - 9:00 AM – 11:30 AM | In-depth exploration of flora, fauna, and migratory bird habitats.
3. **Balathiruthi Group Expedition:**
   - Afternoon slots | Designed for teams, friends, and family gatherings with group safety kayaks.
4. **Private Sunset Kayaking:**
   - 4:30 PM – 6:30 PM | Golden hour paddling towards the Kadalundi river mouth.

---

## 4. Brand Design & Aesthetics
- **Color Palette:** Deep teal waters (`#0f4c5c`), organic mangrove greens (`#1b4332`, `#2d6a4f`), warm sunrise gold (`#e36414`, `#fb8b24`), and clean neutrals (`#f8f9fa`, `#1a1a1a`).
- **Dividers:** 3-layer organic curved paper-cutting SVG divider with realistic drop shadow (no harsh zigzags).
- **Typography:** Modern clean sans-serif with readable font scaling and accessible contrast ratios.
