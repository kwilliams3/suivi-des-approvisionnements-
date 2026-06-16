import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Order, Supplier } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  Calendar, 
  SlidersHorizontal, 
  X, 
  Info, 
  Sparkles, 
  Activity, 
  ToggleLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  User as UserIcon,
  ShoppingBag,
  FileText,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Building,
  Package,
  Truck,
  AlertCircle,
  CheckCircle2,
  Database,
  Hash,
  Users,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { exportToCSV, exportToPDF } from "../utils/exportUtils";

interface ArchivesViewProps {
  currentUser: any;
}

export default function ArchivesView({ currentUser }: ArchivesViewProps) {
  const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Archive config states
  const [autoDays, setAutoDays] = useState(30);
  const [isAutoEnabled, setIsAutoEnabled] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Detail Modal States
  const [selectedDetailedOrder, setSelectedDetailedOrder] = useState<Order | null>(null);
  const [detailedOrderHistory, setDetailedOrderHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [archivesData, suppliersData, servicesData, agenciesData, configData] = await Promise.all([
        api.orders.getAll(true),
        api.suppliers.getAll(),
        api.services.getAll(),
        api.agencies.getAll(),
        api.archiveConfig.get()
      ]);
      setArchivedOrders(archivesData);
      setSuppliers(suppliersData);
      setServices(servicesData);
      setAgencies(agenciesData);
      setAutoDays(configData.autoArchiveDays);
      setIsAutoEnabled(configData.enableAutoArchive);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement des archives");
      console.error("Erreur de chargement des archives", err);
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

  const handleOpenDetailModal = async (order: Order) => {
    setSelectedDetailedOrder(order);
    setIsHistoryLoading(true);
    try {
      const data = await api.orders.getHistory(order.Id);
      setDetailedOrderHistory(data.history || []);
    } catch (err) {
      console.error("Impossible de récupérer l'historique", err);
      setDetailedOrderHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleRestore = async (order: Order) => {
    if (currentUser.role !== "Administrateur") {
      alert("Droits administrateur requis.");
      return;
    }

    try {
      await api.orders.restore(order.Id);
      flashSuccess(`Commande ${order.NoBonCommande} restaurée.`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Action échouée");
    }
  };

  const handlePermanentDelete = async (order: Order) => {
    if (currentUser.role !== "Administrateur") {
      alert("Droits administrateur requis.");
      return;
    }

    if (window.confirm(`Supprimer définitivement la commande ${order.NoBonCommande} ? Cette action est irréversible.`)) {
      try {
        await api.orders.delete(order.Id);
        flashSuccess(`Commande ${order.NoBonCommande} supprimée.`);
        loadData();
      } catch (err: any) {
        alert(err.message || "Erreur lors de la suppression");
      }
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== "Administrateur") {
      alert("Seul l'administrateur peut modifier cette configuration.");
      return;
    }

    try {
      await api.archiveConfig.update({
        autoArchiveDays: autoDays,
        enableAutoArchive: isAutoEnabled
      });
      flashSuccess("Configuration d'archivage mise à jour.");
      setShowConfig(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erreur de configuration");
    }
  };

  // Extraire la liste des utilisateurs uniques des commandes
  const getUniqueUsers = (orders: Order[]) => {
    const usersSet = new Set<string>();
    orders.forEach(order => {
      if (order.CreePar) usersSet.add(order.CreePar);
      if (order.DemandePar) usersSet.add(order.DemandePar);
    });
    return Array.from(usersSet).sort();
  };

  // Filtrer les archives
  const filteredArchives = archivedOrders.filter((cmd) => {
    // Recherche par texte
    if (searchTerm.trim()) {
      const st = searchTerm.toLowerCase();
      const matchBC = (cmd.NoBonCommande || "").toLowerCase().includes(st);
      const matchDS = (cmd.NoDS || "").toLowerCase().includes(st);
      const matchDes = (cmd.Designation || "").toLowerCase().includes(st);
      const matchFour = (cmd.Fournisseur || "").toLowerCase().includes(st);
      if (!matchBC && !matchDS && !matchDes && !matchFour) return false;
    }

    // Filtre par utilisateur
    if (filterUser) {
      const creator = (cmd.CreePar || cmd.DemandePar || "").toLowerCase();
      if (creator !== filterUser.toLowerCase()) return false;
    }

    return true;
  });

  const uniqueUsers = getUniqueUsers(archivedOrders);

  // Pagination
  const totalPages = Math.ceil(filteredArchives.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedData = filteredArchives.slice(indexOfFirstItem, indexOfLastItem);

  // Changement de page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterUser]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterUser("");
    setCurrentPage(1);
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
                  <Archive className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Module d'archivage
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-1">Archives des Commandes</h1>
              <p className="text-sm text-white/80">
                Consultez l'historique complet des commandes clôturées
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <ShieldCheck className="h-3 w-3" />
              <span className="text-xs font-medium">{currentUser.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 bg-indigo-600 rounded-full"></div>
          <p className="text-sm text-gray-600">
            {filteredArchives.length} commande{filteredArchives.length > 1 ? 's' : ''} archivée{filteredArchives.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCSV(paginatedData, "Archives_Commandes")}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> CSV
          </button>
          <button
            onClick={() => exportToPDF(paginatedData, "Archives des Commandes")}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
          >
            <FileText className="h-4 w-4 text-red-500" /> PDF
          </button>
          {currentUser.role === "Administrateur" && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Configuration
              {showConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Alertes */}
      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800 text-sm">Succès !</p>
            <p className="text-xs text-emerald-700 mt-0.5">{success}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Erreur</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      <AnimatePresence>
        {showConfig && currentUser.role === "Administrateur" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSaveConfig} className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border border-indigo-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-bold text-gray-800">Politique d'archivage automatique</h3>
                  <p className="text-xs text-gray-500">Configurez les règles d'archivage automatique des commandes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoEnabled}
                      onChange={(e) => setIsAutoEnabled(e.target.checked)}
                      className="rounded-lg text-indigo-600 h-4 w-4"
                    />
                    <span className="font-medium text-gray-700">Activer l'archivage automatique</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-7">
                    Les commandes livrées seront automatiquement déplacées vers les archives après le délai configuré.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-gray-700 block">Délai d'archivage (jours)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      required
                      value={autoDays}
                      onChange={(e) => setAutoDays(Number(e.target.value))}
                      disabled={!isAutoEnabled}
                      className="w-28 bg-white border-2 border-gray-200 rounded-xl p-2.5 font-bold text-gray-800 text-center focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100"
                    />
                    <span className="text-sm text-gray-600">jours après la livraison</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-indigo-200">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-5 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-200 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl shadow-md transition-all transform hover:scale-105"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 flex items-start gap-3 border border-blue-100">
        <div className="p-2 bg-indigo-100 rounded-xl">
          <Info className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="font-bold text-gray-800 text-sm mb-1">À propos des archives</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            Les commandes archivées sont retirées du registre principal pour optimiser les performances tout en préservant 
            l'intégralité des données. Vous pouvez à tout moment les restaurer ou les consulter via ce module.
          </p>
        </div>
      </div>

      {/* Barre de recherche et filtres simplifiés */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Barre de recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par N° bon, N° DS, désignation ou fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filtre par utilisateur */}
          <div className="relative min-w-[200px]">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">Tous les utilisateurs</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          {/* Bouton réinitialiser */}
          <button 
            onClick={handleClearFilters}
            className="text-xs text-gray-500 hover:text-indigo-600 font-medium px-4 py-2.5 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-1 border border-gray-200 hover:border-indigo-200"
          >
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau des archives */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Chargement des archives...</p>
            </div>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-16">
            <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-700">Aucune archive trouvée</h4>
            <p className="text-xs text-gray-400 mt-1">Ajustez vos filtres ou archivez des commandes depuis le registre principal</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Commande</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Désignation</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Service</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Fournisseur</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Émission</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Archivage</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Statut</th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((cmd, idx) => (
                    <tr key={cmd.Id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 text-sm">{cmd.NoBonCommande}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">DS: {cmd.NoDS}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5">
                          Par: {cmd.CreePar || cmd.DemandePar}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-sm text-gray-700 line-clamp-2" title={cmd.Designation}>{cmd.Designation}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Qté: {cmd.Quantite} u.</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">{cmd.Agence}</span>
                      </td>
                      <td className="py-3 px-4 max-w-[150px]">
                        <span className="inline-block text-xs text-gray-700 truncate" title={cmd.Fournisseur}>{cmd.Fournisseur || "Achat Local"}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(cmd.DateEmission).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-indigo-400" />
                          <span className="text-sm text-indigo-700 font-medium">
                            {cmd.DateArchivage ? new Date(cmd.DateArchivage).toLocaleDateString("fr-FR") : "--"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${
                          cmd.Statut === "Livré" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {cmd.Statut}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetailModal(cmd)}
                            title="Voir les détails"
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {currentUser.role === "Administrateur" && (
                            <>
                              <button
                                onClick={() => handleRestore(cmd)}
                                title="Restaurer"
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(cmd)}
                                title="Supprimer définitivement"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination avec statistiques en bas */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              {/* Statistiques */}
              <div className="text-xs text-gray-500 order-2 sm:order-1">
                <span className="font-semibold text-gray-700">Total: {filteredArchives.length}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span>Page {currentPage}/{totalPages || 1}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span>{paginatedData.length} archive(s) affichée(s)</span>
              </div>

              {/* Navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition ${
                      currentPage === 1 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                              currentPage === page
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        (page === 2 && currentPage > 3) ||
                        (page === totalPages - 1 && currentPage < totalPages - 2)
                      ) {
                        return <span key={page} className="text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition ${
                      currentPage === totalPages 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Carte récapitulative */}
      {!isLoading && filteredArchives.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Database className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total des archives</p>
                <p className="text-2xl font-bold text-indigo-700">{filteredArchives.length}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {filteredArchives.filter(c => c.Statut === "Livré").length} livrées
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Dernière mise à jour: {new Date().toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS */}
      <AnimatePresence>
        {selectedDetailedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white flex justify-between items-center shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Archive className="h-4 w-4 text-indigo-200" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Détails de l'archive</span>
                  </div>
                  <h3 className="text-xl font-bold">{selectedDetailedOrder.NoBonCommande}</h3>
                  <p className="text-sm text-indigo-200 mt-0.5">Archivée le {selectedDetailedOrder.DateArchivage ? new Date(selectedDetailedOrder.DateArchivage).toLocaleDateString("fr-FR") : "--"}</p>
                </div>
                <button
                  onClick={() => setSelectedDetailedOrder(null)}
                  className="p-2 rounded-xl hover:bg-white/10 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Désignation */}
                <div className="bg-indigo-50/30 rounded-2xl p-5 border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Désignation
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{selectedDetailedOrder.Designation}</p>
                </div>

                {/* Grille d'informations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Colonne gauche */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        Identifiants
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-gray-500">N° Bon commande</span>
                          <span className="font-bold text-gray-800">{selectedDetailedOrder.NoBonCommande}</span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-gray-200">
                          <span className="text-gray-500">N° DS</span>
                          <span className="font-mono font-bold text-indigo-700">{selectedDetailedOrder.NoDS}</span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-gray-200">
                          <span className="text-gray-500">Réf. Sage</span>
                          <span className="font-mono text-gray-700">{selectedDetailedOrder.ReferenceSage || "Non spécifiée"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4">
                      <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <Building className="h-4 w-4 text-indigo-600" />
                        Émetteur
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-gray-500">Service</span>
                          <span className="font-bold text-gray-800">{selectedDetailedOrder.Agence}</span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-gray-200">
                          <span className="text-gray-500">Créé par</span>
                          <span className="font-medium text-gray-700">{selectedDetailedOrder.CreePar || selectedDetailedOrder.DemandePar}</span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-gray-200">
                          <span className="text-gray-500">Quantité</span>
                          <span className="font-bold text-gray-900">{selectedDetailedOrder.Quantite} unité(s)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Colonne droite */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        Calendrier
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-gray-500">Date d'émission</span>
                          <span className="font-medium text-gray-700">{new Date(selectedDetailedOrder.DateEmission).toLocaleDateString("fr-FR")}</span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-gray-200">
                          <span className="text-gray-500">Livraison prévue</span>
                          <span className="font-medium text-gray-700">{new Date(selectedDetailedOrder.DateLivraison).toLocaleDateString("fr-FR")}</span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-gray-200">
                          <span className="text-gray-500">Date d'archivage</span>
                          <span className="font-bold text-indigo-700">{selectedDetailedOrder.DateArchivage ? new Date(selectedDetailedOrder.DateArchivage).toLocaleDateString("fr-FR") : "--"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4">
                      <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-indigo-600" />
                        Fournisseur & Prix
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-gray-500">Fournisseur</span>
                          <span className="font-bold text-indigo-700 truncate max-w-[180px]" title={selectedDetailedOrder.Fournisseur}>{selectedDetailedOrder.Fournisseur || "Achat Local"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-gray-200">
                          <span className="text-gray-500">Montant total</span>
                          <span className="font-bold text-emerald-700">{selectedDetailedOrder.Prix ? `${selectedDetailedOrder.Prix.toLocaleString()} FCFA` : "Non spécifié"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observation */}
                {selectedDetailedOrder.Observation && (
                  <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                    <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Observation
                    </h4>
                    <p className="text-sm text-gray-700 italic leading-relaxed">
                      "{selectedDetailedOrder.Observation}"
                    </p>
                  </div>
                )}

                {/* Historique des statuts */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    Historique des statuts ({detailedOrderHistory.length})
                  </h4>
                  
                  {isHistoryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                    </div>
                  ) : detailedOrderHistory.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl">
                      <p className="text-sm text-gray-400">Aucun historique disponible</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-indigo-200 ml-4 space-y-5">
                      {detailedOrderHistory.map((log) => (
                        <div key={log.Id} className="relative pl-6">
                          <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-indigo-100"></div>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-xs text-gray-500">{new Date(log.DateModification).toLocaleDateString("fr-FR")}</span>
                              <span className="text-[10px] text-gray-400">{new Date(log.DateModification).toLocaleTimeString("fr-FR")}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs line-through">{log.AncienStatut}</span>
                              <span className="text-gray-400">→</span>
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                log.NouveauStatut === "Livré" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}>{log.NouveauStatut}</span>
                            </div>
                            <p className="text-xs text-gray-500">Par: <span className="font-semibold text-gray-700">{log.ModifiePar}</span></p>
                            {log.Commentaire && (
                              <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200 italic">"{log.Commentaire}"</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedDetailedOrder(null)}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl shadow-md transition-all"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}