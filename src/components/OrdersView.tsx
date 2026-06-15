import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Order, Supplier, StatusHistory } from "../types";
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Archive, 
  X, 
  AlertCircle, 
  Calendar, 
  FilterX, 
  FileSpreadsheet, 
  FileText,
  Store,
  ChevronDown
} from "lucide-react";
import { exportToCSV, exportToPDF } from "../utils/exportUtils";

interface OrdersViewProps {
  currentUser: {
    id: string;
    username: string;
    role: "Administrateur" | "Utilisateur";
    nom: string;
    prenom: string;
  };
}

export interface FormItem {
  id: string;
  Designation: string;
  Quantite: number;
  Prix: string;
  ReferenceSage: string;
  DateLivraison: string;
  Statut: "En cours" | "Livré" | "Non livré" | "Terminé";
  Agence: string;
  FournisseurType: "Achat Local" | "Achat Import" | "Agence";
  FournisseurAgence: string;
  Observation?: string;
}

export default function OrdersView({ currentUser }: OrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter State
  const [globalSearch, setGlobalSearch] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [searchBC, setSearchBC] = useState("");
  const [searchDS, setSearchDS] = useState("");
  const [searchDesignation, setSearchDesignation] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterAgency, setFilterAgency] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateEmitStart, setDateEmitStart] = useState("");
  const [dateEmitEnd, setDateEmitEnd] = useState("");
  const [dateDeliveryStart, setDateDeliveryStart] = useState("");
  const [dateDeliveryEnd, setDateDeliveryEnd] = useState("");

  // Modals & Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [fieldBC, setFieldBC] = useState("");
  const [fieldDS, setFieldDS] = useState("");
  const [fieldDesignation, setFieldDesignation] = useState("");
  const [fieldQuantite, setFieldQuantite] = useState<number>(1);
  const [fieldPrix, setFieldPrix] = useState<string>("");
  const [fieldRefSage, setFieldRefSage] = useState("");
  const [fieldDateLivraison, setFieldDateLivraison] = useState("");
  const [fieldStatut, setFieldStatut] = useState<"En cours" | "Livré" | "Non livré" | "Terminé">("En cours");
  const [fieldAgence, setFieldAgence] = useState("");
  const [fieldFournisseurType, setFieldFournisseurType] = useState<"Achat Local" | "Achat Import" | "Agence">("Achat Local");
  const [fieldFournisseurAgence, setFieldFournisseurAgence] = useState("");

  // Status logs view state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<Order | null>(null);
  const [orderHistoryList, setOrderHistoryList] = useState<StatusHistory[]>([]);

  // State for direct "Terminé" status change observation modal
  const [showObsModal, setShowObsModal] = useState(false);
  const [obsModalOrder, setObsModalOrder] = useState<Order | null>(null);
  const [obsModalText, setObsModalText] = useState("");
  const [obsModalError, setObsModalError] = useState<string | null>(null);

  // Fetch initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersData, suppliersData, servicesData, agenciesData] = await Promise.all([
        api.orders.getAll(false), // Fetch non-archived
        api.suppliers.getAll(),
        api.services.getAll(),
        api.agencies.getAll()
      ]);
      setOrders(ordersData);
      setSuppliers(suppliersData);
      setServices(servicesData);
      setAgencies(agenciesData);
    } catch (err: any) {
      setError(err.message || "Impossible d'accéder au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick helper to flash alerts
  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Open creation modal
  const handleOpenCreate = () => {
    setEditingOrder(null);
    setFieldBC("");
    setFieldDS("");
    setFormItems([
      {
        id: Math.random().toString(),
        Designation: "",
        Quantite: 1,
        Prix: "",
        ReferenceSage: "",
        DateLivraison: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        Statut: "En cours",
        Agence: services[0] || "",
        FournisseurType: "Achat Local",
        FournisseurAgence: agencies[0] || ""
      }
    ]);
    setFormError(null);
    setShowFormModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (order: Order) => {
    // Constraint: Normal user cannot edit if delivered!
    if (order.Statut === "Livré" && currentUser.role !== "Administrateur") {
      alert("Seul l'administration est autorisée à modifier une commande livrée.");
      return;
    }

    setEditingOrder(order);
    setFieldBC(order.NoBonCommande);
    setFieldDS(order.NoDS);
    
    // Parse order.Fournisseur
    const fStr = order.Fournisseur || "";
    let fType: "Achat Local" | "Achat Import" | "Agence" = "Achat Local";
    let fAg = "";
    if (fStr.startsWith("Agence - ")) {
      fType = "Agence";
      fAg = fStr.replace("Agence - ", "");
    } else if (fStr === "Achat Import") {
      fType = "Achat Import";
    }

    setFormItems([
      {
        id: Math.random().toString(),
        Designation: order.Designation,
        Quantite: order.Quantite,
        Prix: order.Prix !== undefined ? order.Prix.toString() : "",
        ReferenceSage: order.ReferenceSage || "",
        DateLivraison: order.DateLivraison,
        Statut: order.Statut,
        Agence: order.Agence,
        FournisseurType: fType,
        FournisseurAgence: fAg || agencies[0] || "",
        Observation: order.Observation || ""
      }
    ]);

    setFormError(null);
    setShowFormModal(true);
  };

  const handleAddFormItem = () => {
    setFormItems([
      ...formItems,
      {
        id: Math.random().toString(),
        Designation: "",
        Quantite: 1,
        Prix: "",
        ReferenceSage: "",
        DateLivraison: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        Statut: "En cours",
        Agence: services[0] || "",
        FournisseurType: "Achat Local",
        FournisseurAgence: agencies[0] || ""
      }
    ]);
  };

  const handleRemoveFormItem = (id: string) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter(item => item.id !== id));
    }
  };

  const handleUpdateFormItem = (id: string, updates: Partial<FormItem>) => {
    setFormItems(formItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // View status history log trace
  const handleViewHistory = async (order: Order) => {
    try {
      setSelectedOrderForHistory(order);
      const res = await api.orders.getHistory(order.Id);
      setOrderHistoryList(res.history);
      setShowHistoryModal(true);
    } catch (err: any) {
      alert("Erreur de récupération de l'historique: " + err.message);
    }
  };

  // Submit modal form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fieldBC.trim()) return setFormError("N° Bon de commande obligatoire");
    if (!fieldDS.trim()) return setFormError("N° DS obligatoire");

    // Validate each item
    for (const [idx, item] of formItems.entries()) {
      const itemNum = formItems.length > 1 ? ` (Article ${idx + 1})` : "";
      if (!item.Designation.trim()) return setFormError(`Désignation obligatoire${itemNum}`);
      if (item.Quantite <= 0) return setFormError(`La quantité doit être supérieure à 0${itemNum}`);
      if (!item.DateLivraison) return setFormError(`La date de livraison prévue est requise${itemNum}`);
      if (!item.Agence) return setFormError(`Veuillez sélectionner un service${itemNum}`);
      if (item.FournisseurType === "Agence" && !item.FournisseurAgence) {
        return setFormError(`Veuillez sélectionner l'agence fournisseur${itemNum}`);
      }
      if (item.Statut === "Terminé" && (!item.Observation || !item.Observation.trim())) {
        return setFormError(`Une observation est obligatoire pour passer au statut 'Terminé'${itemNum}`);
      }
    }

    try {
      if (editingOrder) {
        // Only 1 item is allowed while editing
        const item = formItems[0];
        const finalFournisseur = item.FournisseurType === "Agence"
          ? `Agence - ${item.FournisseurAgence}`
          : item.FournisseurType;

        const payload = {
          NoBonCommande: fieldBC.trim(),
          NoDS: fieldDS.trim(),
          Designation: item.Designation.trim(),
          Quantite: item.Quantite,
          Prix: item.Prix ? Number(item.Prix) : undefined,
          ReferenceSage: item.ReferenceSage || undefined,
          DateLivraison: item.DateLivraison,
          Statut: item.Statut,
          Agence: item.Agence,
          Fournisseur: finalFournisseur,
          Observation: item.Observation ? item.Observation.trim() : undefined
        };

        await api.orders.update(editingOrder.Id, payload);
        flashSuccess(`Commande ${fieldBC} mise à jour avec succès.`);
      } else {
        // Send bulk payload
        const payloadItems = formItems.map(item => {
          const finalFournisseur = item.FournisseurType === "Agence"
            ? `Agence - ${item.FournisseurAgence}`
            : item.FournisseurType;

          return {
            NoBonCommande: fieldBC.trim(),
            NoDS: fieldDS.trim(),
            Designation: item.Designation.trim(),
            Quantite: item.Quantite,
            Prix: item.Prix ? Number(item.Prix) : undefined,
            ReferenceSage: item.ReferenceSage || undefined,
            DateLivraison: item.DateLivraison,
            Statut: item.Statut,
            Agence: item.Agence,
            Fournisseur: finalFournisseur,
            Observation: item.Observation ? item.Observation.trim() : undefined
          };
        });

        await api.orders.createBulk({ items: payloadItems });
        flashSuccess(`Commandes (${formItems.length}) créées et enregistrées avec succès.`);
      }

      setShowFormModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Erreur de sauvegarde");
    }
  };

  // Update Status directly on table (for fast UX)
  const handleToggleStatusQuick = async (order: Order, newStatus: "En cours" | "Livré" | "Non livré" | "Terminé") => {
    if (order.Statut === "Livré" && currentUser.role !== "Administrateur") {
      alert("Seul l'administrateur peut réouvrir ou changer le statut d'une commande déjà livrée.");
      return;
    }

    if (newStatus === "Terminé") {
      setObsModalOrder(order);
      setObsModalText("");
      setObsModalError(null);
      setShowObsModal(true);
      return;
    }

    try {
      await api.orders.updateStatus(order.Id, newStatus);
      flashSuccess(`Statut appliqué sur ${order.NoBonCommande} -> ${newStatus}`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erreur de mise à jour");
    }
  };

  const handleConfirmObsModal = async () => {
    if (!obsModalOrder) return;
    if (!obsModalText.trim()) {
      setObsModalError("Une observation est obligatoire pour clore la commande au statut 'Terminé'.");
      return;
    }

    try {
      await api.orders.updateStatus(obsModalOrder.Id, "Terminé", obsModalText.trim());
      flashSuccess(`Commande ${obsModalOrder.NoBonCommande} clôturée avec succès au statut Terminé et archivée.`);
      setShowObsModal(false);
      setObsModalOrder(null);
      setObsModalText("");
      loadData();
    } catch (err: any) {
      setObsModalError(err.message || "Une erreur s'est produite.");
    }
  };

  // Hard Delete
  const handleDeleteOrder = async (order: Order) => {
    if (currentUser.role !== "Administrateur") {
      alert("Droits administrateur requis pour cette action.");
      return;
    }

    if (window.confirm(`Êtes-vous certain de vouloir SUPPRIMER DÉFINITIVEMENT la commande ${order.NoBonCommande} ?`)) {
      try {
        await api.orders.delete(order.Id);
        flashSuccess("Commande effacée définitivement.");
        loadData();
      } catch (err: any) {
        alert(err.message || "Action échouée");
      }
    }
  };

  // Archive Manual Action
  const handleArchiveManual = async (order: Order) => {
    if (currentUser.role !== "Administrateur") {
      alert("Droits administrateur requis pour archiver des commandes.");
      return;
    }

    try {
      await api.orders.archive(order.Id);
      flashSuccess(`La commande ${order.NoBonCommande} a été déplacée vers les archives.`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'archivage");
    }
  };

  // Filter application evaluation
  const filteredOrders = orders.filter((cmd) => {
    // 1. Simple search bar checking across everything if typed
    if (globalSearch.trim()) {
      const gs = globalSearch.toLowerCase();
      const matchBC = cmd.NoBonCommande.toLowerCase().includes(gs);
      const matchDS = cmd.NoDS.toLowerCase().includes(gs);
      const matchDes = cmd.Designation.toLowerCase().includes(gs);
      const matchFour = (cmd.Fournisseur || "").toLowerCase().includes(gs);
      if (!matchBC && !matchDS && !matchDes && !matchFour) return false;
    }

    // 2. Search text checks
    if (searchBC && !cmd.NoBonCommande.toLowerCase().includes(searchBC.toLowerCase())) return false;
    if (searchDS && !cmd.NoDS.toLowerCase().includes(searchDS.toLowerCase())) return false;
    if (searchDesignation && !cmd.Designation.toLowerCase().includes(searchDesignation.toLowerCase())) return false;

    // 3. Select matching dropdowns
    if (filterAgency && cmd.Agence !== filterAgency) return false;
    if (filterStatus && cmd.Statut !== filterStatus) return false;

    // 4. Supplier matching check
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

    // 5. Creation dates checking (DateEmission)
    if (dateEmitStart) {
      if (new Date(cmd.DateEmission) < new Date(dateEmitStart)) return false;
    }
    if (dateEmitEnd) {
      // Add 23:59:59 to make end date inclusive
      const maxEmit = new Date(dateEmitEnd);
      maxEmit.setHours(23, 59, 59, 999);
      if (new Date(cmd.DateEmission) > maxEmit) return false;
    }

    // 6. Delivery dates checking (DateLivraison)
    if (dateDeliveryStart) {
      if (new Date(cmd.DateLivraison) < new Date(dateDeliveryStart)) return false;
    }
    if (dateDeliveryEnd) {
      const maxDel = new Date(dateDeliveryEnd);
      maxDel.setHours(23, 59, 59, 999);
      if (new Date(cmd.DateLivraison) > maxDel) return false;
    }

    return true;
  });

  // Calculate alerts for list display
  const getDeliveryAlertBadge = (cmd: Order) => {
    if (cmd.Statut === "Livré") return null;

    const today = new Date();
    today.setHours(0,0,0,0);
    const delDate = new Date(cmd.DateLivraison);
    delDate.setHours(0,0,0,0);

    const diffMs = delDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (delDate < today) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm shadow-xs animate-pulse">
          <AlertCircle className="h-3 w-3" /> RETARD
        </span>
      );
    } else if (diffDays >= 0 && diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm">
          ÉCHÉANCE IMMINENTE ({diffDays}j)
        </span>
      );
    }
    return null;
  };

  const handleClearFilters = () => {
    setSearchBC("");
    setSearchDS("");
    setSearchDesignation("");
    setFilterSupplier("");
    setFilterAgency("");
    setFilterStatus("");
    setDateEmitStart("");
    setDateEmitEnd("");
    setDateDeliveryStart("");
    setDateDeliveryEnd("");
  };

  return (
    <div className="space-y-6">
      {/* Page Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Registre des Commandes Actives</h2>
          <p className="text-xs text-gray-500">Enregistrez, modifiez et contrôlez vos bons de commandes et arrivages en temps réel.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportToCSV(filteredOrders, "Rapport_Commandes_Actives")}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-3.5 py-2.5 rounded-lg border border-gray-200 shadow-xs flex items-center gap-2 cursor-pointer"
            id="btn-export-csv"
            title="Exporter la liste filtrée au format CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export CSV
          </button>
          <button
            onClick={() => exportToPDF(filteredOrders, "Rapport des Commandes Actives")}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-3.5 py-2.5 rounded-lg border border-gray-200 shadow-xs flex items-center gap-2 cursor-pointer"
            id="btn-export-pdf"
            title="Exporter la liste filtrée au format PDF"
          >
            <FileText className="h-4 w-4 text-red-500" /> Export PDF
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer ml-auto sm:ml-0"
            id="btn-new-order"
          >
            <Plus className="h-4 w-4" /> Nouvelle Commande
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg p-4 text-xs font-semibold text-emerald-800 shadow-sm animate-fade-in">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 text-xs font-semibold text-red-800 shadow-sm">
          {error}
        </div>
      )}

      {/* Simple Search & Toggle Advanced Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Recherche rapide (N° BC, N° DS, Désignation...)"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-xs text-gray-850 focus:outline-indigo-500 font-medium font-sans"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`text-xs font-semibold px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
                showAdvancedFilters 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-750"
              }`}
            >
              <Search className="h-4 w-4" />
              {showAdvancedFilters ? "Masquer les filtres" : "Filtres avancés"}
            </button>
            <button 
              onClick={() => {
                setGlobalSearch("");
                handleClearFilters();
              }}
              className="text-xs text-gray-500 hover:text-indigo-600 font-bold px-3 py-2 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <FilterX className="h-4 w-4" /> Réinitialiser
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs animate-fade-in">
            {/* BC and DS Text Search */}
            <div className="space-y-1">
              <label className="font-bold text-gray-700">N° Bon de commande</label>
              <input 
                type="text" 
                placeholder="Ex: BC-2026..." 
                value={searchBC}
                onChange={(e) => setSearchBC(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:outline-indigo-500" 
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">N° DS</label>
              <input 
                type="text" 
                placeholder="Ex: DS-9..." 
                value={searchDS}
                onChange={(e) => setSearchDS(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:outline-indigo-500" 
              />
            </div>

            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="font-bold text-gray-700">Description / Désignation</label>
              <input 
                type="text" 
                placeholder="Recherche par mots clés..." 
                value={searchDesignation}
                onChange={(e) => setSearchDesignation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:outline-indigo-500" 
              />
            </div>

            {/* Region and Suppliers Selectors */}
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Fournisseur lié</label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:outline-indigo-500"
              >
                <option value="">Tous les fournisseurs</option>
                <option value="Achat Local">Achat Local</option>
                <option value="Achat Import">Achat Import</option>
                {agencies.map(ag => (
                  <option key={ag} value={`Agence: ${ag}`}>Agence - {ag}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Service</label>
              <select
                value={filterAgency}
                onChange={(e) => setFilterAgency(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:outline-indigo-500"
              >
                <option value="">Tous les services</option>
                {services.map(ser => (
                  <option key={ser} value={ser}>{ser}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Statut de livraison</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:outline-indigo-500"
              >
                <option value="">Tous les statuts</option>
                <option value="En cours">En cours</option>
                <option value="Livré">Livré</option>
                <option value="Non livré">Non livré</option>
              </select>
            </div>

            {/* Date selectors */}
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Date d'émission min</label>
              <input 
                type="date" 
                value={dateEmitStart}
                onChange={(e) => setDateEmitStart(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-indigo-500" 
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-750 font-bold">Date d'émission max</label>
              <input 
                type="date" 
                value={dateEmitEnd}
                onChange={(e) => setDateEmitEnd(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-indigo-500" 
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Livraison prévue min</label>
              <input 
                type="date" 
                value={dateDeliveryStart}
                onChange={(e) => setDateDeliveryStart(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-indigo-500" 
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700 font-bold">Livraison prévue max</label>
              <input 
                type="date" 
                value={dateDeliveryEnd}
                onChange={(e) => setDateDeliveryEnd(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-indigo-500" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Database Active Registry Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto" />
            <h4 className="text-sm font-bold text-gray-700">Aucun résultat dans le registre</h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">Vérifiez vos paramètres de filtrage ou ajoutez une nouvelle commande dans la base de données.</p>
            {orders.length > 0 && (
              <button 
                onClick={handleClearFilters}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-1.5 rounded"
              >
                Retirer tous les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase bg-gray-50/80">
                  <th className="py-3 px-4">Commande (N° BC / DS)</th>
                  <th className="py-3 px-4">Date Émission</th>
                  <th className="py-3 px-4">Désignation</th>
                  <th className="py-3 px-4 text-right">Quantité & Prix</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Fournisseur</th>
                  <th className="py-3 px-4">Échéance de Livraison</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((cmd) => {
                  const hasPrice = cmd.Prix !== undefined && cmd.Prix > 0;
                  return (
                    <tr key={cmd.Id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      {/* Numbers identification */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          {cmd.NoBonCommande}
                        </div>
                        <div className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-mono inline-block">
                          DS: {cmd.NoDS}
                        </div>
                        {cmd.ReferenceSage && (
                          <div className="text-[9px] text-indigo-600 block font-mono">
                            Ref Sage: {cmd.ReferenceSage}
                          </div>
                        )}
                      </td>

                      {/* Date Emission (Auto timestamp) */}
                      <td className="py-4 px-4 text-gray-500">
                        {new Date(cmd.DateEmission).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                        <span className="block text-[9px] text-gray-400">{new Date(cmd.DateEmission).toLocaleTimeString("fr-FR", { hour: "numeric", minute: "2-digit" })}</span>
                      </td>

                      {/* Designation */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-medium text-gray-700 line-clamp-2" title={cmd.Designation}>
                          {cmd.Designation}
                        </p>
                        <span className="text-[9px] text-gray-400 italic">Créé par: {cmd.CreePar}</span>
                      </td>

                      {/* Metrics */}
                      <td className="py-4 px-4 text-right space-y-0.5">
                        <div className="font-bold text-gray-900">{cmd.Quantite.toLocaleString()} u.</div>
                        <div className="text-gray-500 font-mono text-[10px]">
                          {hasPrice ? `${cmd.Prix!.toLocaleString()} FCFA` : "Non spécifié"}
                        </div>
                      </td>

                      {/* Agency */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-600 bg-gray-100/50 rounded-sm px-2 py-1 text-[10px]">
                          {cmd.Agence}
                        </span>
                      </td>

                      {/* Hydrated supplier */}
                      <td className="py-4 px-4 max-w-[150px]">
                        <span className="inline-block truncate text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded" title={cmd.Fournisseur || "Achat Local"}>
                          {cmd.Fournisseur || "Achat Local"}
                        </span>
                      </td>

                      {/* Delivery Limit Date and dynamic Alerts */}
                      <td className="py-4 px-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-semibold">{new Date(cmd.DateLivraison).toLocaleDateString("fr-FR")}</span>
                        </div>
                        {getDeliveryAlertBadge(cmd)}
                      </td>

                      {/* Commande Status with fast click dropdown modification */}
                      <td className="py-4 px-4">
                        <div className="relative group">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer select-none transition-all ${
                            cmd.Statut === "Livré" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" :
                            cmd.Statut === "En cours" ? "bg-amber-100 text-amber-800 hover:bg-amber-200" :
                            cmd.Statut === "Terminé" ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" :
                            "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              cmd.Statut === "Livré" ? "bg-emerald-500" :
                              cmd.Statut === "En cours" ? "bg-amber-500 animate-pulse" :
                              cmd.Statut === "Terminé" ? "bg-indigo-500 animate-pulse" :
                              "bg-red-500"
                            }`}></span>
                            {cmd.Statut}
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </span>

                          {/* Quick statuses switch dropdown list */}
                          <div className="absolute left-0 mt-1 hidden group-hover:block bg-white border border-gray-100 rounded-lg shadow-lg py-1.5 z-40 w-32 animate-fade-in">
                            <button
                              onClick={() => handleToggleStatusQuick(cmd, "En cours")}
                              className="w-full text-left text-[11px] font-medium px-3 py-1.5 text-amber-800 hover:bg-amber-50 flex items-center gap-1.5"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> En cours
                            </button>
                            <button
                              onClick={() => handleToggleStatusQuick(cmd, "Livré")}
                              className="w-full text-left text-[11px] font-medium px-3 py-1.5 text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Livré
                            </button>
                            <button
                              onClick={() => handleToggleStatusQuick(cmd, "Non livré")}
                              className="w-full text-left text-[11px] font-medium px-3 py-1.5 text-red-800 hover:bg-red-50 flex items-center gap-1.5"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> Non livré
                            </button>
                            <button
                              onClick={() => handleToggleStatusQuick(cmd, "Terminé")}
                              className="w-full text-left text-[11px] font-medium px-3 py-1.5 text-indigo-850 hover:bg-indigo-50/50 flex items-center gap-1.5 border-t border-gray-50 pt-1 mt-1"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span> Terminé
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Standard CRUD interaction buttons */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Historical logs check */}
                          <button
                            onClick={() => handleViewHistory(cmd)}
                            title="Consulter l'historique de statut"
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit order */}
                          {(cmd.Statut !== "Livré" || currentUser.role === "Administrateur") && (
                            <button
                              onClick={() => handleOpenEdit(cmd)}
                              title="Modifier la commande"
                              className="p-1.5 rounded-md hover:bg-amber-50 text-gray-500 hover:text-amber-600 transition-colors cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Admin Only Actions */}
                          {currentUser.role === "Administrateur" && (
                            <>
                              <button
                                onClick={() => handleArchiveManual(cmd)}
                                title="Archiver manuellement"
                                className="p-1.5 rounded-md hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(cmd)}
                                title="Supprimer définitivement"
                                className="p-1.5 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

      {/* CREATE / EDIT DIALOG MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-3xl w-full p-6 space-y-4 my-8 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 shrink-0">
              <h3 className="font-bold text-gray-900 text-base">
                {editingOrder ? `Modifier la Commande : ${editingOrder.NoBonCommande}` : "Créer une Nouvelle Commande d'Approvisionnement"}
              </h3>
              <button 
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-xs font-bold text-red-800 shrink-0">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs flex flex-col overflow-hidden">
              {/* Shared top fields: Bon de Commande & DS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-4 shrink-0">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">N° Bon de commande *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BC-2026-003"
                    value={fieldBC}
                    onChange={(e) => setFieldBC(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">N° DS *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: DS-9321"
                    value={fieldDS}
                    onChange={(e) => setFieldDS(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                  />
                </div>
              </div>

              {/* Scrollable multi-item details section */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1 py-1">
                {formItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="border border-gray-200 rounded-xl p-5 bg-gray-50/40 hover:bg-gray-50/70 transition-all space-y-4 relative"
                  >
                    {!editingOrder && formItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFormItem(item.id)}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer cet article"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                      <span className="flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full h-5 w-5 font-bold text-[10px]">
                        {index + 1}
                      </span>
                      <h4 className="font-bold text-gray-800 text-xs">
                        Détail du matériel commandé {formItems.length > 1 ? `#${index + 1}` : ""}
                      </h4>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-700 block">Désignation (Détail des matériels commandés) *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Saisissez les désignations, modèles, références techniques..."
                        value={item.Designation}
                        onChange={(e) => handleUpdateFormItem(item.id, { Designation: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                      ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-gray-700 block">Quantité *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.Quantite}
                          onChange={(e) => handleUpdateFormItem(item.id, { Quantite: Number(e.target.value) })}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-700 block">Prix Global Estimé (FCFA)</label>
                        <input
                          type="number"
                          placeholder="Ex: 1500000"
                          value={item.Prix}
                          onChange={(e) => handleUpdateFormItem(item.id, { Prix: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-700 block">Référence Sage (X3 ou S100)</label>
                        <input
                          type="text"
                          placeholder="Ex: SAGE-PC-02"
                          value={item.ReferenceSage}
                          onChange={(e) => handleUpdateFormItem(item.id, { ReferenceSage: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-gray-700 block">Date de livraison prévue *</label>
                        <input
                          type="date"
                          required
                          value={item.DateLivraison}
                          onChange={(e) => handleUpdateFormItem(item.id, { DateLivraison: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 text-gray-800 focus:outline-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-700 block">Service *</label>
                        <select
                          required
                          value={item.Agence}
                          onChange={(e) => handleUpdateFormItem(item.id, { Agence: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                        >
                          <option value="" disabled>Sélectionner le service</option>
                          {services.map((ser) => (
                            <option key={ser} value={ser}>{ser}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-700 block">Statut Actuel de Commande *</label>
                        <select
                          required
                          value={item.Statut}
                          onChange={(e) => handleUpdateFormItem(item.id, { Statut: e.target.value as any })}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                        >
                          <option value="En cours">En cours</option>
                          <option value="Livré">Livré</option>
                          <option value="Non livré">Non livré</option>
                          <option value="Terminé">Terminé</option>
                        </select>
                      </div>
                    </div>

                    {item.Statut === "Terminé" && (
                      <div className="space-y-1 bg-amber-50/70 border border-amber-200 p-4 rounded-xl animate-fade-in mt-2">
                        <label className="font-bold text-amber-900 block text-xs">
                          Observation Obligatoire (Clôture & Archivage direct) *
                        </label>
                        <p className="text-[10px] text-amber-700 mb-1.5">
                          Veuillez renseigner le motif de fin ou l'observation de clôture. Cette commande sera archivée dès son enregistrement.
                        </p>
                        <textarea
                          required
                          rows={25}
                          style={{ minHeight: "80px" }}
                          placeholder="Saisissez les observations de fin obligatoires..."
                          value={item.Observation || ""}
                          onChange={(e) => handleUpdateFormItem(item.id, { Observation: e.target.value })}
                          className="w-full bg-white border border-amber-300 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-amber-500 text-xs"
                        ></textarea>
                      </div>
                    )}

                    {/* Simplified Single Fournisseur Field */}
                    <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-white text-xs">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <Store className="h-4 w-4 text-indigo-600" />
                        Sélection du Fournisseur *
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        Sélectionnez la catégorie de fournisseur. Si "Agence" est choisie, sélectionnez le service fournisseur.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-bold text-gray-700 block">Type de Fournisseur *</label>
                          <select
                            required
                            value={item.FournisseurType}
                            onChange={(e) => handleUpdateFormItem(item.id, { FournisseurType: e.target.value as any })}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                          >
                            <option value="Achat Local">Achat Local</option>
                            <option value="Achat Import">Achat Import</option>
                            <option value="Agence">Agence</option>
                          </select>
                        </div>

                        {item.FournisseurType === "Agence" && (
                          <div className="space-y-1 animate-fade-in">
                            <label className="font-bold text-gray-700 block">Agence Fournisseur *</label>
                            <select
                              required
                              value={item.FournisseurAgence}
                              onChange={(e) => handleUpdateFormItem(item.id, { FournisseurAgence: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                            >
                              <option value="" disabled>Sélectionner l'agence</option>
                              {agencies.map((ag) => (
                                <option key={ag} value={ag}>{ag}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Button to add more items inside create mode */}
                {!editingOrder && (
                  <button
                    type="button"
                    onClick={handleAddFormItem}
                    className="w-full border-2 border-dashed border-indigo-200 hover:border-indigo-400 font-bold py-3 text-indigo-600 hover:text-indigo-700 rounded-xl bg-indigo-50/10 hover:bg-indigo-50/40 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un autre matériel / article
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-xs transition"
                >
                  {editingOrder ? "Enregistrer les modifications" : `Déclarer les commandes (${formItems.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS HISTORICAL LOGS TRACE MODAL */}
      {showHistoryModal && selectedOrderForHistory && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Traçabilité & Historique des Statuts</h3>
                <p className="text-[11px] text-gray-500 mt-1">N° Bon Commande : {selectedOrderForHistory.NoBonCommande}</p>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {orderHistoryList.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">Aucune modification historique référencée.</p>
              ) : (
                <div className="relative border-l-2 border-indigo-200 ml-4 space-y-5 text-xs">
                  {orderHistoryList.map((hist) => {
                    return (
                      <div key={hist.Id} className="relative pl-6">
                        {/* Dot marker */}
                        <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">Mise à jour du statut</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(hist.DateModification).toLocaleDateString("fr-FR")} à {new Date(hist.DateModification).toLocaleTimeString("fr-FR", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-gray-400 line-through shrink-0">{hist.AncienStatut}</span>
                            <span className="text-gray-400">➔</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 uppercase tracking-wide ${
                              hist.NouveauStatut.includes("Livré") ? "bg-emerald-100 text-emerald-800" :
                              hist.NouveauStatut.includes("En cours") ? "bg-amber-100 text-amber-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {hist.NouveauStatut}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">Effectué par l'opérateur: <strong className="text-gray-700">{hist.ModifiePar}</strong></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg text-xs transition"
            >
              Fermer la fenêtre
            </button>
          </div>
        </div>
      )}

      {/* QUICK OBSERVATION MODAL FOR STATUS TERMINÉ */}
      {showObsModal && obsModalOrder && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 animate-fade-in text-xs">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Observation de Clôture Obligatoire</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Commande N° BC : {obsModalOrder.NoBonCommande}</p>
              </div>
              <button 
                onClick={() => {
                  setShowObsModal(false);
                  setObsModalOrder(null);
                }}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {obsModalError && (
              <div className="bg-red-50 text-red-850 text-[11px] font-bold p-3 rounded-lg border-l-4 border-red-500">
                {obsModalError}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-gray-650 leading-relaxed text-[11px]">
                Saisissez l'observation finale d'achèvement de la commande. Dès validation, la commande passera au statut <span className="font-bold text-indigo-700">Terminé</span> et sera <span className="font-bold text-indigo-700">automatiquement archivée</span>.
              </p>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Observations / Commentaires de Clôture *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Saisissez les observations obligatoires de clôture de la commande..."
                  value={obsModalText}
                  onChange={(e) => setObsModalText(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-medium text-gray-800 focus:outline-indigo-500"
                ></textarea>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowObsModal(false);
                  setObsModalOrder(null);
                }}
                className="bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg text-xs transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmObsModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-xs"
              >
                Confirmer l'archivage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
