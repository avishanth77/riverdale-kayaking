require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded images statically
app.use('/uploads', express.static(UPLOADS_DIR));

// -------------------------------------------------------------
// Helper: Password Hashing & Auth
// -------------------------------------------------------------
const DEFAULT_SALT = 'riverdale_salt_2026';

function hashPassword(password, salt = DEFAULT_SALT) {
  return crypto.createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

// Auth Middleware
async function requireAuth(req, res, next) {
  const token = req.cookies.admin_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const isValid = await db.validateAdminSession(token);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Session expired or invalid' });
    }
    const adminData = await db.getAdminData();
    req.admin = { username: adminData.username || 'admin' };
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ success: false, message: 'Server auth error' });
  }
}

// -------------------------------------------------------------
// Multer Configuration for Image Uploads
// -------------------------------------------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: function (req, file, cb) {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (allowed.test(ext) || allowed.test(mime)) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF, SVG) are allowed!'));
  }
});

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  try {
    const adminData = await db.getAdminData();
    const salt = adminData.salt || DEFAULT_SALT;
    const computedHash = hashPassword(password, salt);

    if (username !== (adminData.username || 'admin') || computedHash !== adminData.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await db.addAdminSession(token, expiresAt);

    // Set cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: false, // Set to true on HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/'
    });

    res.json({ success: true, message: 'Login successful', username: adminData.username || 'admin' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login error' });
  }
});

app.post('/api/admin/logout', async (req, res) => {
  const token = req.cookies.admin_token;
  if (token) {
    try {
      await db.removeAdminSession(token);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }
  res.clearCookie('admin_token', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/admin/me', async (req, res) => {
  const token = req.cookies.admin_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.json({ authenticated: false });
  }
  try {
    const isValid = await db.validateAdminSession(token);
    if (!isValid) {
      return res.json({ authenticated: false });
    }
    const adminData = await db.getAdminData();
    res.json({
      authenticated: true,
      username: adminData.username || 'admin',
      database: db.isMongoConnected() ? 'MongoDB Cloud Database' : 'Local JSON Database'
    });
  } catch (err) {
    res.json({ authenticated: false });
  }
});

app.post('/api/admin/change-credentials', requireAuth, async (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  if (!currentPassword) {
    return res.status(400).json({ success: false, message: 'Current password is required to verify identity' });
  }

  try {
    const adminData = await db.getAdminData();
    const salt = adminData.salt || DEFAULT_SALT;
    if (hashPassword(currentPassword, salt) !== adminData.passwordHash) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    let finalUsername = adminData.username || 'admin';
    if (newUsername && newUsername.trim()) {
      finalUsername = newUsername.trim();
    }

    let newHash = adminData.passwordHash;
    let newSalt = salt;
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      }
      newSalt = crypto.randomBytes(16).toString('hex');
      newHash = hashPassword(newPassword.trim(), newSalt);
    }

    await db.saveAdminCredentials(finalUsername, newHash, newSalt);
    res.json({
      success: true,
      message: 'Admin credentials updated successfully in MongoDB and local storage!',
      username: finalUsername
    });
  } catch (err) {
    console.error('Update credentials error:', err);
    res.status(500).json({ success: false, message: 'Failed to update credentials' });
  }
});

app.post('/api/admin/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  try {
    const adminData = await db.getAdminData();
    const salt = adminData.salt || DEFAULT_SALT;
    if (hashPassword(currentPassword, salt) !== adminData.passwordHash) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashPassword(newPassword, newSalt);
    await db.saveAdminCredentials(null, newHash, newSalt);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

// -------------------------------------------------------------
// Image Upload Endpoint (Protected)
// -------------------------------------------------------------
app.post('/api/upload', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size
  });
});

// -------------------------------------------------------------
// Site Content & Photos API
// -------------------------------------------------------------
app.get('/api/content', async (req, res) => {
  try {
    const content = await db.getContent();
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to read content' });
  }
});

app.put('/api/content', requireAuth, async (req, res) => {
  try {
    const current = await db.getContent();
    const updated = {
      ...current,
      ...req.body
    };
    await db.saveContent(updated);
    res.json({ success: true, message: 'Content updated successfully', content: updated });
  } catch (err) {
    console.error('Update content error:', err);
    res.status(500).json({ success: false, message: 'Failed to update content' });
  }
});

app.put('/api/content/photos', requireAuth, async (req, res) => {
  try {
    const { hero, about, tours, why } = req.body;
    const current = await db.getContent();

    if (hero) current.hero = { ...(current.hero || {}), ...hero };
    if (about) current.about = { ...(current.about || {}), ...about };
    if (tours) current.tours = { ...(current.tours || {}), ...tours };
    if (why) current.why = { ...(current.why || {}), ...why };

    await db.saveContent(current);
    res.json({ success: true, message: 'Photos updated successfully', content: current });
  } catch (err) {
    console.error('Update photos error:', err);
    res.status(500).json({ success: false, message: 'Failed to update photos' });
  }
});

// Instagram photos management
app.post('/api/content/instagram', requireAuth, async (req, res) => {
  try {
    const current = await db.getContent();
    if (!Array.isArray(current.instagram)) current.instagram = [];

    const newPost = {
      id: 'insta-' + Date.now(),
      src: req.body.src || 'https://images.pexels.com/photos/1927054/pexels-photo-1927054.jpeg?auto=compress&cs=tinysrgb&w=900&fm=webp',
      alt: req.body.alt || 'Riverdale Kayaking Kadalundi photo',
      likes: String(req.body.likes || Math.floor(300 + Math.random() * 400)),
      comments: String(req.body.comments || Math.floor(15 + Math.random() * 30)),
      location: req.body.location || 'Balathiruthi, Kadalundi',
      caption: req.body.caption || 'Another peaceful day gliding on Kadalundi mangrove waters! 🛶🌿',
      tags: req.body.tags || '#RiverdaleKayaking #Kadalundi #MangrovePaddle'
    };

    current.instagram.unshift(newPost);
    await db.saveContent(current);
    res.json({ success: true, message: 'Instagram photo added', post: newPost, instagram: current.instagram });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add Instagram photo' });
  }
});

app.put('/api/content/instagram/:id', requireAuth, async (req, res) => {
  try {
    const current = await db.getContent();
    const id = req.params.id;
    const index = (current.instagram || []).findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Instagram photo not found' });
    }

    current.instagram[index] = {
      ...current.instagram[index],
      ...req.body,
      id: id // preserve ID
    };

    await db.saveContent(current);
    res.json({ success: true, message: 'Instagram photo updated', post: current.instagram[index] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update Instagram photo' });
  }
});

app.delete('/api/content/instagram/:id', requireAuth, async (req, res) => {
  try {
    const current = await db.getContent();
    const id = req.params.id;
    const initialLen = (current.instagram || []).length;
    current.instagram = (current.instagram || []).filter(p => p.id !== id);

    if (current.instagram.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Instagram photo not found' });
    }

    await db.saveContent(current);
    res.json({ success: true, message: 'Instagram photo deleted', instagram: current.instagram });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete Instagram photo' });
  }
});

// Reel Slides Management
app.put('/api/content/reel-slides', requireAuth, async (req, res) => {
  try {
    const { slides } = req.body;
    if (!Array.isArray(slides)) {
      return res.status(400).json({ success: false, message: 'Slides must be an array' });
    }
    const current = await db.getContent();
    current.reelSlides = slides;
    await db.saveContent(current);
    res.json({ success: true, message: 'Reel slides updated', reelSlides: current.reelSlides });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update reel slides' });
  }
});

// -------------------------------------------------------------
// Packages & Pricing CRUD API
// -------------------------------------------------------------
app.get('/api/packages', async (req, res) => {
  try {
    const content = await db.getContent();
    res.json({ success: true, packages: content.packages || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch packages' });
  }
});

app.post('/api/packages', requireAuth, async (req, res) => {
  try {
    const { name, price, description, slot, duration, badge } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Package name and price are required' });
    }

    const content = await db.getContent();
    if (!Array.isArray(content.packages)) content.packages = [];

    const id = 'pkg-' + Date.now();
    const newPkg = {
      id,
      name: String(name).trim(),
      price: Number(price) || 0,
      description: String(description || '').trim(),
      slot: String(slot || 'Morning 9:00 AM').trim(),
      duration: String(duration || '2.5 Hours').trim(),
      badge: String(badge || '').trim()
    };

    content.packages.push(newPkg);
    await db.saveContent(content);

    res.status(201).json({ success: true, message: 'Package added successfully', package: newPkg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add package' });
  }
});

app.put('/api/packages/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, price, description, slot, duration, badge } = req.body;

    const content = await db.getContent();
    if (!Array.isArray(content.packages)) content.packages = [];

    const index = content.packages.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    content.packages[index] = {
      ...content.packages[index],
      ...(name !== undefined && { name: String(name).trim() }),
      ...(price !== undefined && { price: Number(price) }),
      ...(description !== undefined && { description: String(description).trim() }),
      ...(slot !== undefined && { slot: String(slot).trim() }),
      ...(duration !== undefined && { duration: String(duration).trim() }),
      ...(badge !== undefined && { badge: String(badge).trim() })
    };

    await db.saveContent(content);
    res.json({ success: true, message: 'Package updated successfully', package: content.packages[index] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update package' });
  }
});

app.delete('/api/packages/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const content = await db.getContent();
    if (!Array.isArray(content.packages)) content.packages = [];

    const initialLen = content.packages.length;
    content.packages = content.packages.filter(p => p.id !== id);

    if (content.packages.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    await db.saveContent(content);
    res.json({ success: true, message: 'Package deleted successfully', packages: content.packages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete package' });
  }
});

// -------------------------------------------------------------
// Bookings API (Public Submission & Admin Management)
// -------------------------------------------------------------
const TOUR_PRICE_MAP = {
  'sunrise-paddling': { name: 'Sunrise Mangrove Kayaking', price: 1200 },
  'guided-tours': { name: 'Kadalundi Mangrove Eco Tour', price: 1500 },
  'group-events': { name: 'Balathiruthi Group Expedition', price: 1350 },
  'private-expeditions': { name: 'Private Sunset Kayaking', price: 1800 }
};

// Public Booking Submission (From Customer Website)
app.post('/api/bookings', async (req, res) => {
  try {
    const { name, contact, tourId, date, slot, kayakers, notes } = req.body;

    if (!name || !contact || !date) {
      return res.status(400).json({ success: false, message: 'Please provide name, contact, and date' });
    }

    const count = parseInt(kayakers || '2', 10);
    if (isNaN(count) || count < 1 || count > 50) {
      return res.status(400).json({ success: false, message: 'Invalid number of kayakers' });
    }

    const tourKey = tourId || 'sunrise-paddling';

    // Fetch dynamic package price from database
    const content = await db.getContent();
    const dynamicPkg = (content.packages || []).find(p => p.id === tourKey);

    let tourName = 'Kadalundi Mangrove Tour';
    let unitPrice = 1200;

    if (dynamicPkg) {
      tourName = dynamicPkg.name;
      unitPrice = dynamicPkg.price;
    } else if (TOUR_PRICE_MAP[tourKey]) {
      tourName = TOUR_PRICE_MAP[tourKey].name;
      unitPrice = TOUR_PRICE_MAP[tourKey].price;
    }

    const totalPrice = unitPrice * count;

    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const refId = `RDK-${currentYear}-${randomSuffix}`;
    const bookingId = `bk-${Date.now()}`;

    const newBooking = {
      id: bookingId,
      refId: refId,
      name: name.trim(),
      contact: contact.trim(),
      tourId: tourKey,
      tourName: tourName,
      date: date,
      slot: slot || 'Sunrise 6:00 AM',
      kayakers: count,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      status: 'Pending',
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    const savedBooking = await db.createBooking(newBooking);

    res.status(201).json({
      success: true,
      message: 'Booking submitted successfully',
      booking: savedBooking
    });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

// Admin: Get all bookings with filtering & search
app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const bookings = await db.getBookings();
    const { status, search, sortBy } = req.query;

    let filtered = [...bookings];

    if (status && status !== 'All') {
      filtered = filtered.filter(b => b.status.toLowerCase() === status.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.name?.toLowerCase().includes(q) ||
        b.refId?.toLowerCase().includes(q) ||
        b.contact?.toLowerCase().includes(q) ||
        b.tourName?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'dateAsc') {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortBy === 'priceDesc') {
      filtered.sort((a, b) => b.totalPrice - a.totalPrice);
    } else if (sortBy === 'priceAsc') {
      filtered.sort((a, b) => a.totalPrice - b.totalPrice);
    } else {
      // Default: newest createdAt first
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({ success: true, count: filtered.length, bookings: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// Admin: Booking Statistics
app.get('/api/bookings/stats', requireAuth, async (req, res) => {
  try {
    const bookings = await db.getBookings();
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'Pending').length;
    const confirmed = bookings.filter(b => b.status === 'Confirmed').length;
    const completed = bookings.filter(b => b.status === 'Completed').length;
    const cancelled = bookings.filter(b => b.status === 'Cancelled').length;

    // Revenue from confirmed and completed bookings
    const activeRevenue = bookings
      .filter(b => b.status === 'Confirmed' || b.status === 'Completed')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const totalKayakers = bookings
      .filter(b => b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (b.kayakers || 0), 0);

    res.json({
      success: true,
      stats: {
        total,
        pending,
        confirmed,
        completed,
        cancelled,
        activeRevenue,
        totalKayakers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to compute stats' });
  }
});

// Admin: Update Booking Status
app.patch('/api/bookings/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const refId = req.params.id;
    const updated = await db.updateBooking(refId, {
      status,
      updatedAt: new Date().toISOString()
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, message: `Status updated to ${status}`, booking: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// Admin: Update Booking Notes
app.patch('/api/bookings/:id/notes', requireAuth, async (req, res) => {
  try {
    const { notes } = req.body;
    const refId = req.params.id;
    const updated = await db.updateBooking(refId, {
      notes: notes !== undefined ? String(notes).trim() : '',
      updatedAt: new Date().toISOString()
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, message: 'Notes updated', booking: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notes' });
  }
});

// Admin: Delete Booking
app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    const refId = req.params.id;
    const deleted = await db.deleteBooking(refId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete booking' });
  }
});

// Admin: Export Bookings to CSV
app.get('/api/bookings/export/csv', requireAuth, async (req, res) => {
  try {
    const bookings = await db.getBookings();
    const headers = ['Reference ID', 'Customer Name', 'Contact', 'Experience', 'Date', 'Time Slot', 'Kayakers', 'Total Price (INR)', 'Status', 'Notes', 'Created At'];

    const rows = bookings.map(b => [
      `"${b.refId || ''}"`,
      `"${(b.name || '').replace(/"/g, '""')}"`,
      `"${(b.contact || '').replace(/"/g, '""')}"`,
      `"${(b.tourName || '').replace(/"/g, '""')}"`,
      `"${b.date || ''}"`,
      `"${b.slot || ''}"`,
      b.kayakers || 1,
      b.totalPrice || 0,
      `"${b.status || 'Pending'}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`,
      `"${b.createdAt || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="riverdale_kayaking_bookings_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
});

// -------------------------------------------------------------
// Protected Admin Dashboard Route (Server-side redirect: ZERO flash/blink)
// -------------------------------------------------------------
app.get(['/admin', '/admin/', '/admin/index.html'], async (req, res) => {
  const token = req.cookies.admin_token;
  if (!token) {
    return res.redirect(302, '/admin/login');
  }
  try {
    const isValid = await db.validateAdminSession(token);
    if (!isValid) {
      return res.redirect(302, '/admin/login');
    }
    res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html'));
  } catch (err) {
    res.redirect(302, '/admin/login');
  }
});

app.get(['/admin/login', '/admin/login/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin', 'login.html'));
});

// -------------------------------------------------------------
// Static UI Routes
// -------------------------------------------------------------
// Serve public website files (excluding protected admin dashboard above)
app.use(express.static(PUBLIC_DIR));

// Fallback for public website
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// -------------------------------------------------------------
// Start Server with Database Initialization
// -------------------------------------------------------------
async function startServer() {
  await db.initDB();

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🛶 Riverdale Kayaking Node.js Server Running!`);
    console.log(`🌐 Public Website:  http://localhost:${PORT}`);
    console.log(`⚙️  Admin Panel:     http://localhost:${PORT}/admin`);
    console.log(`🔑 Admin Access:    Secret shortcut Ctrl+Shift+9 or mobile gesture`);
    console.log(`💾 Database:        ${db.isMongoConnected() ? 'MongoDB Cloud Atlas' : 'Local JSON Store (data/)'}`);
    console.log(`====================================================`);
  });
}

startServer();
