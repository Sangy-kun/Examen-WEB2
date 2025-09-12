const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Obtenir tous les revenus de l'utilisateur
router.get('/', auth, async (req, res) => {
  try {
    const { month, year, category_id, source } = req.query;
    let query = `
      SELECT i.*, c.name as category_name, c.color as category_color
      FROM incomes i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.user_id = $1
    `;
    const values = [req.user.userId];
    let paramCount = 2;

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM i.date) = $${paramCount} AND EXTRACT(YEAR FROM i.date) = $${paramCount + 1}`;
      values.push(parseInt(month), parseInt(year));
      paramCount += 2;
    }

    if (category_id) {
      query += ` AND i.category_id = $${paramCount}`;
      values.push(category_id);
      paramCount++;
    }

    if (source) {
      query += ` AND i.source ILIKE $${paramCount}`;
      values.push(`%${source}%`);
      paramCount++;
    }

    query += ' ORDER BY i.date DESC';

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des revenus:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir un revenu spécifique
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, c.name as category_name, c.color as category_color
       FROM incomes i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.id = $1 AND i.user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Revenu non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du revenu:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer un nouveau revenu
router.post('/', auth, [
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim(),
  body('source').notEmpty().trim(),
  body('date').isISO8601().toDate(),
  body('category_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, source, date, category_id } = req.body;

    const result = await db.query(
      `INSERT INTO incomes (amount, description, source, date, category_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [amount, description, source, date, category_id, req.user.userId]
    );

    res.status(201).json({
      message: 'Revenu créé avec succès',
      income: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création du revenu:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un revenu
router.put('/:id', auth, [
  body('amount').optional().isFloat({ min: 0.01 }),
  body('description').optional().trim(),
  body('source').optional().notEmpty().trim(),
  body('date').optional().isISO8601().toDate(),
  body('category_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Vérifier que le revenu appartient à l'utilisateur
    const existingIncome = await db.query(
      'SELECT * FROM incomes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (existingIncome.rows.length === 0) {
      return res.status(404).json({ message: 'Revenu non trouvé' });
    }

    const { amount, description, source, date, category_id } = req.body;
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

    if (source !== undefined) {
      updates.push(`source = $${paramCount}`);
      values.push(source);
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

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE incomes SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'Revenu mis à jour avec succès',
      income: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du revenu:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un revenu
router.delete('/:id', auth, async (req, res) => {
  try {
    // Vérifier que le revenu appartient à l'utilisateur
    const existingIncome = await db.query(
      'SELECT * FROM incomes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (existingIncome.rows.length === 0) {
      return res.status(404).json({ message: 'Revenu non trouvé' });
    }

    await db.query('DELETE FROM incomes WHERE id = $1', [req.params.id]);

    res.json({ message: 'Revenu supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du revenu:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;





