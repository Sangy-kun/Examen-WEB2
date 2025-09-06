const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Obtenir toutes les catégories (globales + utilisateur)
router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM categories WHERE (user_id = $1 OR user_id IS NULL)';
    const values = [req.user.userId];

    if (type) {
      query += ' AND type = $2';
      values.push(type);
    }

    query += ' ORDER BY name';

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle catégorie
router.post('/', auth, [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('type').isIn(['expense', 'income']),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, color } = req.body;

    // Vérifier si la catégorie existe déjà pour cet utilisateur
    const existingCategory = await db.query(
      'SELECT * FROM categories WHERE name = $1 AND type = $2 AND user_id = $3',
      [name, type, req.user.userId]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà pour ce type' });
    }

    const result = await db.query(
      `INSERT INTO categories (name, type, color, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, type, color || '#3B82F6', req.user.userId]
    );

    res.status(201).json({
      message: 'Catégorie créée avec succès',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une catégorie
router.put('/:id', auth, [
  body('name').optional().notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Vérifier que la catégorie appartient à l'utilisateur
    const existingCategory = await db.query(
      'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    const { name, color } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      // Vérifier si le nouveau nom n'existe pas déjà
      const duplicateCheck = await db.query(
        'SELECT * FROM categories WHERE name = $1 AND type = $2 AND user_id = $3 AND id != $4',
        [name, existingCategory.rows[0].type, req.user.userId, req.params.id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà pour ce type' });
      }

      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (color !== undefined) {
      updates.push(`color = $${paramCount}`);
      values.push(color);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }

    values.push(req.params.id);

    const result = await db.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'Catégorie mise à jour avec succès',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une catégorie
router.delete('/:id', auth, async (req, res) => {
  try {
    // Vérifier que la catégorie appartient à l'utilisateur
    const existingCategory = await db.query(
      'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    // Vérifier si la catégorie est utilisée
    const isUsed = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM expenses WHERE category_id = $1) as expense_count,
        (SELECT COUNT(*) FROM incomes WHERE category_id = $1) as income_count`,
      [req.params.id]
    );

    const totalUsage = parseInt(isUsed.rows[0].expense_count) + parseInt(isUsed.rows[0].income_count);
    if (totalUsage > 0) {
      return res.status(400).json({ 
        message: 'Cette catégorie ne peut pas être supprimée car elle est utilisée par des dépenses ou revenus' 
      });
    }

    await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);

    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;


