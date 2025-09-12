const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/incomes - Liste des revenus avec filtres
router.get('/', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = 'SELECT * FROM incomes WHERE user_id = $1';
    const params = [req.user.id];

    if (start) {
      query += ' AND date >= $2';
      params.push(start);
    }

    if (end) {
      query += ' AND date <= $3';
      params.push(end);
    }

    query += ' ORDER BY date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des revenus:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/incomes/:id - Revenu par ID
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM incomes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
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

// POST /api/incomes - Créer un revenu
router.post('/', auth, async (req, res) => {
  try {
    const { amount, date, source, description } = req.body;

    // Validation
    if (!amount || !date || !source) {
      return res.status(400).json({ message: 'Montant, date et source sont requis' });
    }

    const result = await db.query(
      'INSERT INTO incomes (amount, date, source, description, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [amount, date, source, description, req.user.id]
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

// PUT /api/incomes/:id - Mettre à jour un revenu
router.put('/:id', auth, async (req, res) => {
  try {
    const { amount, date, source, description } = req.body;
    const incomeId = req.params.id;

    // Vérifier que le revenu appartient à l'utilisateur
    const existingIncome = await db.query(
      'SELECT * FROM incomes WHERE id = $1 AND user_id = $2',
      [incomeId, req.user.id]
    );

    if (existingIncome.rows.length === 0) {
      return res.status(404).json({ message: 'Revenu non trouvé' });
    }

    const result = await db.query(
      'UPDATE incomes SET amount = $1, date = $2, source = $3, description = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *',
      [amount, date, source, description, incomeId, req.user.id]
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

// DELETE /api/incomes/:id - Supprimer un revenu
router.delete('/:id', auth, async (req, res) => {
  try {
    const incomeId = req.params.id;

    const result = await db.query(
      'DELETE FROM incomes WHERE id = $1 AND user_id = $2 RETURNING *',
      [incomeId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Revenu non trouvé' });
    }

    res.json({ message: 'Revenu supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du revenu:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
