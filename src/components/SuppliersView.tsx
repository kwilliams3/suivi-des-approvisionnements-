import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { 
  Building2, 
  Layers,
  MapPin,
  Plus, 
  Trash2, 
  X, 
  Search,
  FilterX,
  ShieldAlert
} from "lucide-react";

interface SuppliersViewProps {
  currentUser: any;
}

type ManagementTab = "Services" | "Agences";

export default function SuppliersView({ currentUser }: SuppliersViewProps) {
  // Tabs State
  const [activeSubTab, setActiveSubTab] = useState<ManagementTab>("Services");

  // Data lists state
  const [services, setServices] = useState<string[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search filters
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ManagementTab>("Services");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [servicesData, agenciesData] = await Promise.all([
        api.services.getAll(),
        api.agencies.getAll()
      ]);
      setServices(servicesData);
      setAgencies(agenciesData);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement des données.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const handleOpenCreateInput = (type: ManagementTab) => {
    setModalType(type);
    setFieldName("");
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fieldName.trim();
    if (!trimmed) {
      setFormError(`Le nom du ${modalType === "Services" ? "service" : "de l'agence"} est obligatoire.`);
      return;
    }

    try {
      if (modalType === "Services") {
        const updated = await api.services.create(trimmed);
        setServices(updated);
        flashSuccess(`Le service émetteur "${trimmed}" a été créé avec succès.`);
      } else {
        const updated = await api.agencies.create(trimmed);
        setAgencies(updated);
        flashSuccess(`L'agence fournisseur "${trimmed}" a été créée avec succès.`);
      }
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || "Impossible d'ajouter cet élément.");
    }
  };

  const handleDeleteItem = async (name: string, type: ManagementTab) => {
    if (currentUser.role !== "Administrateur") {
      alert("Droits administrateur requis pour supprimer des éléments.");
      return;
    }

    const typeLabel = type === "Services" ? "le service émetteur" : "l'agence fournisseur";
    if (window.confirm(`Désirez-vous supprimer définitivement ${typeLabel} "${name}" ?`)) {
      try {
        if (type === "Services") {
          const updated = await api.services.delete(name);
          setServices(updated);
          flashSuccess(`Le service "${name}" a été supprimé.`);
        } else {
          const updated = await api.agencies.delete(name);
          setAgencies(updated);
          flashSuccess(`L'agence "${name}" a été supprimée.`);
        }
      } catch (err: any) {
        alert(err.message || "Erreur lors de la suppression.");
      }
    }
  };

  // Get content list based on active tab
  const currentItems = activeSubTab === "Services" ? services : agencies;

  // Filter list
  const filteredItems = currentItems.filter((item) => {
    if (searchQuery && !item.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title & Stats */}
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          Configuration de l'Organisation
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Gérez séparément les services internes (émetteurs de besoins) et les agences physiques (destinations d'approvisionnement).
        </p>
      </div>

      {/* Tabs list switch & Add button alignment */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-xs">
        <div className="flex gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveSubTab("Services");
              setSearchQuery("");
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === "Services"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Layers className="h-4 w-4" />
            Services Émetteurs ({services.length})
          </button>
          <button
            onClick={() => {
              setActiveSubTab("Agences");
              setSearchQuery("");
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === "Agences"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <MapPin className="h-4 w-4" />
            Agences Fournisseurs ({agencies.length})
          </button>
        </div>

        {/* Dynamic add button according to active tab */}
        <button
          onClick={() => handleOpenCreateInput(activeSubTab)}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
        >
          <Plus className="h-4 w-4" /> 
          {activeSubTab === "Services" ? "Créer un Service" : "Ajouter une Agence"}
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg p-3 text-xs font-semibold text-emerald-800 shadow-sm animate-fade-in">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3 text-xs font-semibold text-red-800 shadow-sm animate-fade-in flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Searching filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs flex flex-col sm:flex-row gap-3 text-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder={activeSubTab === "Services" ? "Rechercher un service émetteur..." : "Rechercher une agence fournisseur..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-indigo-500"
          />
        </div>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition text-[11px] font-bold"
          >
            <FilterX className="h-3.5 w-3.5" />
            Effacer
          </button>
        )}
      </div>

      {/* Primary Data List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <MapPin className="h-8 w-8 text-gray-300 mx-auto" />
            <p className="text-xs text-gray-400 font-medium">
              Aucun {activeSubTab === "Services" ? "service" : "aucune agence"} ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-5">Libellé</th>
                  <th className="py-3.5 px-5 text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                    <td className="py-4 px-5 font-semibold text-gray-800 flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${activeSubTab === "Services" ? "bg-indigo-500" : "bg-emerald-500"}`}></div>
                      <span>{item}</span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-2">
                        {currentUser.role === "Administrateur" ? (
                          <button
                            onClick={() => handleDeleteItem(item, activeSubTab)}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-650 p-1.5 rounded-lg transition cursor-pointer"
                            title={`Supprimer ${activeSubTab === "Services" ? "ce service" : "cette agence"}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-450 italic font-medium">Admin requis</span>
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

      {/* CREATE MODAL DIALOG */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                {modalType === "Services" ? <Layers className="h-4 w-4 text-indigo-600" /> : <MapPin className="h-4 w-4 text-emerald-600" />}
                {modalType === "Services" ? "Nouveau Service Émetteur" : "Nouvelle Agence Fournisseur"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 text-red-800 text-[11px] font-bold p-2.5 rounded-lg border-l-4 border-red-500 animate-shake">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">
                  {modalType === "Services" ? "Nom du service émetteur *" : "Nom de l'agence fournisseur *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalType === "Services" ? "Ex: RH, Comptabilité, Logistique..." : "Ex: Agence de Douala, Yaoundé..."}
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:outline-indigo-500 font-medium placeholder-gray-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg shadow-xs cursor-pointer transition"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
