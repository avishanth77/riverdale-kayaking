# Riverdale Kayaking - Node.js Web Application & Admin Panel

A full-stack Node.js + Express web application for **Riverdale Kayaking**, featuring the official customer booking website, a dynamic content engine, and an **Admin Panel** to edit photos and manage customer bookings.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Node.js Server
```bash
npm start
```

The application will be live at:
- **Public Customer Website:** [http://localhost:3000](http://localhost:3000)
- **Admin Management Portal:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🔐 Admin Portal Credentials

- **Username:** `admin`
- **Password:** `riverdale123`
*(You can change the admin password at any time inside Admin Settings).*

---

## ✨ Features

### 📋 1. Booking Management ("See the bookings sent")
- **Live Booking Synchronization:** Any booking submitted through the customer booking modal instantly appears in the Admin Panel with a unique reference ID (e.g. `RDK-2026-XXXX`).
- **Interactive Status Tracking:** One-click status updates (`Pending`, `Confirmed`, `Completed`, `Cancelled`).
- **Analytics & Financials:** Real-time KPI cards showing Total Bookings, Pending confirmations, Confirmed trips, and Active Revenue.
- **Search & Filtering:** Real-time search by paddler name, booking reference code, phone number, email, or tour type. Filter by status and sort by tour date or price.
- **Detailed Modal & Staff Notes:** Inspect full booking records and attach internal notes for river guides (e.g., tandem kayak requests, gear preferences).
- **Export to CSV:** One-click download of all booking records for Excel / Google Sheets reporting.

### 📸 2. Photo & Media Manager ("Edit the photos")
- **Visual Section Editors:**
  - **Hero Banner:** Edit the aerial emerald river full-bleed background and subtitle.
  - **About Us Section:** Edit the tall portrait river photo and the wide landscape trail photo.
  - **River Tours Strip:** Edit the dark-teal river background photo.
  - **Why Riverdale Section:** Edit the 50/50 split river photography.
  - **Instagram River Gallery:** View, add, edit, or delete gallery photos with custom captions, locations, likes, and comments.
  - **Highlight Reel Slides:** Change the images and descriptions for the hero video preview modal.
- **Dual Upload Support:**
  - **Upload Files from Computer:** Built-in Multer file uploader saves images to `/uploads/` and links them automatically.
  - **Direct Image URLs:** Paste high-resolution image links from Unsplash, Pexels, or CDNs.
- **Live Synchronization:** Photo edits are immediately loaded on the customer website without requiring a server restart.

### 🛶 3. Kayaking Packages & Pricing Manager ("Change the packages & prices")
- **Full CRUD Support:** Add new river packages, edit existing tour details, or delete packages.
- **Configurable Details:**
  - Package Name & Title
  - Price per person (₹)
  - Tour Duration (e.g. *2.5 Hours, 3 Hours*)
  - Default Launch Time Slot (e.g. *Sunrise 6:00 AM, Morning 9:00 AM, Sunset 4:30 PM*)
  - Highlight Badges (*Early Morning, Best Seller, Group Discount, Exclusive*)
  - Full Experience Description
- **Dynamic Price Synchronization:** Any price update immediately changes the live booking calculator on the website, the navbar dropdown, and server-side booking calculations.

---

## 📁 Project Structure

```
river-dale/
├── server.js              # Express application, auth & RESTful API endpoints
├── package.json           # Node.js dependencies (express, multer, cookie-parser)
├── data/
│   ├── site-content.json  # Editable site photos, captions, and reel slides
│   ├── bookings.json      # Customer bookings database
│   └── admin.json         # Admin user credentials & active sessions
├── uploads/               # Stored uploaded image files
├── public/
│   ├── index.html         # Riverdale Kayaking public customer website
│   └── admin/
│       ├── index.html     # Admin Dashboard (Bookings & Photo Manager)
│       └── login.html     # Admin Login Portal
└── README.md              # Documentation
```
