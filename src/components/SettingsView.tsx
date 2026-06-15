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
  Globe 
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Tous les champs de sécurité sont obligatoires.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
      return;
    }

    if (newPassword.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    try {
      setIsLoading(true);
      // We leverage the resetPassword api endpoint but pass our current self-target
      await api.users.resetPassword(currentUser.id, newPassword);
      setSuccess("Votre mot de passe personnel a été mis à jour avec succès.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "La mise à jour de sécurité a échoué.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-xs animate-fade-in">
      {/* Left Profile Panel */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs space-y-4">
        <div className="text-center pb-4 border-b border-gray-100 space-y-2">
          <div className="h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto shadow-sm">
            {currentUser.prenom[0]}{currentUser.nom[0]}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{currentUser.prenom} {currentUser.nom}</h3>
            <p className="text-[11px] text-gray-400 font-mono">@{currentUser.username}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Niveau d'Accompagnement</span>
            <div className="flex items-center gap-1.5 font-bold text-gray-800">
              <ShieldAlert className="h-4 w-4 text-indigo-600" />
              {currentUser.role}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Courriel enregistré</span>
            <p className="font-semibold text-gray-800">{currentUser.email || "Non spécifiée"}</p>
          </div>
        </div>
      </div>

      {/* Right Password Update Panel */}
      <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
          <Lock className="h-4 w-4 text-indigo-600" />
          Modifier Votre Mot de Passe Personnel
        </h3>

        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg p-3 text-emerald-850 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3 text-red-850 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1 relative">
            <label className="font-bold text-gray-700">Mot de passe actuel</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold focus:outline-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="font-bold text-gray-700">Nouveau mot de passe</label>
              <input
                type={showPwd ? "text" : "password"}
                required
                placeholder="Minimum 4 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold focus:outline-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-7 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                required
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-50">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Enregistrement..." : "Appliquer le nouveau mot de passe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
