-- Création de la base de données (à exécuter manuellement)
-- CREATE DATABASE depense;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    dark_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, user_id, type)
);

-- Table des revenus
CREATE TABLE IF NOT EXISTS incomes (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    source VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des dépenses
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receipt_path TEXT,
    type VARCHAR(20) DEFAULT 'one-time' CHECK (type IN ('one-time', 'recurring')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_recurring_dates CHECK (
        (type = 'one-time' AND start_date IS NULL AND end_date IS NULL) OR
        (type = 'recurring' AND start_date IS NOT NULL AND end_date IS NOT NULL AND start_date <= end_date)
    )
);

-- Insertion des catégories par défaut (sans user_id pour qu'elles soient globales)
INSERT INTO categories (name, type, color, icon) VALUES
('Alimentation', 'expense', '#EF4444', 'shopping-cart'),
('Transport', 'expense', '#3B82F6', 'car'),
('Logement', 'expense', '#8B5CF6', 'home'),
('Loisirs', 'expense', '#10B981', 'gamepad-2'),
('Santé', 'expense', '#F59E0B', 'heart'),
('Salaire', 'income', '#10B981', 'dollar-sign'),
('Freelance', 'income', '#8B5CF6', 'briefcase'),
('Investissements', 'income', '#F59E0B', 'trending-up')
ON CONFLICT DO NOTHING;
