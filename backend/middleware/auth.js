const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config.env' });

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token d\'authentification manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = auth;


/**
 * Commentaire pour nous dans le code pour nous aider à nous souvenir du fonctionnement
 * Récup le token JWT depuis le header Authorization
 * Vérifie le token avec la clé secrète (JWT_SECRET)
 * Si valide -> ajoute les infos décodées à req.user et passe au middleware suivant (next())
 * Si absent ou invalide → renvoie une erreur 401.
 * Mba ataovy azo kosa
 */
