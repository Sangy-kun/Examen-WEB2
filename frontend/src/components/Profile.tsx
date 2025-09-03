import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { User, Camera, Save, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  profile_picture?: string;
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editing, setEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<{ username: string; email: string }>({
    username: '',
    email: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token pour profil:', token ? 'Présent' : 'Absent');

      const response = await axios.get<UserProfile>('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Réponse profil:', response.data);
      setUser(response.data);
      setFormData({
        username: response.data.username || '',
        email: response.data.email || ''
      });

      if (response.data.profile_picture) {
        const pictureUrl = response.data.profile_picture.startsWith('http')
          ? response.data.profile_picture
          : `http://localhost:5000${response.data.profile_picture}`;
        console.log('URL photo profil:', pictureUrl);
        setProfilePicture(pictureUrl);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      console.error('Détails erreur:', (error as any).response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 5MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Mettre à jour les informations du profil
      if (editing) {
        await axios.put('/api/profile', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Profil mis à jour avec succès');
        setEditing(false);
      }

      // Upload de la photo de profil
      if (selectedFile) {
        const formDataFile = new FormData();
        formDataFile.append('picture', selectedFile);

        await axios.post('/api/profile/picture', formDataFile, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        toast.success('Photo de profil mise à jour');
        setSelectedFile(null);
        fetchProfile(); // Recharger le profil
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error((error as any).response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-600 mt-2">Gérez vos informations personnelles</p>
        </div>

        {/* Photo de profil */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo de profil</h3>

          <div className="flex items-center space-x-6">
            <div className="relative">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Photo de profil"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}

              <label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                <Camera className="h-4 w-4" />
              </label>
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div>
              <p className="text-sm text-gray-600">
                Cliquez sur l'icône pour changer votre photo
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Formats acceptés: JPG, PNG - Max 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Informations du profil */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Informations personnelles</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {editing ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Nom d'utilisateur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
              >
                Déconnexion
              </button>

              {editing && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Sauvegarder</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
