import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { User } from "../types";
import { 
  UserPlus, 
  Users, 
  Key, 
  Shield, 
  Ban, 
  Check, 
  X, 
  Edit3, 
  Mail, 
  UserCheck2,
  Lock,
  Trash2
} from "lucide-react";

interface UsersViewProps {
  currentUser: {
    id: string;
    username: string;
    role: "Administrateur" | "Utilisateur";
    nom: string;
    prenom: string;
  };
}

export default function UsersView({ currentUser }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
 
  // Form Fields
  const [fieldNom, setFieldNom] = useState("");
  const [fieldPrenom, setFieldPrenom] = useState("");
  const [fieldEmail, setFieldEmail] = useState("");
  const [fieldUsername, setFieldUsername] = useState("");
  const [fieldPassword, setFieldPassword] = useState("");
  const [fieldRole, setFieldRole] = useState<"Administrateur" | "Utilisateur">("Utilisateur");
  const [fieldService, setFieldService] = useState("");
 
  // Reset password states
  const [showResetModal, setShowResetModal] = useState(false);
  const [userForReset, setUserForReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
 
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const [usersData, servicesData] = await Promise.all([
        api.users.getAll(),
        api.services.getAll()
      ]);
      setUsers(usersData);
      setServices(servicesData);
    } catch (err: any) {
      setError(err.message || "Accès interdit ou indisponibilité du serveur");
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => {
    // Strictly restrict view access in client too
    if (currentUser.role !== "Administrateur") {
      setError("Accès refusé. Vous devez être administrateur pour consulter cette section.");
      setIsLoading(false);
      return;
    }
    loadUsers();
  }, [currentUser]);
 
  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };
 
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFieldNom("");
    setFieldPrenom("");
    setFieldEmail("");
    setFieldUsername("");
    setFieldPassword("");
    setFieldRole("Utilisateur");
    setFieldService("");
    setFormError(null);
    setShowModal(true);
  };
 
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFieldNom(user.Nom);
    setFieldPrenom(user.Prenom);
    setFieldEmail(user.Email || "");
    setFieldUsername(user.NomUtilisateur);
    setFieldPassword(""); // Do not fill password in edit form
    setFieldRole(user.Role);
    setFieldService(user.Service || "");
    setFormError(null);
    setShowModal(true);
  };
 
  const handleOpenResetPassword = (user: User) => {
    setUserForReset(user);
    setNewPassword("");
    setResetError(null);
    setShowResetModal(true);
  };
 
  // Submit create/edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
 
    if (!fieldNom.trim()) return setFormError("Le nom est requis.");
    if (!fieldPrenom.trim()) return setFormError("Le prénom est requis.");
    if (!fieldUsername.trim()) return setFormError("Le nom d'utilisateur est requis.");
    if (!editingUser && !fieldPassword) return setFormError("Mod de passe obligatoire à la création.");
 
    const finalService = fieldRole === "Administrateur" ? "" : fieldService;
    if (fieldRole === "Utilisateur" && !finalService) {
      return setFormError("Le service est obligatoire pour un utilisateur standard.");
    }

    try {
      if (editingUser) {
        // Edit contact parameters
        await api.users.update(editingUser.Id, {
          Nom: fieldNom,
          Prenom: fieldPrenom,
          Email: fieldEmail,
          Role: fieldRole,
          Service: finalService
        });
        flashSuccess(`Le compte de ${fieldPrenom} ${fieldNom} a été mis à jour.`);
      } else {
        // Create full user
        await api.users.create({
          Nom: fieldNom,
          Prenom: fieldPrenom,
          Email: fieldEmail,
          NomUtilisateur: fieldUsername.trim().toLowerCase(),
          MotDePasse: fieldPassword,
          Role: fieldRole,
          Service: finalService
        });
        flashSuccess(`Compte utilisateur '${fieldUsername}' créé avec succès.`);
      }
 
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      setFormError(err.message || "L'enregistrement a échoué");
    }
  };

  // Submit manual password reset
  const handleSubmitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForReset) return;
    if (!newPassword || newPassword.trim().length === 0) {
      setResetError("Veuillez saisir un mot de passe valide.");
      return;
    }

    try {
      await api.users.resetPassword(userForReset.Id, newPassword);
      flashSuccess(`Le mot de passe de ${userForReset.NomUtilisateur} a été réinitialisé.`);
      setShowResetModal(false);
    } catch (err: any) {
      setResetError(err.message || "Erreur de réinitialisation");
    }
  };

  // Toggle user active/inactive state
  const handleToggleState = async (user: User) => {
    if (user.Id === currentUser.id) {
      alert("Erreur de protection : Vous ne pouvez pas désactiver votre propre compte.");
      return;
    }

    const nextStatut = user.Statut === "Actif" ? "Desactive" : "Actif";
    try {
      await api.users.update(user.Id, { Statut: nextStatut });
      flashSuccess(`Le compte de ${user.NomUtilisateur} est maintenant ${nextStatut === "Actif" ? "Actif" : "Désactivé"}.`);
      loadUsers();
    } catch (err: any) {
      alert(err.message || "Action refusée");
    }
  };

  // Delete user account
  const handleDeleteUser = async (user: User) => {
    if (user.Id === currentUser.id) {
      alert("Erreur de protection : Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    if (user.Id === "u-admin") {
      alert("Erreur de protection : Le compte administrateur racine (u-admin) ne peut pas être supprimé.");
      return;
    }

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${user.Prenom} ${user.Nom} (${user.NomUtilisateur}) ?`)) {
      try {
        await api.users.delete(user.Id);
        flashSuccess(`Le compte utilisateur de ${user.Prenom} ${user.Nom} a été supprimé avec succès.`);
        loadUsers();
      } catch (err: any) {
        alert(err.message || "La suppression a échoué.");
      }
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-5 text-sm text-red-800 space-y-2 max-w-2xl mx-auto mt-12">
        <h4 className="font-bold flex items-center gap-2">
          <Ban className="h-5 w-5" /> Accès Refusé
        </h4>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5.5 w-5.5 text-indigo-600" />
            Administration des Comptes Utilisateurs
          </h2>
          <p className="text-xs text-gray-500">Créez, modifiez, désactivez les comptes corporatifs et réinitialisez leurs identifiants de connexion.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" /> Nouvel Arbitre / Utilisateur
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg p-3 text-xs font-bold text-emerald-800 shadow-xs animate-fade-in">
          {success}
        </div>
      )}

      {/* Users table registry */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-400 font-bold uppercase">
                  <th className="py-3 px-4">Utilisateur (Nom complet)</th>
                  <th className="py-3 px-4">Identifiant</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Courriel</th>
                  <th className="py-3 px-4">Niveau d'Accès</th>
                  <th className="py-3 px-4">Date de Création</th>
                  <th className="py-3 px-4">État d'activité</th>
                  <th className="py-3 px-4 text-center">Modifications</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.Id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {item.Prenom} {item.Nom}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-700">
                      {item.NomUtilisateur}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700">
                      {item.Service || <span className="text-gray-400 italic text-[11px] font-normal">Aucun</span>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-650 font-medium">
                      {item.Email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {item.Email}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        item.Role === "Administrateur" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        <Shield className="h-3 w-3" />
                        {item.Role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {new Date(item.DateCreation).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleState(item)}
                        title="Inverser l'état du compte"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          item.Statut === "Actif" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${item.Statut === "Actif" ? "bg-emerald-500" : "bg-red-500"}`}></span>
                        {item.Statut === "Actif" ? "Actif" : "Désactivé"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Modifier les coordonnées"
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600 transition cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenResetPassword(item)}
                          title="Réinitialiser le mot de passe"
                          className="p-1 rounded hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        {item.Id !== currentUser.id && item.Id !== "u-admin" && (
                          <button
                            onClick={() => handleDeleteUser(item)}
                            title="Supprimer l'utilisateur"
                            className="p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-650 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT ACCOUNT DIALOG */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 max-w-md w-full p-6 space-y-4 animate-fade-in text-xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm">
                {editingUser ? `Modifier les accès: ${editingUser.NomUtilisateur}` : "Créer un Nouvelle Fiche Utilisateur"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-650"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 text-red-800 font-bold p-3 rounded-lg border-l-4 border-red-500">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Prénom *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jean"
                    value={fieldPrenom}
                    onChange={(e) => setFieldPrenom(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800 focus:outline-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dupont"
                    value={fieldNom}
                    onChange={(e) => setFieldNom(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800 focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Adresse Mail (Optionnelle)</label>
                <input
                  type="email"
                  placeholder="exemple@entreprise.com"
                  value={fieldEmail}
                  onChange={(e) => setFieldEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800 focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Code Identifiant (Login) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    placeholder="Ex: jdupont"
                    value={fieldUsername}
                    onChange={(e) => setFieldUsername(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800 focus:outline-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Rôle / Permission *</label>
                  <select
                    value={fieldRole}
                    onChange={(e) => {
                      const newRole = e.target.value as any;
                      setFieldRole(newRole);
                      if (newRole === "Administrateur") {
                        setFieldService("");
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800 focus:outline-indigo-500"
                  >
                    <option value="Utilisateur">Utilisateur standard</option>
                    <option value="Administrateur">Administrateur système</option>
                  </select>
                </div>
              </div>

              {fieldRole === "Utilisateur" ? (
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Service associé *</label>
                  <select
                    required
                    value={fieldService}
                    onChange={(e) => setFieldService(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-semibold text-gray-800 focus:outline-indigo-500 font-bold"
                  >
                    <option value="">-- Choisir un service émetteur --</option>
                    {services.map((ser) => (
                      <option key={ser} value={ser}>
                        {ser}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1 bg-indigo-50/40 border border-indigo-100 rounded-lg p-3 text-[11px] text-gray-600 font-medium select-none">
                  <span className="font-bold text-indigo-900 block mb-0.5">Service associé non requis</span>
                  <span>Les comptes ayant le rôle <strong>Administrateur système</strong> disposent d'un accès global de supervision et ne sont pas restreints ou rattachés à un service émetteur spécifique.</span>
                </div>
              )}

              {!editingUser && (
                <div className="space-y-1 bg-indigo-50/20 border border-indigo-50 rounded-lg p-3">
                  <label className="font-bold text-indigo-950 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-indigo-600" />
                    Attribuer un mot de passe initial *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={fieldPassword}
                    onChange={(e) => setFieldPassword(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-800 font-bold focus:outline-indigo-500 mt-1"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-100 text-gray-700 font-bold px-3 py-1.5 rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-1.5 rounded shadow-xs"
                >
                  {editingUser ? "Appliquer" : "Enregistrer l'accès"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET SUB-MODAL */}
      {showResetModal && userForReset && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 max-w-sm w-full p-5 space-y-4 animate-fade-in text-xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-indigo-600" /> Réinitialiser mot de passe
              </h3>
              <button 
                onClick={() => setShowResetModal(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-500">
              Saisissez le nouveau mot de passe de l'utilisateur : <strong>{userForReset.NomUtilisateur}</strong>
            </p>

            {resetError && (
              <div className="bg-red-50 text-red-800 font-bold p-2 text-xs rounded border-l-2 border-red-500">
                {resetError}
              </div>
            )}

            <form onSubmit={handleSubmitReset} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Nouveau Mot de Passe *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-bold text-gray-800 focus:outline-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="bg-gray-100 text-gray-700 font-bold px-3 py-1.5 rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-bold px-4 py-1.5 rounded"
                >
                  Réinitialiser maintenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
