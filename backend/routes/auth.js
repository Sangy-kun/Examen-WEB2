const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');
require('dotenv').config({ path: './config.env' });

const router = express.Router();

// Inscription
router.post('/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Nom d\'utilisateur ou email déjà utilisé' });
    }

    // Hasher le mot de passe
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const newUser = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: newUser.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Connexion
router.post('/login', [
  body('username').notEmpty().trim(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Trouver l'utilisateur
    const user = await db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const userData = user.rows[0];

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: userData.id, username: userData.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        profile_picture: userData.profile_picture,
        dark_mode: userData.dark_mode
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir le profil utilisateur
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await db.query(
      'SELECT id, username, email, profile_picture, dark_mode, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;


