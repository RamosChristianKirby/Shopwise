import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

import { protect, adminOnly, optionalAuth } from '../middleware/auth.js';
import { register, login, me, updateProfile } from '../controllers/authController.js';
import {
  getProducts, adminGetProducts, getProduct, createProduct, updateProduct, deleteProduct,
} from '../controllers/productController.js';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
} from '../controllers/categoryController.js';
import {
  createOrder, getMyOrders, getOrder, cancelMyOrder, submitPaymentReference,
  adminGetOrders, adminUpdateStatus, adminMarkPaid,
} from '../controllers/orderController.js';
import { adminGetUsers, adminUpdateUser } from '../controllers/userController.js';
import { summary, sales } from '../controllers/analyticsController.js';
import { getPaymentInfo } from '../config/settings.js';
import placeholderSvg from '../utils/placeholder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On Vercel the app folder is read-only; only /tmp is writable (and it is temporary).
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  || (process.env.VERCEL ? '/tmp/uploads' : path.resolve(__dirname, '../../uploads'));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
});

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.get('/config/payment', (req, res) => res.json(getPaymentInfo()));

// Generated product placeholder image, e.g. /api/placeholder/yoga-mat.svg?v=1
router.get('/placeholder/:name', (req, res) => {
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(placeholderSvg(req.params.name, Number(req.query.v) || 0));
});

/* Auth */
router.post('/auth/register', authLimiter, register);
router.post('/auth/login', authLimiter, login);
router.get('/auth/me', protect, me);
router.put('/auth/profile', protect, updateProfile);

/* Storefront (public) */
router.get('/products', getProducts);
router.get('/products/:idOrSlug', optionalAuth, getProduct);
router.get('/categories', getCategories);

/* Customer orders */
router.post('/orders', protect, createOrder);
router.get('/orders/mine', protect, getMyOrders);
router.get('/orders/:id', protect, getOrder);
router.put('/orders/:id/cancel', protect, cancelMyOrder);
router.put('/orders/:id/payment-reference', protect, submitPaymentReference);

/* Admin */
const admin = Router();
admin.use(protect, adminOnly);

admin.get('/analytics/summary', summary);
admin.get('/analytics/sales', sales);

admin.get('/products', adminGetProducts);
admin.post('/products', createProduct);
admin.put('/products/:id', updateProduct);
admin.delete('/products/:id', deleteProduct);

admin.post('/categories', createCategory);
admin.put('/categories/:id', updateCategory);
admin.delete('/categories/:id', deleteCategory);

admin.get('/orders', adminGetOrders);
admin.put('/orders/:id/status', adminUpdateStatus);
admin.put('/orders/:id/pay', adminMarkPaid);

admin.get('/users', adminGetUsers);
admin.put('/users/:id', adminUpdateUser);

admin.post('/upload', upload.array('images', 8), (req, res) => {
  res.status(201).json({ urls: req.files.map((f) => `/uploads/${f.filename}`) });
});

router.use('/admin', admin);

export default router;
