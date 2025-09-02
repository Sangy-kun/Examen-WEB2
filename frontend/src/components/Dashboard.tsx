import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MonthlyData, Alert } from '../types';

const Dashboard: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchMonthlyData();
    fetchAlerts();
  }, [selectedMonth, selectedYear]);

  // Rafraîchir les données quand on revient sur le dashboard
  useEffect(() => {
    const handleFocus = () => {
      fetchMonthlyData();
      fetchAlerts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchMonthlyData = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
             console.log('Token:', token ? 'Présent' : 'Absent');
       console.log('Requête pour:', selectedMonth, selectedYear);
       console.log('Date actuelle:', new Date().toISOString());
      
      const response = await axios.get(`/api/summary/monthly?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
             console.log('Réponse API complète:', response.data);
       console.log('Category expenses:', response.data.category_expenses);
       console.log('Category incomes:', response.data.category_incomes);
       
       // Convertir les montants en nombres si nécessaire
       const processedData = {
         ...response.data,
         category_expenses: response.data.category_expenses?.map((expense: any) => ({
           ...expense,
           amount: typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount
         })) || [],
         category_incomes: response.data.category_incomes?.map((income: any) => ({
           ...income,
           amount: typeof income.amount === 'string' ? parseFloat(income.amount) : income.amount
         })) || []
       };
       
       setMonthlyData(processedData);
    } catch (error) {
      console.error('Erreur lors de la récupération des données mensuelles:', error);
      if (typeof error === 'object' && error !== null && 'response' in error) {
        // @ts-ignore
        console.error('Détails de l\'erreur:', error.response?.data);
      }
      
      // Au lieu d'afficher une erreur, on initialise avec des données vides
      setMonthlyData({
        month: selectedMonth,
        year: selectedYear,
        total_income: 0,
        total_expenses: 0,
        balance: 0,
        category_expenses: [],
        category_incomes: [],
        monthly_evolution: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      console.log('Récupération des alertes...');
      
      const response = await axios.get('/api/summary/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Alertes reçues:', response.data);
      setAlerts(response.data.alerts);
    } catch (error) {
      console.error('Erreur lors de la récupération des alertes:', error);
      if (typeof error === 'object' && error !== null && 'response' in error) {
        // @ts-ignore
        console.error('Détails de l\'erreur:', (error as any).response?.data);
      }
      // En cas d'erreur, on met des alertes vides
      setAlerts([]);
    }
  };

  const COLORS: string[] = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];

  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MGA'
    }).format(numAmount);
  };

  const getMonthName = (month: number): string => {
    const months: string[] = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1];
  };

  const getColorName = (hexColor: string): string => {
    const colorMap: { [key: string]: string } = {
      '#EF4444': 'Rouge',
      '#10B981': 'Vert',
      '#3B82F6': 'Bleu',
      '#F59E0B': 'Jaune',
      '#8B5CF6': 'Violet',
      '#EC4899': 'Rose',
      '#06B6D4': 'Cyan',
      '#F97316': 'Orange',
      '#84CC16': 'Vert clair',
      '#6366F1': 'Indigo'
    };
    return colorMap[hexColor] || hexColor;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
              <p className="text-gray-600 mt-2">
                Aperçu de vos finances pour {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  fetchMonthlyData();
                  fetchAlerts();
                  toast.success('Données mises à jour');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </button>
              <Link
                to="/expenses/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle dépense
              </Link>
              <Link
                to="/incomes/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau revenu
              </Link>
            </div>
          </div>

          {/* Sélecteur de mois */}
          <div className="mt-4 flex space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Cartes de résumé */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Revenus */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenus totaux</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(monthlyData?.total_income || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Dépenses */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <TrendingDown className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Dépenses totales</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(monthlyData?.total_expenses || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Solde */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${
                (monthlyData?.balance || 0) >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
              }`}>
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Solde</p>
                <p className={`text-2xl font-semibold ${
                  (monthlyData?.balance || 0) >= 0 ? 'text-gray-900' : 'text-red-600'
                }`}>
                  {formatCurrency(monthlyData?.balance || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Graphiques et alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     {/* Graphique en camembert des dépenses par catégorie */}
           <div className="bg-white rounded-lg shadow p-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-4">
               Dépenses par catégorie
             </h3>
             
             
                        
                         {monthlyData?.category_expenses && monthlyData.category_expenses.length > 0 ? (
               <div>
                 <ResponsiveContainer width="100%" height={300}>
                   <PieChart>
                     <Pie
                       data={monthlyData.category_expenses}
                       cx="50%"
                       cy="50%"
                       labelLine={false}
                       label={({ category_name, amount }) => `${category_name}: ${formatCurrency(amount)}`}
                       outerRadius={80}
                       fill="#8884d8"
                       dataKey="amount"
                       nameKey="category_name"
                     >
                       {monthlyData.category_expenses.map((entry, index) => {
                         const color = entry.category_color || COLORS[index % COLORS.length];
                         console.log(`Cell ${index} color:`, color, 'for category:', entry.category_name, 'amount:', entry.amount);
                         return <Cell key={`cell-${index}`} fill={color} />;
                       })}
                     </Pie>
                     <Tooltip formatter={(value) => formatCurrency(value as number)} />
                   </PieChart>
                 </ResponsiveContainer>
                 
                                   {/* Debug des données */}
                  <div className="mt-4 p-2 bg-blue-100 rounded text-xs">
                    <p>Données reçues: {monthlyData.category_expenses.length} dépenses</p>
                    {monthlyData.category_expenses.map((entry, index) => (
                      <p key={index}>
                        {entry.category_name}: {formatCurrency(entry.amount)} - Couleur: {getColorName(entry.category_color)}
                      </p>
                    ))}
                  </div>
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                 <p className="mb-2">Aucune dépense pour ce mois</p>
                 <p className="text-sm text-gray-400">Commencez par ajouter des dépenses pour voir vos statistiques</p>
                 <p className="text-xs text-gray-400 mt-2">Mois sélectionné: {selectedMonth}/{selectedYear}</p>
               </div>
             )}
          </div>

          {/* Graphique en camembert des revenus par catégorie */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Revenus par catégorie
            </h3>
                         {monthlyData?.category_incomes && monthlyData.category_incomes.length > 0 ? (
               <div>
                 <ResponsiveContainer width="100%" height={300}>
                   <PieChart>
                     <Pie
                       data={monthlyData.category_incomes}
                       cx="50%"
                       cy="50%"
                       labelLine={false}
                       label={({ category_name, amount }) => `${category_name}: ${formatCurrency(amount)}`}
                       outerRadius={80}
                       fill="#10B981"
                       dataKey="amount"
                       nameKey="category_name"
                     >
                       {monthlyData.category_incomes.map((entry, index) => {
                         const color = entry.category_color || COLORS[index % COLORS.length];
                         console.log(`Income Cell ${index} color:`, color, 'for category:', entry.category_name, 'amount:', entry.amount);
                         return <Cell key={`cell-${index}`} fill={color} />;
                       })}
                     </Pie>
                     <Tooltip formatter={(value) => formatCurrency(value as number)} />
                   </PieChart>
                 </ResponsiveContainer>
                 
                                   {/* Debug des données */}
                  <div className="mt-4 p-2 bg-green-100 rounded text-xs">
                    <p>Données reçues: {monthlyData.category_incomes.length} revenus</p>
                    {monthlyData.category_incomes.map((entry, index) => (
                      <p key={index}>
                        {entry.category_name}: {formatCurrency(entry.amount)} - Couleur: {getColorName(entry.category_color)}
                      </p>
                    ))}
                  </div>
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                 <p className="mb-2">Aucun revenu pour ce mois</p>
                 <p className="text-sm text-gray-400">Commencez par ajouter des revenus pour voir vos statistiques</p>
               </div>
             )}
          </div>

          {/* Graphique en barres de l'évolution mensuelle */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Évolution des dépenses (6 mois)
            </h3>
            {monthlyData?.monthly_evolution && monthlyData.monthly_evolution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData.monthly_evolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(month) => getMonthName(month).substring(0, 3)}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="total" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="mb-2">Données insuffisantes pour l'évolution</p>
                <p className="text-sm text-gray-400">Ajoutez des dépenses sur plusieurs mois pour voir la tendance</p>
              </div>
            )}
          </div>
        </div>

        {/* Alertes */}
        {alerts.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Alertes et notifications
            </h3>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-md ${
                    alert.severity === 'high' ? 'bg-red-50 border border-red-200' :
                    alert.severity === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <p className={`text-sm ${
                    alert.severity === 'high' ? 'text-red-800' :
                    alert.severity === 'medium' ? 'text-yellow-800' :
                    'text-blue-800'
                  }`}>
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
