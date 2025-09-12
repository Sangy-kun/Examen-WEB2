const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Configuration de multer pour l'upload des reçus
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formats acceptés: JPG, PNG, PDF'), false);
    }
  }
});

// GET /api/expenses - Liste des dépenses avec filtres
router.get('/', auth, async (req, res) => {
  try {
    const { start, end, category, type } = req.query;
    let query = `
      SELECT e.*, c.name as category_name, c.color as category_color 
      FROM expenses e 
      LEFT JOIN categories c ON e.category_id = c.id 
      WHERE e.user_id = $1
    `;
    const params = [req.user.id];
    let paramCount = 1;

    if (start) {
      paramCount++;
      query += ` AND e.date >= $${paramCount}`;
      params.push(start);
    }

    if (end) {
      paramCount++;
      query += ` AND e.date <= $${paramCount}`;
      params.push(end);
    }

    if (category) {
      paramCount++;
      query += ` AND c.id = $${paramCount}`;
      params.push(category);
    }

    if (type) {
      paramCount++;
      query += ` AND e.type = $${paramCount}`;
      params.push(type);
    }

    query += ' ORDER BY e.date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/expenses/:id - Dépense par ID
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, c.name as category_name, c.color as category_color 
       FROM expenses e 
       LEFT JOIN categories c ON e.category_id = c.id 
       WHERE e.id = $1 AND e.user_id = $2`,
      [req.params.id, req.user.id]
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

// POST /api/expenses - Créer une dépense
router.post('/', auth, upload.single('receipt'), async (req, res) => {
  try {
    const { amount, date, category_id, description, type, start_date, end_date } = req.body;

    // Validation
    if (!amount || !date || !category_id || !type) {
      return res.status(400).json({ message: 'Montant, date, catégorie et type sont requis' });
    }

    if (type === 'recurring' && !start_date) {
      return res.status(400).json({ message: 'Date de début requise pour les dépenses récurrentes' });
    }

    let receiptUrl = null;
    if (req.file) {
      receiptUrl = `/uploads/receipts/${req.file.filename}`;
    }

    const result = await db.query(
      `INSERT INTO expenses (amount, date, category_id, description, type, start_date, end_date, receipt_url, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [amount, date, category_id, description, type, start_date || null, end_date || null, receiptUrl, req.user.id]
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

// PUT /api/expenses/:id - Mettre à jour une dépense
router.put('/:id', auth, upload.single('receipt'), async (req, res) => {
  try {
    const { amount, date, category_id, description, type, start_date, end_date } = req.body;
    const expenseId = req.params.id;

    // Vérifier que la dépense appartient à l'utilisateur
    const existingExpense = await db.query(
      'SELECT * FROM expenses WHERE id = $1 AND user_id = $2',
      [expenseId, req.user.id]
    );

    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    // Gérer le reçu
    let receiptUrl = existingExpense.rows[0].receipt_url;
    if (req.file) {
      // Supprimer l'ancien reçu s'il existe
      if (receiptUrl) {
        const oldFilePath = path.join(__dirname, '..', receiptUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      receiptUrl = `/uploads/receipts/${req.file.filename}`;
    }

    // Supprimer le reçu si demandé
    if (req.body.removeReceipt === 'true') {
      if (receiptUrl) {
        const oldFilePath = path.join(__dirname, '..', receiptUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      receiptUrl = null;
    }

    const result = await db.query(
      `UPDATE expenses 
       SET amount = $1, date = $2, category_id = $3, description = $4, type = $5, 
           start_date = $6, end_date = $7, receipt_url = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 AND user_id = $10 
       RETURNING *`,
      [amount, date, category_id, description, type, start_date || null, end_date || null, receiptUrl, expenseId, req.user.id]
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

// DELETE /api/expenses/:id - Supprimer une dépense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expenseId = req.params.id;

    // Vérifier que la dépense appartient à l'utilisateur
    const existingExpense = await db.query(
      'SELECT receipt_url FROM expenses WHERE id = $1 AND user_id = $2',
      [expenseId, req.user.id]
    );

    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Dépense non trouvée' });
    }

    // Supprimer le reçu s'il existe
    if (existingExpense.rows[0].receipt_url) {
      const filePath = path.join(__dirname, '..', existingExpense.rows[0].receipt_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.query(
      'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
      [expenseId, req.user.id]
    );

    res.json({ message: 'Dépense supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la dépense:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
