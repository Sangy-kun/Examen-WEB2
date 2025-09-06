# Finance Manager - PostgreSQL

Un gestionnaire de depense PostgreSQL, Node.js, React et Tailwind CSS.

# Facilté de navigation mais manque de performance (avis personnelle)

# Backend
- **Node.js** - JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Base de données
- **JWT** - Authentification
- **bcryptjs** - Hashage des mots de passe
- **multer** - Upload de fichiers (que j'arrive pas à mettre en place et c'est enervant)

# Frontend
- **React** - Framework JavaScript
- **React Router** - Navigation
- **Tailwind CSS** - Framework CSS
- **Axios** - Client HTTP
- **Lucide React** - Icônes pour facilté les îcones car ça c'était le plus proche
- **React Hot Toast** - Notifications comme les connexions efféctué ou suppression ou autre type de notif

# Installation

Deux terminals
cd/bakend puis npm run dev
cd/frontend puis npm run dev

# Créer la base de données et les tables
\i backend/database.sql
```
# Configurer les variables d'environnement
# Modifier le fichier config.env selon la configuration PostgreSQL, identifiant et mdp et port
# Logiquement le port c'est 5432 pour posqtgres par defaut
```




###  Implémentées
- Authentification JWT
- Inscription et connexion
- Interface utilisateur
- Tableau de bord de base
- Structure de base de données PostgreSQL
- Graphiques et statistiques
- Gestion des dépenses
- Gestion des revenus
- Gestion des catégories
- Upload de reçus


### Variables d'environnement (backend/config.env)

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/finance_manager
JWT_SECRET=votre_secret_jwt_tres_securise_ici
NODE_ENV=development
```


# Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur

# Sécurité

- Mots de passe hashés avec bcrypt
- Authentification JWT
- Validation des données côté serveur

il y a helmet, csurf (Protection CSRF (Cross-Site Request Forgery)) et dotenv