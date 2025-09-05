const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');
require('dotenv').config({ path: './config.env' });

const router = express.Router();

// Configuration de multer pour les photos de profil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
    console.log('Dossier d\'upload:', uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Dossier créé:', uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Nom du fichier:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont autorisés'), false);
    }
  }
});

// Obtenir le profil
router.get('/', auth, async (req, res) => {
  try {
    const user = await db.query(
      'SELECT id, username, email, profile_picture, created_at FROM users WHERE id = $1',
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

// Mettre à jour le profil
router.put('/', auth, [
  body('username').optional().isLength({ min: 3 }).trim().escape(),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username) {
      updates.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }

    if (email) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.userId);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, profile_picture, dark_mode`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({
      message: 'Profil mis à jour avec succès',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Upload de photo de profil
router.post('/picture', auth, upload.single('picture'), async (req, res) => {
  try {
    console.log('Upload de photo de profil pour utilisateur:', req.user.userId);
    console.log('Fichier reçu:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const filePath = `/uploads/profiles/${req.file.filename}`;
    console.log('Chemin du fichier:', filePath);

    // Supprimer l'ancienne photo si elle existe
    const oldUser = await db.query(
      'SELECT profile_picture FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (oldUser.rows[0]?.profile_picture) {
      const oldFilePath = path.join(__dirname, '..', oldUser.rows[0].profile_picture);
      console.log('Ancien fichier:', oldFilePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log('Ancien fichier supprimé');
      }
    }

    // Mettre à jour la base de données
    const result = await db.query(
      'UPDATE users SET profile_picture = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING profile_picture',
      [filePath, req.user.userId]
    );
    
    console.log('Base de données mise à jour:', result.rows[0]);

    res.json({
      message: 'Photo de profil mise à jour avec succès',
      profile_picture: filePath
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload de la photo:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer la photo de profil
router.delete('/picture', auth, async (req, res) => {
  try {
    const user = await db.query(
      'SELECT profile_picture FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (user.rows[0]?.profile_picture) {
      const filePath = path.join(__dirname, '..', user.rows[0].profile_picture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await db.query(
        'UPDATE users SET profile_picture = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [req.user.userId]
      );
    }

    res.json({ message: 'Photo de profil supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la photo:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

