import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Upload, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
}

interface ExpenseFormData {
  amount: string;
  description: string;
  date: string;
  category_id: string;
  type: 'one-time' | 'recurring';
  start_date: string;
  end_date: string;
}

const ExpenseForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    type: 'one-time',
    start_date: '',
    end_date: ''
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    if (isEditing) {
      fetchExpense();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<Category[]>('/api/categories?type=expense', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      toast.error('Erreur lors du chargement des catégories');
    }
  };

  const fetchExpense = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<{
        amount: number;
        description: string;
        date: string;
        category_id: string;
        type: 'one-time' | 'recurring';
        start_date?: string;
        end_date?: string;
        receipt_path?: string;
      }>(`/api/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const expense = response.data;
      setFormData({
        amount: expense.amount.toString(),
        description: expense.description || '',
        date: expense.date,
        category_id: expense.category_id || '',
        type: expense.type || 'one-time',
        start_date: expense.start_date || '',
        end_date: expense.end_date || ''
      });

      if (expense.receipt_path) {
        setCurrentReceipt(expense.receipt_path);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la dépense:', error);
      toast.error('Erreur lors du chargement de la dépense');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 10MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setCurrentReceipt(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.description || !formData.date) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.type === 'recurring' && (!formData.start_date || !formData.end_date)) {
      toast.error('Les dates de début et de fin sont requises pour les dépenses récurrentes');
      return;
    }

    if (formData.type === 'recurring' && new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast.error('La date de début doit être antérieure à la date de fin');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();

      // Ajouter les données du formulaire
      Object.keys(formData).forEach(key => {
        if (formData[key as keyof ExpenseFormData] !== '') {
          submitData.append(key, formData[key as keyof ExpenseFormData]);
        }
      });

      // Ajouter le fichier si sélectionné
      if (selectedFile) {
        submitData.append('receipt', selectedFile);
      }

      if (isEditing) {
        await axios.put(`/api/expenses/${id}`, submitData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Dépense mise à jour avec succès');
      } else {
        await axios.post('/api/expenses', submitData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Dépense créée avec succès');
      }

      navigate('/expenses');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      const message = (error as any).response?.data?.message || 'Erreur lors de la sauvegarde';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/expenses')}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isEditing ? 'Modifiez les informations de votre dépense' : 'Ajoutez une nouvelle dépense à votre suivi'}
              </p>
            </div>
          </div>
        </div>
        {/* Formulaire */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Montant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant * <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  Ar
                </span>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="pl-8 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description * <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Courses alimentaires"
              />
            </div>
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date * <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Type de dépense */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de dépense
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="one-time">Ponctuelle</option>
                <option value="recurring">Récurrente</option>
              </select>
            </div>
            {/* Dates pour les dépenses récurrentes */}
            {formData.type === 'recurring' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début * <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin * <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    required
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
            {/* Upload de reçu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reçu (optionnel)
              </label>
              <div className="space-y-4">
                {/* Fichier actuel */}
                {currentReceipt && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                    <Upload className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">Reçu actuel disponible</span>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {/* Nouveau fichier */}
                <div className="flex items-center space-x-4">
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <Upload className="h-4 w-4 mr-2" />
                    {selectedFile ? selectedFile.name : 'Choisir un fichier'}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Formats acceptés: JPG, PNG, PDF - Max 10MB
                </p>
              </div>
            </div>
            {/* Boutons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;
