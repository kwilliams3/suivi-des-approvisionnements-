import React, { useState } from "react";
import { api } from "../services/api";
import { 
  Settings, 
  User, 
  Lock, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Globe,
  Mail,
  Key,
  Sparkles,
  Shield,
  Fingerprint,
  AlertCircle
} from "lucide-react";

interface SettingsViewProps {
  currentUser: {
    id: string;
    username: string;
    role: "Administrateur" | "Utilisateur";
    nom: string;
    prenom: string;
    email: string;
  };
}

export default function SettingsView({ currentUser }: SettingsViewProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showPwd, setShowPwd] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 4) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    checkPasswordStrength(value);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    try {
      setIsLoading(true);
      await api.users.resetPassword(currentUser.id, newPassword);
      setSuccess("Votre mot de passe a été mis à jour avec succès.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStrength(0);
    } catch (err: any) {
      setError(err.message || "La mise à jour a échoué.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength === 0) return "bg-gray-200";
    if (passwordStrength === 1) return "bg-red-500";
    if (passwordStrength === 2) return "bg-orange-500";
    if (passwordStrength === 3) return "bg-yellow-500";
    if (passwordStrength === 4) return "bg-green-500";
    return "bg-emerald-500";
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength === 1) return "Très faible";
    if (passwordStrength === 2) return "Faible";
    if (passwordStrength === 3) return "Moyen";
    if (passwordStrength === 4) return "Fort";
    return "Très fort";
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative p-6 text-white">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Paramètres du compte
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-1">Paramètres de sécurité</h1>
              <p className="text-sm text-white/80">
                Gérez vos informations personnelles et votre mot de passe
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Shield className="h-3 w-3" />
              <span className="text-xs font-medium">{currentUser.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte Profil */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
            {/* Bannière décorative */}
            <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                <div className="h-24 w-24 bg-white rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
                  <div className="h-20 w-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                    {currentUser.prenom[0]}{currentUser.nom[0]}
                  </div>
                </div>
              </div>
            </div>

            {/* Informations utilisateur */}
            <div className="pt-16 pb-6 px-6 text-center">
              <h3 className="font-bold text-gray-900 text-lg mb-1">{currentUser.prenom} {currentUser.nom}</h3>
              <p className="text-sm text-gray-500 font-mono mb-4">@{currentUser.username}</p>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-full mb-6">
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-700">{currentUser.role}</span>
              </div>

              <div className="space-y-3 text-left border-t border-gray-100 pt-4">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carte Changement de mot de passe */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-md">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Modifier le mot de passe</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Choisissez un mot de passe sécurisé pour protéger votre compte</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Alertes */}
              {success && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">Succès !</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{success}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800 text-sm">Erreur</p>
                    <p className="text-xs text-red-700 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-5">
                {/* Ancien mot de passe */}
                <div>
                  <label className="font-bold text-gray-700 block mb-2 text-sm flex items-center gap-2">
                    <Key className="h-4 w-4 text-indigo-600" />
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Entrez votre mot de passe actuel"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
                  />
                </div>

                {/* Nouveau mot de passe */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="font-bold text-gray-700 block mb-2 text-sm">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        required
                        placeholder="Minimum 4 caractères"
                        value={newPassword}
                        onChange={handlePasswordChange}
                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {/* Indicateur de force du mot de passe */}
                    {newPassword.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getStrengthColor()} transition-all duration-300 rounded-full`}
                              style={{ width: `${(passwordStrength / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-medium text-gray-600">{getStrengthText()}</span>
                        </div>
                        <ul className="grid grid-cols-2 gap-1 text-[10px] text-gray-500 mt-2">
                          <li className="flex items-center gap-1">
                            <div className={`h-1 w-1 rounded-full ${newPassword.length >= 4 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            Au moins 4 caractères
                          </li>
                          <li className="flex items-center gap-1">
                            <div className={`h-1 w-1 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            Au moins 8 caractères
                          </li>
                          <li className="flex items-center gap-1">
                            <div className={`h-1 w-1 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            Une majuscule
                          </li>
                          <li className="flex items-center gap-1">
                            <div className={`h-1 w-1 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            Un chiffre
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Confirmation */}
                  <div>
                    <label className="font-bold text-gray-700 block mb-2 text-sm">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Répétez le mot de passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Les mots de passe ne correspondent pas
                      </p>
                    )}
                  </div>
                </div>

                {/* Bouton de soumission */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        Mettre à jour le mot de passe
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Conseils de sécurité */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <Shield className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 mb-1">Conseils de sécurité</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Utilisez un mot de passe unique pour ce compte</li>
                      <li>• Évitez les informations personnelles évidentes</li>
                      <li>• Changez votre mot de passe régulièrement</li>
                      <li>• Ne partagez jamais votre mot de passe</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}