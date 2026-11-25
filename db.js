require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const CONTENT_FILE = path.join(DATA_DIR, 'site-content.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// -------------------------------------------------------------------
// Mongoose Schemas & Models
// -------------------------------------------------------------------
const BookingSchema = new mongoose.Schema({
  refId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  contact: { type: String, required: true },
  tourId: { type: String, required: true },
  tourName: { type: String, required: true },
  date: { type: String, required: true },
  slot: { type: String, required: true },
  kayakers: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 1200 },
  totalPrice: { type: Number, default: 1200 },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const ContentSchema = new mongoose.Schema({
  key: { type: String, default: 'site_content', unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

const AdminSchema = new mongoose.Schema({
  username: { type: String, default: 'admin', unique: true },
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
  sessions: [
    {
      token: String,
      expiresAt: Date
    }
  ]
});

const BookingModel = mongoose.model('Booking', BookingSchema);
const ContentModel = mongoose.model('Content', ContentSchema);
const AdminModel = mongoose.model('Admin', AdminSchema);

// -------------------------------------------------------------------
// File Helper Fallbacks
// -------------------------------------------------------------------
async function readJsonFile(filePath, defaultValue) {
  try {
    const raw = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (defaultValue !== undefined) {
      await writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
    throw err;
  }
}

async function writeJsonFile(filePath, data) {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await fsPromises.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fsPromises.rename(tmpPath, filePath);
}

// -------------------------------------------------------------------
// Database Connection Manager
// -------------------------------------------------------------------
let isConnected = false;

async function initDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    console.log('ℹ️  No MONGODB_URI detected in environment. Using local JSON database (data/)...');
    return false;
  }

  try {
    console.log('⏳ Connecting to MongoDB Cloud Database...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000
    });
    isConnected = true;
    console.log('✅ Successfully connected to MongoDB Cloud Database!');

    // Seed/migrate local JSON data to MongoDB if MongoDB is empty
    await seedMongoIfEmpty();
    return true;
  } catch (err) {
    console.error('⚠️  MongoDB connection error:', err.message);
    console.log('🔄 Falling back seamlessly to local JSON database (data/)...');
    isConnected = false;
    return false;
  }
}

// Seed MongoDB from JSON files on first run
async function seedMongoIfEmpty() {
  try {
    // 1. Seed Content
    const existingContent = await ContentModel.findOne({ key: 'site_content' });
    if (!existingContent && fs.existsSync(CONTENT_FILE)) {
      const localContent = await readJsonFile(CONTENT_FILE, {});
      await ContentModel.create({ key: 'site_content', data: localContent });
      console.log('🌱 Seeded site content from site-content.json to MongoDB');
    }

    // 2. Seed Admin
    const existingAdmin = await AdminModel.findOne({ username: 'admin' });
    if (!existingAdmin && fs.existsSync(ADMIN_FILE)) {
      const localAdmin = await readJsonFile(ADMIN_FILE, {});
      await AdminModel.create({
        username: localAdmin.username || 'admin',
        passwordHash: localAdmin.passwordHash,
        salt: localAdmin.salt,
        sessions: []
      });
      console.log('🌱 Seeded admin credentials from admin.json to MongoDB');
    }

    // 3. Seed Bookings
    const bookingCount = await BookingModel.countDocuments();
    if (bookingCount === 0 && fs.existsSync(BOOKINGS_FILE)) {
      const localBookings = await readJsonFile(BOOKINGS_FILE, []);
      if (Array.isArray(localBookings) && localBookings.length > 0) {
        await BookingModel.insertMany(localBookings);
        console.log(`🌱 Seeded ${localBookings.length} bookings from bookings.json to MongoDB`);
      }
    }
  } catch (err) {
    console.warn('Note on MongoDB seed:', err.message);
  }
}

// -------------------------------------------------------------------
// Unified Data Access API
// -------------------------------------------------------------------

// --- BOOKINGS ---
async function getBookings() {
  if (isConnected) {
    const list = await BookingModel.find().sort({ createdAt: -1 }).lean();
    return list.map(b => ({ ...b, id: b.refId }));
  }
  return await readJsonFile(BOOKINGS_FILE, []);
}

async function createBooking(bookingData) {
  if (isConnected) {
    const doc = await BookingModel.create(bookingData);
    return doc.toObject();
  }
  const bookings = await readJsonFile(BOOKINGS_FILE, []);
  bookings.unshift(bookingData);
  await writeJsonFile(BOOKINGS_FILE, bookings);
  return bookingData;
}

async function updateBooking(refId, updates) {
  if (isConnected) {
    const updated = await BookingModel.findOneAndUpdate(
      { refId },
      { $set: updates },
      { new: true }
    ).lean();
    return updated;
  }
  const bookings = await readJsonFile(BOOKINGS_FILE, []);
  const index = bookings.findIndex(b => b.refId === refId);
  if (index === -1) return null;
  bookings[index] = { ...bookings[index], ...updates };
  await writeJsonFile(BOOKINGS_FILE, bookings);
  return bookings[index];
}

async function deleteBooking(refId) {
  if (isConnected) {
    const res = await BookingModel.findOneAndDelete({ refId });
    return !!res;
  }
  const bookings = await readJsonFile(BOOKINGS_FILE, []);
  const filtered = bookings.filter(b => b.refId !== refId);
  if (filtered.length === bookings.length) return false;
  await writeJsonFile(BOOKINGS_FILE, filtered);
  return true;
}

// --- CONTENT ---
async function getContent() {
  if (isConnected) {
    const doc = await ContentModel.findOne({ key: 'site_content' }).lean();
    if (doc && doc.data) return doc.data;
  }
  return await readJsonFile(CONTENT_FILE, {});
}

async function saveContent(newData) {
  if (isConnected) {
    await ContentModel.findOneAndUpdate(
      { key: 'site_content' },
      { $set: { data: newData, updatedAt: new Date() } },
      { upsert: true, new: true }
    );
  }
  // Also keep local file in sync
  try {
    await writeJsonFile(CONTENT_FILE, newData);
  } catch (_) {}
  return newData;
}

// --- ADMIN & SESSIONS ---
async function getAdminData() {
  if (isConnected) {
    const doc = await AdminModel.findOne().lean();
    if (doc) return doc;
  }
  return await readJsonFile(ADMIN_FILE, {});
}

async function saveAdminCredentials(newUsername, passwordHash, salt) {
  if (isConnected) {
    const updateObj = {};
    if (newUsername) updateObj.username = newUsername;
    if (passwordHash && salt) {
      updateObj.passwordHash = passwordHash;
      updateObj.salt = salt;
    }
    await AdminModel.findOneAndUpdate(
      {},
      { $set: updateObj },
      { upsert: true, new: true }
    );
  }
  const admin = await readJsonFile(ADMIN_FILE, {});
  if (newUsername) admin.username = newUsername;
  if (passwordHash && salt) {
    admin.passwordHash = passwordHash;
    admin.salt = salt;
  }
  await writeJsonFile(ADMIN_FILE, admin);
  return true;
}

async function saveAdminPassword(passwordHash, salt) {
  return await saveAdminCredentials(null, passwordHash, salt);
}

async function addAdminSession(token, expiresAt) {
  if (isConnected) {
    await AdminModel.findOneAndUpdate(
      {},
      { $push: { sessions: { token, expiresAt: new Date(expiresAt) } } }
    );
  }
  const admin = await readJsonFile(ADMIN_FILE, {});
  if (!Array.isArray(admin.activeSessions)) admin.activeSessions = [];
  admin.activeSessions.push({ token, expiresAt: new Date(expiresAt).toISOString() });
  await writeJsonFile(ADMIN_FILE, admin);
}

async function validateAdminSession(token) {
  if (!token) return false;

  if (isConnected) {
    const doc = await AdminModel.findOne({
      'sessions.token': token,
      'sessions.expiresAt': { $gt: new Date() }
    });
    return !!doc;
  }

  const admin = await readJsonFile(ADMIN_FILE, {});
  const sessions = Array.isArray(admin.activeSessions) ? admin.activeSessions : [];
  const now = new Date();
  return sessions.some(s => s.token === token && new Date(s.expiresAt) > now);
}

async function removeAdminSession(token) {
  if (isConnected) {
    await AdminModel.findOneAndUpdate(
      {},
      { $pull: { sessions: { token } } }
    );
  }
  const admin = await readJsonFile(ADMIN_FILE, {});
  if (Array.isArray(admin.activeSessions)) {
    admin.activeSessions = admin.activeSessions.filter(s => s.token !== token);
    await writeJsonFile(ADMIN_FILE, admin);
  }
}

module.exports = {
  initDB,
  isMongoConnected: () => isConnected,
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  getContent,
  saveContent,
  getAdminData,
  saveAdminPassword,
  saveAdminCredentials,
  addAdminSession,
  validateAdminSession,
  removeAdminSession
};
