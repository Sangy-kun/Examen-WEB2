const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Configuration de multer pour les reçus
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image et PDF sont autorisés'), false);
    }
  }
});

// Obtenir toutes les dépenses de l'utilisateur
router.get('/', auth, async (req, res) => {
  try {
    const { month, year, category_id, type } = req.query;
    let query = `
      SELECT e.*, c.name as category_name, c.color as category_color
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
    `;
    const values = [req.user.userId];
    let paramCount = 2;

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM e.date) = $${paramCount} AND EXTRACT(YEAR FROM e.date) = $${paramCount + 1}`;
      values.push(parseInt(month), parseInt(year));
      paramCount += 2;
    }

    if (category_id) {
      query += ` AND e.category_id = $${paramCount}`;
      values.push(category_id);
      paramCount++;
    }

    if (type) {
      query += ` AND e.type = $${paramCount}`;
      values.push(type);
      paramCount++;
    }

    query += ' ORDER BY e.date DESC';

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir une dépense spécifique
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, c.name as category_name, c.color as category_color
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.id = $1 AND e.user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de la dépense:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle dépense
router.post('/', auth, upload.single('receipt'), [
  body('amount').isFloat({ min: 0.01 }),
  body('description').notEmpty().trim(),
  body('date').isISO8601().toDate(),
  body('category_id').optional().isInt(),
  body('type').optional().isIn(['one-time', 'recurring']),
  body('start_date').optional().isISO8601().toDate(),
  body('end_date').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, date, category_id, type, start_date, end_date } = req.body;
    let receipt_path = null;

    if (req.file) {
      receipt_path = `/uploads/receipts/${req.file.filename}`;
    }

    // Validation des dates pour les dépenses récurrentes
    if (type === 'recurring') {
      if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Les dates de début et de fin sont requises pour les dépenses récurrentes' });
      }
      if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ message: 'La date de début doit être antérieure à la date de fin' });
      }
    }

    const result = await db.query(
      `INSERT INTO expenses (amount, description, date, category_id, user_id, receipt_path, type, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [amount, description, date, category_id, req.user.userId, receipt_path, type || 'one-time', start_date, end_date]
    );

    res.status(201).json({
      message: 'Dépense créée avec succès',
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création de la dépense:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une dépense
router.put('/:id', auth, upload.single('receipt'), [
  body('amount').optional().isFloat({ min: 0.01 }),
  body('description').optional().notEmpty().trim(),
  body('date').optional().isISO8601().toDate(),
  body('category_id').optional().isInt(),
  body('type').optional().isIn(['one-time', 'recurring']),
  body('start_date').optional().isISO8601().toDate(),
  body('end_date').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Vérifier que la dépense appartient à l'utilisateur
    const existingExpense = await db.query(
      'SELECT * FROM expenses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    const { amount, description, date, category_id, type, start_date, end_date } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (amount !== undefined) {
      updates.push(`amount = $${paramCount}`);
      values.push(amount);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (date !== undefined) {
      updates.push(`date = $${paramCount}`);
      values.push(date);
      paramCount++;
    }

    if (category_id !== undefined) {
      updates.push(`category_id = $${paramCount}`);
      values.push(category_id);
      paramCount++;
    }

    if (type !== undefined) {
      updates.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    if (start_date !== undefined) {
      updates.push(`start_date = $${paramCount}`);
      values.push(start_date);
      paramCount++;
    }

    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount}`);
      values.push(end_date);
      paramCount++;
    }

    // Gérer le reçu
    if (req.file) {
      const receipt_path = `/uploads/receipts/${req.file.filename}`;
      updates.push(`receipt_path = $${paramCount}`);
      values.push(receipt_path);
      paramCount++;

      // Supprimer l'ancien reçu
      if (existingExpense.rows[0].receipt_path) {
        const oldFilePath = path.join(__dirname, '..', existingExpense.rows[0].receipt_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'Dépense mise à jour avec succès',
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la dépense:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une dépense
router.delete('/:id', auth, async (req, res) => {
  try {
    // Vérifier que la dépense appartient à l'utilisateur
    const existingExpense = await db.query(
      'SELECT receipt_path FROM expenses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    // Supprimer le reçu associé
    if (existingExpense.rows[0].receipt_path) {
      const filePath = path.join(__dirname, '..', existingExpense.rows[0].receipt_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);

    res.json({ message: 'Dépense supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la dépense:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;


