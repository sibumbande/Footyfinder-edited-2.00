
import React, { useState, useRef } from 'react';
import { Camera, User, Calendar, Activity, CreditCard, ChevronRight, History, Mail, Lock, AtSign } from 'lucide-react';
import { PlayerPosition, FitnessLevel, UserProfileData } from '../../../types';
import { register, ApiError } from '../../../frontend/api';

interface CreateProfileProps {
  onProfileCreated: (user: { id: string; email: string; username: string; fullName: string; position: string | null; fitnessLevel: string | null; city: string | null }) => void;
  onCancel: () => void;
}

export const CreateProfile: React.FC<CreateProfileProps> = ({ onProfileCreated, onCancel }) => {
  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // STATE VARIABLES
  const [formData, setFormData] = useState<UserProfileData>({
    id: '',
    fullName: '',
    dateOfBirth: '',
    position: '',
    fitnessLevel: '',
    yearsPlaying: 0,
    facePhoto: null,
    idPhoto: null,
    facePhotoPreview: undefined,
    idPhotoPreview: undefined,
    wallet: { balance: 0, escrow: 0, transactions: [] },
    stats: { goals: 0, assists: 0, matchesPlayed: 0 },
    avatar: '',
    friends: []
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const faceInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'yearsPlaying' ? parseInt(value) || 0 : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'facePhoto' | 'idPhoto') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);

      setFormData(prev => ({
        ...prev,
        [field]: file,
        [`${field}Preview`]: previewUrl
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !username || !formData.fullName || !formData.position || !formData.fitnessLevel) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!formData.facePhoto) {
      setError('A face photo (selfie) is required for identity verification.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // Convert face photo to base64 data URL for storage as avatar
      const avatarBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(formData.facePhoto!);
      });

      const user = await register({
        email,
        password,
        fullName: formData.fullName,
        username,
        position: formData.position || undefined,
        fitnessLevel: formData.fitnessLevel || undefined,
        avatarBase64,
        dateOfBirth: formData.dateOfBirth || undefined,
        yearsPlaying: formData.yearsPlaying,
      });
      onProfileCreated(user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate experience options 0-80
  const experienceOptions = Array.from({ length: 81 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Create Player Profile</h1>
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800">
            Cancel
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full p-6 pb-24">
        <form onSubmit={handleSubmit} className="space-y-8">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Account Details */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Account Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="player@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="siya_k"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Min 6 characters"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Identity Verification */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Identity Verification
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Face Photo (Selfie) <span className="text-red-500">*</span></label>
                <div
                  className={`relative aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${formData.facePhotoPreview ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                  onClick={() => faceInputRef.current?.click()}
                >
                  {formData.facePhotoPreview ? (
                    <img src={formData.facePhotoPreview} alt="Face" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <User className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">Tap to upload</span>
                    </>
                  )}
                  <input type="file" ref={faceInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'facePhoto')} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Gov ID / Passport</label>
                <div
                  className={`relative aspect-video sm:aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${formData.idPhotoPreview ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                  onClick={() => idInputRef.current?.click()}
                >
                  {formData.idPhotoPreview ? (
                    <img src={formData.idPhotoPreview} alt="ID" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <CreditCard className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">Tap to upload ID</span>
                    </>
                  )}
                  <input type="file" ref={idInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'idPhoto')} />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Personal Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Siya Kolisi"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Football Experience & Stats */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Football Experience
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <History size={14} className="text-gray-400" />
                How many years have you been playing soccer?
              </label>
              <select
                name="yearsPlaying"
                value={formData.yearsPlaying}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none cursor-pointer"
                disabled={loading}
              >
                {experienceOptions.map((years) => (
                  <option key={years} value={years}>
                    {years} {years === 1 ? 'year' : 'years'}
                  </option>
                ))}
              </select>
              {formData.yearsPlaying <= 2 && formData.yearsPlaying > 0 && (
                <p className="mt-2 text-xs text-blue-600 font-medium">
                  You'll be tagged as a "Beginner" to help find suitable matches.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Position</label>
              <select
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                disabled={loading}
              >
                <option value="">Select Position</option>
                {Object.values(PlayerPosition).map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fitness Level</label>
              <div className="grid grid-cols-1 gap-3">
                {Object.values(FitnessLevel).map((level) => (
                  <label
                    key={level}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${formData.fitnessLevel === level ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'} ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span className="text-sm font-medium text-gray-700">{level}</span>
                    <input type="radio" name="fitnessLevel" value={level} checked={formData.fitnessLevel === level} onChange={handleInputChange} className="w-4 h-4 text-blue-600" disabled={loading} />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg"
          >
            {loading ? 'Creating Profile...' : 'Complete Profile'}
            {!loading && <ChevronRight size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};
