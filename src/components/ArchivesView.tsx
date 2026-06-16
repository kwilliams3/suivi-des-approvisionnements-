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
  Building
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

  // Archive config states
  const [autoDays, setAutoDays] = useState(30);
  const [isAutoEnabled, setIsAutoEnabled] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBC, setFilterBC] = useState("");
  const [filterDS, setFilterDS] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterAgency, setFilterAgency] = useState("");
  const [deliveryStart, setDeliveryStart] = useState("");
  const [deliveryEnd, setDeliveryEnd] = useState("");
  const [archiveStart, setArchiveStart] = useState("");
  const [archiveEnd, setArchiveEnd] = useState("");
  const [showAdvancedDates, setShowAdvancedDates] = useState(false);

  // Detail Modal States
  const [selectedDetailedOrder, setSelectedDetailedOrder] = useState<Order | null>(null);
  const [detailedOrderHistory, setDetailedOrderHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [archivesData, suppliersData, servicesData, agenciesData, configData] = await Promise.all([
        api.orders.getAll(true), // Fetch archived
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
    } catch (err) {
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

  // Load detail modal and status history
  const handleOpenDetailModal = async (order: Order) => {
    setSelectedDetailedOrder(order);
    setIsHistoryLoading(true);
    try {
      const data = await api.orders.getHistory(order.Id);
      setDetailedOrderHistory(data.history || []);
    } catch (err) {
      console.error("Impossible de récupérer l'historique du statut", err);
      setDetailedOrderHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Restore
  const handleRestore = async (order: Order) => {
    if (currentUser.role !== "Administrateur") {
      alert("Droits administrateur requis pour restaurer des archives.");
      return;
    }

    try {
      await api.orders.restore(order.Id);
      flashSuccess(`La commande ${order.NoBonCommande} a été restaurée dans le registre principal.`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Action échouée");
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (order: Order) => {
    if (currentUser.role !== "Administrateur") {
      alert("Droits administrateur requis pour vider définitivement des archives.");
      return;
    }

    if (window.confirm(`ATTENTION : Cette action est IRREVOCABLE. Êtes-vous sûr de vouloir SUPPRIMER DEFINITIVEMENT la commande ${order.NoBonCommande} de la base de données ?`)) {
      try {
        await api.orders.delete(order.Id);
        flashSuccess(`Commande rattachée ${order.NoBonCommande} supprimée définitivement.`);
        loadData();
      } catch (err: any) {
        alert(err.message || "Erreur lors de la suppression");
      }
    }
  };

  // Update Archive threshold guidelines
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== "Administrateur") {
      alert("Seul l'administrateur peut modifier la politique d'archivage.");
      return;
    }

    try {
      await api.archiveConfig.update({
        autoArchiveDays: autoDays,
        enableAutoArchive: isAutoEnabled
      });
      flashSuccess("La politique d'archivage automatique a été mise à jour.");
      setShowConfig(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erreur de configuration");
    }
  };

  // Archive searches matching evaluation
  const filteredArchives = archivedOrders.filter((cmd) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchesBC = (cmd.NoBonCommande || "").toLowerCase().includes(s);
      const matchesDS = (cmd.NoDS || "").toLowerCase().includes(s);
      const matchesDesignation = (cmd.Designation || "").toLowerCase().includes(s);
      if (!matchesBC && !matchesDS && !matchesDesignation) return false;
    }
    if (filterAgency && cmd.Agence !== filterAgency) return false;

    // Supplier category matching
    if (filterSupplier) {
      if (filterSupplier === "Achat Local" || filterSupplier === "Achat Import") {
        if (cmd.Fournisseur !== filterSupplier) return false;
      } else if (filterSupplier.startsWith("Agence: ")) {
        const agName = filterSupplier.replace("Agence: ", "");
        if (cmd.Fournisseur !== `Agence - ${agName}`) return false;
      } else {
        const matchesSupplier = (cmd.Fournisseur || "").toLowerCase().includes(filterSupplier.toLowerCase());
        if (!matchesSupplier) return false;
      }
    }

    // 1. Delivery dates
    if (deliveryStart && new Date(cmd.DateLivraison) < new Date(deliveryStart)) return false;
    if (deliveryEnd) {
      const limit = new Date(deliveryEnd);
      limit.setHours(23,59,59,999);
      if (new Date(cmd.DateLivraison) > limit) return false;
    }

    // 2. Archiving dates
    if (archiveStart && cmd.DateArchivage && new Date(cmd.DateArchivage) < new Date(archiveStart)) return false;
    if (archiveEnd && cmd.DateArchivage) {
      const limit = new Date(archiveEnd);
      limit.setHours(23,59,59,999);
      if (new Date(cmd.DateArchivage) > limit) return false;
    }

    return true;
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterBC("");
    setFilterDS("");
    setFilterSupplier("");
    setFilterAgency("");
    setDeliveryStart("");
    setDeliveryEnd("");
    setArchiveStart("");
    setArchiveEnd("");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Archive className="h-5.5 w-5.5 text-indigo-600" />
            Module de Conservation et d'Archivage
          </h2>
          <p className="text-xs text-gray-500">Consultez l'historique complet des commandes livrées ou clôturées.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportToCSV(filteredArchives, "Rapport_Archives")}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-3.5 py-2 rounded-lg border border-gray-200 shadow-xs flex items-center gap-2 cursor-pointer"
            id="btn-archive-export-csv"
            title="Exporter les archives filtrées au format CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export CSV
          </button>
          <button
            onClick={() => exportToPDF(filteredArchives, "Rapport du Module d'Archivage")}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-3.5 py-2 rounded-lg border border-gray-200 shadow-xs flex items-center gap-2 cursor-pointer"
            id="btn-archive-export-pdf"
            title="Exporter les archives filtrées au format PDF"
          >
            <FileText className="h-4 w-4 text-red-500" /> Export PDF
          </button>
          {currentUser.role === "Administrateur" && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer"
              id="btn-archive-config"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Politique d'Archivage Automatique
              {showConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg p-3 text-xs font-bold text-emerald-800 shadow-xs animate-fade-in">
          {success}
        </div>
      )}

      {/* Auto archiving configurations */}
      {showConfig && currentUser.role === "Administrateur" && (
        <form onSubmit={handleSaveConfig} className="bg-gradient-to-br from-indigo-50/50 to-indigo-50/20 border border-indigo-100 rounded-xl p-5 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-indigo-950 font-bold">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Règlementation de l'archivage automatique des commandes
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoEnabled}
                  onChange={(e) => setIsAutoEnabled(e.target.checked)}
                  className="rounded text-indigo-600 cursor-pointer h-4 w-4"
                />
                Activer l'archivage automatique des commandes livrées
              </label>
              <p className="text-[11px] text-gray-400 pl-6">Lorsque cette case est cochée, le système déplace périodiquement en arrière-plan les commandes rattachées au statut 'Livré' vers les archives.</p>
            </div>

            <div className="space-y-1.5 pl-0 md:pl-6 max-w-sm">
              <label className="font-bold text-gray-700 block">Délai avant archivage (en jours) *</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  required
                  value={autoDays}
                  onChange={(e) => setAutoDays(Number(e.target.value))}
                  disabled={!isAutoEnabled}
                  className="w-24 bg-white border border-gray-200 rounded-lg p-2 font-bold text-gray-800 text-center focus:outline-indigo-500 disabled:opacity-50"
                />
                <span className="text-gray-500 font-semibold">jours d'émission ou de livraison</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="bg-white hover:bg-gray-100 text-gray-700 font-bold px-3 py-1.5 rounded border border-gray-200"
            >
              Fermer
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded shadow-xs"
            >
              Enregistrer la politique
            </button>
          </div>
        </form>
      )}

      {/* Info panel */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-start gap-3 text-xs text-gray-600 shadow-2xs">
        <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-gray-800 text-[13px] block">Principes d'Archivage</span>
          Les commandes archivées sont retirées du registre de travail principal pour fluidifier les opérations quotidiennes tout en préservant absolument l'intégralité des informations : métadonnées, émetteurs, montants certifiés, et logs de traçabilité.
        </div>
      </div>

      {/* Archive Searches Block */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 shadow-3xs text-xs">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3 flex-wrap gap-2">
          <span className="font-bold uppercase tracking-wider text-gray-700">Filtrage thématique des archives</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAdvancedDates(!showAdvancedDates)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                showAdvancedDates 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {showAdvancedDates ? "Masquer les dates" : "Rechercher par date"}
            </button>
            <button 
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser filtres
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-gray-700 block">Recherche globale</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="N° Bon, N° DS, Désignation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-gray-800 placeholder-gray-450 font-medium focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-gray-700 block">Service émetteur / Agence</label>
            <select
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 font-medium focus:outline-indigo-500"
            >
              <option value="">Tous les services</option>
              {services.map(ser => (
                <option key={ser} value={ser}>{ser}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-gray-700 block">Fournisseur</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 font-medium focus:outline-indigo-500"
            >
              <option value="">Tous les fournisseurs</option>
              <option value="Achat Local">Achat Local</option>
              <option value="Achat Import">Achat Import</option>
              {agencies.map(ag => (
                <option key={ag} value={`Agence: ${ag}`}>Agence - {ag}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Collapsible advanced dates filters using motion */}
        <AnimatePresence>
          {showAdvancedDates && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 mt-3 border-t border-dashed border-gray-150">
                <div className="space-y-1">
                  <label className="font-bold text-gray-600 block">Date d'archivage du</label>
                  <input
                    type="date"
                    value={archiveStart}
                    onChange={(e) => setArchiveStart(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 font-medium focus:outline-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-600 block">au</label>
                  <input
                    type="date"
                    value={archiveEnd}
                    onChange={(e) => setArchiveEnd(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 font-medium focus:outline-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-600 block">Date de livraison du</label>
                  <input
                    type="date"
                    value={deliveryStart}
                    onChange={(e) => setDeliveryStart(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 font-medium focus:outline-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-600 block">au</label>
                  <input
                    type="date"
                    value={deliveryEnd}
                    onChange={(e) => setDeliveryEnd(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 font-medium focus:outline-indigo-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Archives Results table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : filteredArchives.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <Archive className="h-10 w-10 text-gray-300 mx-auto" />
            <h4 className="text-xs font-bold text-gray-700">Aucun historique d'archive trouvé</h4>
            <p className="text-[11px] max-w-sm mx-auto">Veuillez ajuster vos critères ou archiver une première commande achevée depuis le panel de travail principal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase bg-gray-50">
                  <th className="py-3 px-4">Commande</th>
                  <th className="py-3 px-4">Désignation</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Fournisseur</th>
                  <th className="py-3 px-4">Date Émission</th>
                  <th className="py-3 px-4">Date Archivage</th>
                  <th className="py-3 px-4">Statut Initial</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredArchives.map((cmd) => {
                  return (
                    <tr key={cmd.Id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900">{cmd.NoBonCommande}</div>
                        <div className="text-[10px] text-gray-500 font-mono">DS: {cmd.NoDS}</div>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-medium text-gray-700 truncate" title={cmd.Designation}>
                          {cmd.Designation}
                        </p>
                        <span className="text-[9px] text-gray-400 font-mono">Quantité: {cmd.Quantite} u.</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-[10px]">
                          {cmd.Agence}
                        </span>
                      </td>

                      <td className="py-4 px-4 truncate max-w-[150px]">
                        <span className="inline-block truncate text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded" title={cmd.Fournisseur || "Achat Local"}>
                          {cmd.Fournisseur || "Achat Local"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-gray-500">
                        {new Date(cmd.DateEmission).toLocaleDateString("fr-FR")}
                      </td>

                      <td className="py-4 px-4 text-indigo-700 font-medium">
                        {cmd.DateArchivage ? new Date(cmd.DateArchivage).toLocaleDateString("fr-FR") : "--/--/----"}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cmd.Statut === "Livré" ? "bg-emerald-100 text-emerald-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {cmd.Statut}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetailModal(cmd)}
                            className="bg-indigo-50 hover:bg-indigo-150 text-indigo-700 border border-indigo-100 p-1.5 rounded-lg flex items-center justify-center transition cursor-pointer"
                            title="Consulter tous les détails de la commande"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {currentUser.role === "Administrateur" && (
                            <>
                              <button
                                onClick={() => handleRestore(cmd)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer text-[11px] font-bold"
                                title="Restaurer vers le registre principal"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Restaurer
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(cmd)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 border border-transparent hover:border-red-100 transition cursor-pointer"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Popup Modal */}
      <AnimatePresence>
        {selectedDetailedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-gray-950/65 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col text-xs text-gray-805"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 px-6 py-4 text-white flex justify-between items-center shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Archive className="h-4 w-4 text-indigo-300" />
                    <span className="font-extrabold uppercase tracking-widest text-[10px] text-indigo-200">Détails de l'Archive</span>
                  </div>
                  <h3 className="text-base font-bold tracking-tight">
                    {selectedDetailedOrder.NoBonCommande}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedDetailedOrder(null);
                    setDetailedOrderHistory([]);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/85 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* Designation Block */}
                <div className="bg-indigo-50/20 border border-indigo-100/40 rounded-xl p-4 space-y-1.5">
                  <span className="font-bold text-gray-500 uppercase tracking-wider text-[9px] block">Désignation de la commande</span>
                  <p className="text-sm font-semibold text-gray-900 leading-relaxed whitespace-pre-line">
                    {selectedDetailedOrder.Designation}
                  </p>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="border border-gray-100 rounded-xl p-3.5 space-y-2.5 bg-gray-50/50">
                      <span className="font-bold text-indigo-950 text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        Identifiants & SAGE
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center py-1 border-b border-gray-150/50">
                          <span className="text-gray-500 font-medium">Numéro de Bon :</span>
                          <span className="font-bold text-gray-900">{selectedDetailedOrder.NoBonCommande}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-150/50">
                          <span className="text-gray-500 font-medium">Numéro DS :</span>
                          <span className="font-bold text-indigo-700 font-mono bg-indigo-50 px-1.5 py-0.5 rounded">{selectedDetailedOrder.NoDS}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-500 font-medium">Référence SAGE :</span>
                          <span className={`font-semibold ${selectedDetailedOrder.ReferenceSage ? 'text-gray-900 font-mono' : 'text-gray-400 italic'}`}>
                            {selectedDetailedOrder.ReferenceSage || "Non spécifiée"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-3.5 space-y-2.5 bg-gray-50/50">
                      <span className="font-bold text-indigo-955 text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-indigo-600" />
                        Provenance & Émetteur
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center py-1 border-b border-gray-150/50">
                          <span className="text-gray-500 font-medium">Service émetteur :</span>
                          <span className="font-bold text-gray-800">{selectedDetailedOrder.Agence}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-150/50">
                          <span className="text-gray-500 font-medium">Créé par :</span>
                          <span className="font-bold text-gray-800">{selectedDetailedOrder.CreePar || selectedDetailedOrder.DemandePar}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-500 font-medium">Quantité commandée :</span>
                          <span className="font-extrabold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-full">{selectedDetailedOrder.Quantite} u.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="border border-gray-100 rounded-xl p-3.5 space-y-2.5 bg-gray-50/50">
                      <span className="font-bold text-indigo-955 text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                        Chronométrie utile
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center py-1 border-b border-gray-150/50">
                          <span className="text-gray-500 font-medium">Date d'Émission :</span>
                          <span className="font-bold text-gray-800">{new Date(selectedDetailedOrder.DateEmission).toLocaleDateString("fr-FR")}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-150/50">
                          <span className="text-gray-500 font-medium">Échéance Livraison :</span>
                          <span className="font-bold text-gray-800">{new Date(selectedDetailedOrder.DateLivraison).toLocaleDateString("fr-FR")}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-500 font-medium">Date d'Archivage :</span>
                          <span className="font-bold text-indigo-800">
                            {selectedDetailedOrder.DateArchivage ? new Date(selectedDetailedOrder.DateArchivage).toLocaleDateString("fr-FR") : "--/--/----"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-3.5 space-y-2.5 bg-gray-50/50">
                      <span className="font-bold text-indigo-955 text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <ShoppingBag className="h-3.5 w-3.5 text-indigo-600" />
                        Partenariat & Clôture
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center py-1 border-b border-gray-150/50">
                          <span className="text-gray-500 font-medium">Fournisseur :</span>
                          <span className="font-bold text-indigo-950 max-w-[140px] truncate" title={selectedDetailedOrder.Fournisseur}>{selectedDetailedOrder.Fournisseur || "Achat Local"}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-150/50">
                          <span className="text-gray-500 font-medium">Statut d'archivage :</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            selectedDetailedOrder.Statut === "Livré" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {selectedDetailedOrder.Statut}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-500 font-medium">Montant :</span>
                          <span className="font-bold text-emerald-800">{selectedDetailedOrder.Prix ? `${selectedDetailedOrder.Prix.toLocaleString("fr-FR")} FCFA` : "Non spécifié"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observation / Remarques */}
                {selectedDetailedOrder.Observation && (
                  <div className="bg-amber-50/30 border border-amber-150/50 rounded-xl p-4 space-y-1.5">
                    <span className="font-bold text-amber-800 uppercase tracking-wider text-[9px] block">Observation déposée</span>
                    <p className="text-[11px] text-gray-750 leading-relaxed italic">
                      &ldquo;{selectedDetailedOrder.Observation}&rdquo;
                    </p>
                  </div>
                )}

                {/* History Timeline */}
                <div className="space-y-3 pt-2">
                  <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-600" />
                    Historique des modifications de statut ({detailedOrderHistory.length})
                  </span>

                  {isHistoryLoading ? (
                    <div className="flex items-center gap-2 py-3 text-gray-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-450 border-t-transparent"></div>
                      <span>Chargement du journal d'histoire...</span>
                    </div>
                  ) : detailedOrderHistory.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic py-2">Aucun log de transition n'a été recensé pour cette commande.</p>
                  ) : (
                    <div className="relative border-l border-indigo-100 pl-4 py-1 space-y-4 text-[11px]">
                      {detailedOrderHistory.map((log) => (
                        <div key={log.Id} className="relative space-y-1">
                          <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-indigo-550 border border-white ring-2 ring-indigo-50"></div>
                          <div className="flex items-center gap-2 flex-wrap text-gray-900">
                            <span className="font-bold bg-indigo-50 text-indigo-850 px-1.5 py-0.5 rounded text-[10px]">
                              {log.AncienStatut}
                            </span>
                            <span className="text-gray-400">&rarr;</span>
                            <span className="font-bold bg-emerald-50 text-emerald-850 px-1.5 py-0.5 rounded text-[10px]">
                              {log.NouveauStatut}
                            </span>
                            <span className="text-[9px] text-gray-400 font-medium">
                              le {new Date(log.DateModification).toLocaleString("fr-FR")}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            Par : <span className="text-gray-700 font-bold">{log.ModifiePar}</span>
                          </div>
                          {log.Commentaire && (
                            <p className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 italic mt-1 max-w-lg">
                              Note : {log.Commentaire}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetailedOrder(null);
                    setDetailedOrderHistory([]);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm hover:shadow transition cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
