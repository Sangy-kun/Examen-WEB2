const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Résumé mensuel
router.get('/monthly', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    console.log('Requête reçue pour:', targetMonth, targetYear, 'User ID:', req.user.userId);

    // Calculer le total des revenus du mois (requête simplifiée)
    const incomeResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_income
       FROM incomes 
       WHERE user_id = $1 
       AND EXTRACT(MONTH FROM date) = $2 
       AND EXTRACT(YEAR FROM date) = $3`,
      [req.user.userId, targetMonth, targetYear]
    );

    console.log('Revenus calculés:', incomeResult.rows[0]);

    // Calculer le total des dépenses du mois (requête simplifiée)
    const expenseResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses 
       WHERE user_id = $1 
       AND EXTRACT(MONTH FROM date) = $2 
       AND EXTRACT(YEAR FROM date) = $3`,
      [req.user.userId, targetMonth, targetYear]
    );

         console.log('Dépenses calculées:', expenseResult.rows[0]);

     const totalIncome = parseFloat(incomeResult.rows[0].total_income);
     const totalExpenses = parseFloat(expenseResult.rows[0].total_expenses);
     const balance = totalIncome - totalExpenses;
     
     console.log('Total revenus:', totalIncome);
     console.log('Total dépenses:', totalExpenses);
     console.log('Solde:', balance);

         // Dépenses par catégorie (requête ultra-simplifiée)
     const categoryExpenses = await db.query(
       `SELECT 
         c.name as category_name,
         c.color as category_color,
         COALESCE(SUM(e.amount), 0) as amount
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = $1
          AND EXTRACT(MONTH FROM e.date) = $2 
          AND EXTRACT(YEAR FROM e.date) = $3
        GROUP BY c.id, c.name, c.color
        ORDER BY amount DESC`,
       [req.user.userId, targetMonth, targetYear]
     );

     console.log('Dépenses par catégorie:', categoryExpenses.rows);

     // Revenus par catégorie (requête ultra-simplifiée)
     const categoryIncomes = await db.query(
       `SELECT 
         c.name as category_name,
         c.color as category_color,
         COALESCE(SUM(i.amount), 0) as amount
        FROM incomes i
        JOIN categories c ON i.category_id = c.id
        WHERE i.user_id = $1
          AND EXTRACT(MONTH FROM i.date) = $2 
          AND EXTRACT(YEAR FROM i.date) = $3
        GROUP BY c.id, c.name, c.color
        ORDER BY amount DESC`,
       [req.user.userId, targetMonth, targetYear]
     );

     console.log('Revenus par catégorie:', categoryIncomes.rows);

         // Évolution des dépenses sur 6 mois (requête simplifiée)
     const monthlyEvolution = [];
     for (let i = 5; i >= 0; i--) {
       const month = targetMonth - i;
       const year = targetYear;
       let adjustedMonth = month;
       let adjustedYear = year;
       
       if (month <= 0) {
         adjustedMonth = month + 12;
         adjustedYear = year - 1;
       }

       const monthExpenses = await db.query(
         `SELECT COALESCE(SUM(amount), 0) as total
          FROM expenses 
          WHERE user_id = $1 
          AND EXTRACT(MONTH FROM date) = $2 
          AND EXTRACT(YEAR FROM date) = $3`,
         [req.user.userId, adjustedMonth, adjustedYear]
       );

       monthlyEvolution.push({
         month: adjustedMonth,
         year: adjustedYear,
         total: parseFloat(monthExpenses.rows[0].total)
       });
     }

    res.json({
      month: targetMonth,
      year: targetYear,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      balance: balance,
      category_expenses: categoryExpenses.rows,
      category_incomes: categoryIncomes.rows,
      monthly_evolution: monthlyEvolution
    });
  } catch (error) {
    console.error('Erreur lors du calcul du résumé mensuel:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Résumé personnalisé (période spécifique)
router.get('/', auth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Les dates de début et de fin sont requises' });
    }

    // Calculer le total des revenus de la période
    const incomeResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_income
       FROM incomes 
       WHERE user_id = $1 
       AND date BETWEEN $2 AND $3`,
      [req.user.userId, start_date, end_date]
    );

    // Calculer le total des dépenses de la période
    const expenseResult = await db.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN type = 'one-time' THEN amount
          WHEN type = 'recurring' AND start_date <= $3 AND end_date >= $2 THEN amount
          ELSE 0
        END
      ), 0) as total_expenses
       FROM expenses 
       WHERE user_id = $1`,
      [req.user.userId, start_date, end_date]
    );

    const totalIncome = parseFloat(incomeResult.rows[0].total_income);
    const totalExpenses = parseFloat(expenseResult.rows[0].total_expenses);
    const balance = totalIncome - totalExpenses;

    // Dépenses par catégorie pour la période
    const categoryExpenses = await db.query(
      `SELECT 
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(
          CASE 
            WHEN e.type = 'one-time' THEN e.amount
            WHEN e.type = 'recurring' AND e.start_date <= $3 AND e.end_date >= $2 THEN e.amount
            ELSE 0
          END
        ), 0) as amount
       FROM categories c
       LEFT JOIN expenses e ON c.id = e.category_id 
         AND e.user_id = $1
         AND (e.type = 'one-time' OR (e.type = 'recurring' AND e.start_date <= $3 AND e.end_date >= $2))
       WHERE c.user_id = $1 AND c.type = 'expense'
       GROUP BY c.id, c.name, c.color
       HAVING COALESCE(SUM(
         CASE 
           WHEN e.type = 'one-time' THEN e.amount
           WHEN e.type = 'recurring' AND e.start_date <= $3 AND e.end_date >= $2 THEN e.amount
           ELSE 0
         END
       ), 0) > 0
       ORDER BY amount DESC`,
      [req.user.userId, start_date, end_date]
    );

    res.json({
      start_date,
      end_date,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      balance: balance,
      category_expenses: categoryExpenses.rows
    });
  } catch (error) {
    console.error('Erreur lors du calcul du résumé personnalisé:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Alertes de budget
router.get('/alerts', auth, async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

         // Calculer les dépenses du mois en cours (requête simplifiée)
     const currentMonthExpenses = await db.query(
       `SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses 
        WHERE user_id = $1 
        AND EXTRACT(MONTH FROM date) = $2 
        AND EXTRACT(YEAR FROM date) = $3`,
       [req.user.userId, currentMonth, currentYear]
     );

    const totalExpenses = parseFloat(currentMonthExpenses.rows[0].total);
    const alerts = [];

    // Alerte si les dépenses dépassent 100000 Ar par exemple car c'est le moyen pour nous de nous repérer dans les depenses et 
    // que j'ai du mal à traviller sur le codes tout seul
    if (totalExpenses > 100000) {
      alerts.push({
        type: 'warning',
        message: `Vos dépenses du mois dépassent 100 000 Ar (${totalExpenses.toFixed(0)} Ar)`,
        severity: 'high'
      });
    }

    // Alerte si les dépenses dépassent 80000 Ar
    if (totalExpenses > 80000) {
      alerts.push({
        type: 'info',
        message: `Vos dépenses du mois approchent de 100 000 Ar (${totalExpenses.toFixed(0)} Ar)`,
        severity: 'medium'
      });
    }

    // Vérifier les dépenses récurrentes qui arrivent à échéance
    const recurringExpenses = await db.query(
      `SELECT description, end_date
       FROM expenses 
       WHERE user_id = $1 
       AND type = 'recurring' 
       AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`,
      [req.user.userId]
    );

    recurringExpenses.rows.forEach(expense => {
      const daysUntilEnd = Math.ceil((new Date(expense.end_date) - currentDate) / (1000 * 60 * 60 * 24));
      alerts.push({
        type: 'info',
        message: `Dépense récurrente "${expense.description}" se termine dans ${daysUntilEnd} jour(s)`,
        severity: 'low'
      });
    });

    res.json({
      total_expenses: totalExpenses,
      alerts: alerts
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;


