import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Receipt } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category_name?: string;
  category_color?: string;
  date: string;
  type: 'recurring' | 'one-time';
  receipt_path?: string;
}

const ExpensesList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [selectedCategory, selectedMonth, selectedYear]);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/expenses';
      const params = new URLSearchParams();

      if (selectedMonth && selectedYear) {
        params.append('month', selectedMonth.toString());
        params.append('year', selectedYear.toString());
      }

      if (selectedCategory) {
        params.append('category_id', selectedCategory);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get<Expense[]>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des dépenses:', error);
      toast.error('Erreur lors du chargement des dépenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<Category[]>('/api/categories?type=expense', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Dépense supprimée avec succès');
      fetchExpenses();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MGA'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1];
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h1 className="text-3xl font-bold text-gray-900">Mes Dépenses</h1>
              <p className="text-gray-600 mt-2">
                Gérez et suivez toutes vos dépenses
              </p>
            </div>
            <Link
              to="/expenses/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle dépense
            </Link>
          </div>
        </div>
        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Catégorie */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {/* Mois */}
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
            {/* Année */}
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
        {/* Liste des dépenses */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucune dépense trouvée</p>
              <p className="text-gray-400 mt-2">
                Commencez par ajouter votre première dépense
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {expense.receipt_path ? (
                              <Receipt className="h-8 w-8 text-blue-500" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs text-gray-500">€</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {expense.description}
                            </div>
                            {expense.receipt_path && (
                              <div className="text-sm text-gray-500">
                                Reçu disponible
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(expense.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {expense.category_name && (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${expense.category_color}20`,
                              color: expense.category_color
                            }}
                          >
                            {expense.category_name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expense.type === 'recurring'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {expense.type === 'recurring' ? 'Récurrente' : 'Ponctuelle'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/expenses/edit/${expense.id}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Résumé */}
        {filteredExpenses.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Total des dépenses affichées : {filteredExpenses.length}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0))}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesList;
