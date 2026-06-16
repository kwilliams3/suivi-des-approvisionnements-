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
  ChevronDown,
  Package,
  Truck,
  Shield,
  Zap,
  TrendingUp,
  BarChart3,
  Sparkles,
  UserCheck,
  Save,
  ChevronLeft,
  ChevronRight,
  Users,
  ChevronDown as ChevronDownIcon
} from "lucide-react";
import { exportToCSV, exportToPDF, GroupedOrder } from "../utils/exportUtils";

// Robust ownership check for orders
const checkOrderOwnership = (order: Order, user: any): boolean => {
  if (!user) return false;
  if (user.role === "Administrateur") return true;

  const creatorName = (order.CreePar || order.DemandePar || "").trim().toLowerCase();
  if (!creatorName) return false;

  const userLogin = (user.username || "").trim().toLowerCase();
  const userFullName = `${user.prenom || ""} ${user.nom || ""}`.trim().toLowerCase();
  const userId = (user.id || "").trim().toLowerCase();

  return (
    creatorName === userLogin ||
    (userId && creatorName === userId) ||
    (userFullName && creatorName === userFullName) ||
    (userLogin && creatorName.includes(userLogin)) ||
    (userLogin && userLogin.includes(creatorName)) ||
    (userFullName && creatorName.includes(userFullName)) ||
    (userFullName && userFullName.includes(creatorName)) ||
    (() => {
      if (!userFullName) return false;
      const parts = userFullName.split(/\s+/).filter(p => p.length > 2);
      return parts.some(part => creatorName.includes(part));
    })()
  );
};

interface OrdersViewProps {
  currentUser: {
    id: string;
    username: string;
    role: "Administrateur" | "Utilisateur";
    nom: string;
    prenom: string;
    service?: string;
  };
}

export interface FormItem {
  id: string;
  orderId?: string;
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
  Fournisseur?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modals & Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupedOrder | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields pour le bon de commande
  const [fieldBC, setFieldBC] = useState("");
  const [fieldDS, setFieldDS] = useState("");

  // Status logs view state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<Order | null>(null);
  const [orderHistoryList, setOrderHistoryList] = useState<StatusHistory[]>([]);

  // Detail view state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<GroupedOrder | null>(null);

  // State for direct "Terminé" status change observation modal
  const [showObsModal, setShowObsModal] = useState(false);
  const [obsModalOrder, setObsModalOrder] = useState<Order | null>(null);
  const [obsModalText, setObsModalText] = useState("");
  const [obsModalError, setObsModalError] = useState<string | null>(null);

  // State pour le statut des articles dans le détail
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [modifiedItems, setModifiedItems] = useState<Set<string>>(new Set());

  // Fetch initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersData, suppliersData, servicesData, agenciesData] = await Promise.all([
        api.orders.getAll(false),
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

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Group orders by Bon Commande
  const groupOrdersByBonCommande = (orders: Order[]) => {
    const grouped = orders.reduce((acc, order) => {
      const key = order.NoBonCommande;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(order);
      return acc;
    }, {} as Record<string, Order[]>);
    
    return Object.entries(grouped).map(([bonCommande, items]) => ({
      bonCommande,
      items,
      firstItem: items[0],
      statusSummary: items.reduce((stats, item) => {
        stats[item.Statut] = (stats[item.Statut] || 0) + 1;
        return stats;
      }, {} as Record<string, number>),
      totalQuantite: items.reduce((sum, item) => sum + item.Quantite, 0),
      totalPrix: items.reduce((sum, item) => sum + (item.Prix || 0), 0),
      quantiteDetails: items.map(item => ({
        designation: item.Designation,
        quantite: item.Quantite,
        statut: item.Statut,
        id: item.Id
      }))
    }));
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

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFieldBC("");
    setFieldDS("");
    
    const userService = currentUser.service || services[0] || "";
    
    setFormItems([
      {
        id: Math.random().toString(),
        Designation: "",
        Quantite: 1,
        Prix: "",
        ReferenceSage: "",
        DateLivraison: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        Statut: "En cours",
        Agence: userService,
        FournisseurType: "Achat Local",
        FournisseurAgence: agencies[0] || ""
      }
    ]);
    setFormError(null);
    setShowFormModal(true);
  };

  const handleOpenEditGroup = (group: GroupedOrder) => {
    try {
      const firstItem = group.firstItem;
      const isOwner = checkOrderOwnership(firstItem, currentUser);
      
      if (currentUser.role !== "Administrateur" && !isOwner) {
        alert("Vous n'êtes pas autorisé à modifier cette commande.");
        return;
      }

      // Suppression du message de confirmation - on ouvre directement le formulaire
      setEditingGroup(group);
      setFieldBC(group.bonCommande);
      setFieldDS(firstItem.NoDS || "");

      const items = group.items.map(item => {
        const fStr = item.Fournisseur || "";
        let fType: "Achat Local" | "Achat Import" | "Agence" = "Achat Local";
        let fAg = "";
        if (fStr.startsWith("Agence - ")) {
          fType = "Agence";
          fAg = fStr.replace("Agence - ", "");
        } else if (fStr === "Achat Import") {
          fType = "Achat Import";
        }

        return {
          id: Math.random().toString(),
          orderId: item.Id,
          Designation: item.Designation || "",
          Quantite: item.Quantite || 1,
          Prix: item.Prix !== undefined && item.Prix !== null ? item.Prix.toString() : "",
          ReferenceSage: item.ReferenceSage || "",
          DateLivraison: item.DateLivraison || new Date().toISOString().split("T")[0],
          Statut: item.Statut || "En cours",
          Agence: item.Agence || services[0] || "",
          FournisseurType: fType,
          FournisseurAgence: fAg || agencies[0] || "",
          Observation: item.Observation || "",
          Fournisseur: fStr
        };
      });

      setFormItems(items);
      setFormError(null);
      setShowFormModal(true);
    } catch (error) {
      console.error("Erreur lors de l'ouverture de l'édition:", error);
      alert("Erreur lors de l'ouverture du formulaire de modification");
    }
  };

  const handleAddFormItem = () => {
    const userService = currentUser.service || services[0] || "";
    
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
        Agence: userService,
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

  const handleViewDetail = (groupedOrder: GroupedOrder) => {
    setSelectedOrderForDetail(groupedOrder);
    setModifiedItems(new Set());
    setShowDetailModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fieldBC.trim()) {
      setFormError("N° Bon de commande obligatoire");
      return;
    }

    for (const [idx, item] of formItems.entries()) {
      const itemNum = formItems.length > 1 ? ` (Article ${idx + 1})` : "";
      if (!item.Designation.trim()) {
        setFormError(`Désignation obligatoire${itemNum}`);
        return;
      }
      if (item.Quantite <= 0) {
        setFormError(`La quantité doit être supérieure à 0${itemNum}`);
        return;
      }
      if (!item.DateLivraison) {
        setFormError(`La date de livraison prévue est requise${itemNum}`);
        return;
      }
      if (!item.Agence) {
        setFormError(`Veuillez sélectionner un service${itemNum}`);
        return;
      }
      if (item.FournisseurType === "Agence" && !item.FournisseurAgence) {
        setFormError(`Veuillez sélectionner l'agence fournisseur${itemNum}`);
        return;
      }
      if (item.Statut === "Terminé" && (!item.Observation || !item.Observation.trim())) {
        setFormError(`Une observation est obligatoire pour passer au statut 'Terminé'${itemNum}`);
        return;
      }
    }

    try {
      if (editingGroup) {
        const updatePromises = formItems.map(item => {
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

          if (item.orderId) {
            return api.orders.update(item.orderId, payload);
          } else {
            return api.orders.create(payload);
          }
        });

        await Promise.all(updatePromises);
        flashSuccess(`Bon de commande ${fieldBC} mis à jour avec succès (${formItems.length} article(s)).`);
      } else {
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
        flashSuccess(`Bon de commande ${fieldBC} créé avec succès (${formItems.length} article(s)).`);
      }

      setShowFormModal(false);
      loadData();
    } catch (err: any) {
      console.error("Erreur de sauvegarde:", err);
      setFormError(err.message || "Erreur de sauvegarde");
    }
  };

  // Fonction pour mettre à jour le statut d'un article individuel dans le détail
  const handleUpdateSingleStatus = async (orderId: string, newStatus: "En cours" | "Livré" | "Non livré" | "Terminé", observation?: string) => {
    try {
      setUpdatingStatus(orderId);
      
      // Trouver l'article dans la liste
      const item = selectedOrderForDetail?.items.find(i => i.Id === orderId);
      if (!item) {
        alert("Article non trouvé");
        setUpdatingStatus(null);
        return;
      }

      const isOwner = checkOrderOwnership(item, currentUser);
      if (currentUser.role !== "Administrateur" && !isOwner) {
        alert("Vous n'êtes pas autorisé à modifier cette commande.");
        setUpdatingStatus(null);
        return;
      }

      // Si l'article est déjà livré, seul l'admin peut le modifier
      if (item.Statut === "Livré" && currentUser.role !== "Administrateur") {
        alert("Cet article est déjà livré. Seul l'administrateur peut le modifier.");
        setUpdatingStatus(null);
        return;
      }

      if (newStatus === "Terminé") {
        const obs = prompt("Veuillez entrer une observation pour la clôture de cet article:");
        if (!obs || !obs.trim()) {
          alert("Une observation est obligatoire pour clôturer l'article.");
          setUpdatingStatus(null);
          return;
        }
        await api.orders.updateStatus(orderId, newStatus, obs.trim());
      } else {
        await api.orders.updateStatus(orderId, newStatus);
      }

      // Ajouter l'article aux articles modifiés
      setModifiedItems(prev => new Set(prev).add(orderId));

      flashSuccess(`Statut de l'article "${item.Designation}" modifié en "${newStatus}".`);
      loadData();
      
      // Mettre à jour le modal de détail
      if (selectedOrderForDetail) {
        const updatedGroup = groupOrdersByBonCommande(orders).find(g => g.bonCommande === selectedOrderForDetail.bonCommande);
        if (updatedGroup) {
          setSelectedOrderForDetail(updatedGroup);
        }
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour du statut");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleToggleStatusQuick = async (order: Order, newStatus: "En cours" | "Livré" | "Non livré" | "Terminé") => {
    const isOwner = checkOrderOwnership(order, currentUser);
    if (currentUser.role !== "Administrateur" && !isOwner) {
      alert("Vous n'êtes pas autorisé à modifier cette commande.");
      return;
    }

    if (order.Statut === "Livré" && currentUser.role !== "Administrateur") {
      alert("Seul l'administrateur peut modifier une commande livrée.");
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
      flashSuccess(`Statut modifié : ${order.NoBonCommande} → ${newStatus}`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erreur de mise à jour");
    }
  };

  const handleConfirmObsModal = async () => {
    if (!obsModalOrder) return;
    if (!obsModalText.trim()) {
      setObsModalError("Une observation est obligatoire pour clôturer la commande.");
      return;
    }

    try {
      await api.orders.updateStatus(obsModalOrder.Id, "Terminé", obsModalText.trim());
      flashSuccess(`Commande ${obsModalOrder.NoBonCommande} clôturée et archivée.`);
      setShowObsModal(false);
      setObsModalOrder(null);
      setObsModalText("");
      loadData();
    } catch (err: any) {
      setObsModalError(err.message || "Une erreur s'est produite.");
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (currentUser.role !== "Administrateur") {
      alert("Droits administrateur requis.");
      return;
    }

    if (window.confirm(`Supprimer définitivement la commande ${order.NoBonCommande} ?`)) {
      try {
        await api.orders.delete(order.Id);
        flashSuccess("Commande supprimée.");
        loadData();
      } catch (err: any) {
        alert(err.message || "Action échouée");
      }
    }
  };

  const handleArchiveManual = async (order: Order) => {
    if (currentUser.role !== "Administrateur") {
      alert("Droits administrateur requis.");
      return;
    }

    try {
      await api.orders.archive(order.Id);
      flashSuccess(`Commande ${order.NoBonCommande} archivée.`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'archivage");
    }
  };

  const handleExportGrouped = async (format: 'csv' | 'pdf') => {
    try {
      const exportData = paginatedData;
      const title = "Commandes_Groupées_par_Bon";
      
      if (format === 'csv') {
        exportToCSV(exportData, title, true);
        flashSuccess("Exportation CSV réussie");
      } else {
        exportToPDF(exportData, "Commandes Groupées par Bon de Commande", true);
        flashSuccess("Exportation PDF réussie");
      }
    } catch (error: any) {
      console.error("Erreur d'exportation:", error);
      setError(error.message || "Erreur lors de l'exportation");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleUpdateAllStatus = async (group: GroupedOrder, newStatus: "En cours" | "Livré" | "Non livré" | "Terminé") => {
    try {
      const isOwner = checkOrderOwnership(group.firstItem, currentUser);
      if (currentUser.role !== "Administrateur" && !isOwner) {
        alert("Vous n'êtes pas autorisé à modifier cette commande.");
        return;
      }

      const hasDelivered = group.items.some(item => item.Statut === "Livré");
      if (hasDelivered && currentUser.role !== "Administrateur") {
        alert("Seul l'administrateur peut modifier une commande avec des articles livrés.");
        return;
      }

      if (newStatus === "Terminé") {
        const obs = prompt("Veuillez entrer une observation pour la clôture de tous les articles:");
        if (!obs || !obs.trim()) {
          alert("Une observation est obligatoire pour clôturer les articles.");
          return;
        }
        
        const promises = group.items.map(item => 
          api.orders.updateStatus(item.Id, newStatus, obs.trim())
        );
        await Promise.all(promises);
        flashSuccess(`Tous les articles du bon ${group.bonCommande} sont maintenant en statut "Terminé".`);
      } else {
        const promises = group.items.map(item => 
          api.orders.updateStatus(item.Id, newStatus)
        );
        await Promise.all(promises);
        flashSuccess(`Tous les articles du bon ${group.bonCommande} sont maintenant en statut "${newStatus}".`);
      }
      
      loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour des statuts");
    }
  };

  // Filtrer les commandes
  const filteredOrders = orders.filter((cmd) => {
    if (searchTerm.trim()) {
      const st = searchTerm.toLowerCase();
      const matchBC = (cmd.NoBonCommande || "").toLowerCase().includes(st);
      const matchDS = (cmd.NoDS || "").toLowerCase().includes(st);
      const matchDes = (cmd.Designation || "").toLowerCase().includes(st);
      const matchFour = (cmd.Fournisseur || "").toLowerCase().includes(st);
      if (!matchBC && !matchDS && !matchDes && !matchFour) return false;
    }

    if (filterUser) {
      const creator = (cmd.CreePar || cmd.DemandePar || "").toLowerCase();
      if (creator !== filterUser.toLowerCase()) return false;
    }

    return true;
  });

  const groupedOrders = groupOrdersByBonCommande(filteredOrders);
  const uniqueUsers = getUniqueUsers(orders);

  const totalPages = Math.ceil(groupedOrders.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedData = groupedOrders.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterUser]);

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
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <AlertCircle className="h-3 w-3" /> Retard
        </span>
      );
    } else if (diffDays >= 0 && diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Clock className="h-3 w-3" /> J+{diffDays}
        </span>
      );
    }
    return null;
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterUser("");
    setCurrentPage(1);
  };

  // Fonction pour obtenir les couleurs des statuts
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Livré": return "bg-emerald-100 text-emerald-700";
      case "En cours": return "bg-amber-100 text-amber-700";
      case "Terminé": return "bg-indigo-100 text-indigo-700";
      case "Non livré": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
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
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Gestion des commandes
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-1">Registre des Commandes</h1>
              <p className="text-sm text-white/80">
                Gérez vos bons de commande et suivez les livraisons en temps réel
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Shield className="h-3 w-3" />
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
            {groupedOrders.length} bon{groupedOrders.length > 1 ? 's' : ''} de commande trouvé{groupedOrders.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportGrouped('csv')}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> CSV
          </button>
          <button
            onClick={() => handleExportGrouped('pdf')}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
          >
            <FileText className="h-4 w-4 text-red-500" /> PDF
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold text-sm px-5 py-2 rounded-xl shadow-md flex items-center gap-2 transition-all transform hover:scale-105"
          >
            <Plus className="h-4 w-4" /> Nouvelle commande
          </button>
        </div>
      </div>

      {/* Alertes */}
      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-xl p-4 text-xs font-semibold text-emerald-800 shadow-sm animate-fade-in">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 text-xs font-semibold text-red-800 shadow-sm">
          {error}
        </div>
      )}

      {/* Barre de recherche et filtres simplifiés */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
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

          <button 
            onClick={handleClearFilters}
            className="text-xs text-gray-500 hover:text-indigo-600 font-medium px-4 py-2.5 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-1 border border-gray-200 hover:border-indigo-200"
          >
            <FilterX className="h-4 w-4" /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau des commandes groupées */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Chargement des commandes...</p>
            </div>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-700">Aucune commande trouvée</h4>
            <p className="text-xs text-gray-400 mt-1">Ajustez vos filtres ou créez une nouvelle commande</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">N° Bon Commande</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Date émission</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Articles</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Quantités</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Prix Total</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Service</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Statuts</th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((group) => {
                    const cmd = group.firstItem;
                    const isOwner = checkOrderOwnership(cmd, currentUser);
                    return (
                      <tr key={group.bonCommande} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 text-sm">{group.bonCommande}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {group.items.length} article{group.items.length > 1 ? 's' : ''}
                          </div>
                          <div className="text-[9px] text-gray-400 mt-0.5">
                            Par: {cmd.CreePar || cmd.DemandePar}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-700">{new Date(cmd.DateEmission).toLocaleDateString("fr-FR")}</div>
                          <div className="text-[10px] text-gray-400">{new Date(cmd.DateEmission).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="text-sm text-gray-700 space-y-0.5">
                            {group.items.map((item, idx) => (
                              <div key={idx} className="truncate text-xs" title={item.Designation}>
                                • {item.Designation}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            {group.items.map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-700">
                                {item.Quantite}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">
                            {group.totalPrix > 0 ? `${group.totalPrix.toLocaleString()} FCFA` : '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                            {cmd.Agence}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            {group.items.map((item, idx) => (
                              <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(item.Statut)}`}>
                                {item.Statut}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => handleViewDetail(group)} 
                              title="Voir détails" 
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleViewHistory(cmd)} title="Historique" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition">
                              <Clock className="h-4 w-4" />
                            </button>
                            {isOwner && (
                              <button onClick={() => handleOpenEditGroup(group)} title="Modifier tous les articles" className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-500 hover:text-amber-600 transition">
                                <Edit3 className="h-4 w-4" />
                              </button>
                            )}
                            {currentUser.role === "Administrateur" && (
                              <>
                                <button onClick={() => handleArchiveManual(cmd)} title="Archiver" className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition">
                                  <Archive className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeleteOrder(cmd)} title="Supprimer" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
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

            {/* Pagination avec statistiques en bas */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="text-xs text-gray-500 order-2 sm:order-1">
                <span className="font-semibold text-gray-700">Total: {groupedOrders.length}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span>Page {currentPage}/{totalPages || 1}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span>{paginatedData.length} bon(s) affiché(s)</span>
              </div>

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

      {/* MODAL FORMULAIRE - Avec modification des statuts individuels */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {editingGroup ? `Modifier: ${editingGroup.bonCommande}` : "Nouvelle commande"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingGroup ? `${formItems.length} article(s) à modifier` : "Remplissez tous les champs obligatoires (*)"}
                </p>
                {currentUser.service && (
                  <p className="text-xs text-indigo-600 mt-1">
                    Service: <span className="font-semibold">{currentUser.service}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setShowFormModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-xs font-bold text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-sm">N° Bon commande *</label>
                  <input type="text" required placeholder="Ex: BC-2026-001" value={fieldBC} onChange={(e) => setFieldBC(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-sm">N° DS</label>
                  <input type="text" placeholder="Ex: DS-2026-001" value={fieldDS} onChange={(e) => setFieldDS(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              {formItems.map((item, index) => {
                // Vérifier si l'article est déjà livré
                const isDelivered = item.Statut === "Livré";
                const isAdmin = currentUser.role === "Administrateur";
                const canModifyStatus = isAdmin || !isDelivered;
                
                return (
                  <div key={item.id} className={`border-2 rounded-2xl p-5 space-y-4 relative ${
                    isDelivered && !isAdmin 
                      ? 'border-gray-300 bg-gray-100/50' 
                      : 'border-gray-100 bg-gray-50/30'
                  }`}>
                    {!editingGroup && formItems.length > 1 && (
                      <button type="button" onClick={() => handleRemoveFormItem(item.id)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-white p-1.5 rounded-lg shadow-sm">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">#{index + 1}</div>
                      <h4 className="font-bold text-gray-800">Article {formItems.length > 1 ? index + 1 : ""}</h4>
                      {item.orderId && (
                        <span className="text-[10px] text-gray-400 ml-2">ID: {item.orderId.substring(0, 8)}...</span>
                      )}
                      {isDelivered && !isAdmin && (
                        <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">✓ Livré (lecture seule)</span>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1 text-sm">Désignation *</label>
                      <textarea 
                        rows={2} 
                        placeholder="Description du matériel..." 
                        value={item.Designation} 
                        onChange={(e) => handleUpdateFormItem(item.id, { Designation: e.target.value })} 
                        className={`w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 ${
                          isDelivered && !isAdmin ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                        }`}
                        disabled={isDelivered && !isAdmin}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-sm">Quantité *</label>
                        <input 
                          type="number" 
                          min={1} 
                          value={item.Quantite} 
                          onChange={(e) => handleUpdateFormItem(item.id, { Quantite: Number(e.target.value) })} 
                          className={`w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 ${
                            isDelivered && !isAdmin ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                          disabled={isDelivered && !isAdmin}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-sm">Prix (FCFA)</label>
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={item.Prix} 
                          onChange={(e) => handleUpdateFormItem(item.id, { Prix: e.target.value })} 
                          className={`w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 ${
                            isDelivered && !isAdmin ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                          disabled={isDelivered && !isAdmin}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-sm">Réf. Sage</label>
                        <input 
                          type="text" 
                          placeholder="Optionnel" 
                          value={item.ReferenceSage} 
                          onChange={(e) => handleUpdateFormItem(item.id, { ReferenceSage: e.target.value })} 
                          className={`w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 ${
                            isDelivered && !isAdmin ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                          disabled={isDelivered && !isAdmin}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-sm">Livraison prévue *</label>
                        <input 
                          type="date" 
                          value={item.DateLivraison} 
                          onChange={(e) => handleUpdateFormItem(item.id, { DateLivraison: e.target.value })} 
                          className={`w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 ${
                            isDelivered && !isAdmin ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                          disabled={isDelivered && !isAdmin}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-sm">Service *</label>
                        <input 
                          type="text" 
                          value={item.Agence} 
                          disabled 
                          className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-600 cursor-not-allowed"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Service automatique</p>
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 block mb-1 text-sm">Statut *</label>
                        <select 
                          value={item.Statut} 
                          onChange={(e) => handleUpdateFormItem(item.id, { Statut: e.target.value as any })} 
                          disabled={!canModifyStatus}
                          className={`w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 ${
                            !canModifyStatus ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'
                          }`}
                        >
                          <option value="En cours">En cours</option>
                          <option value="Livré">Livré</option>
                          <option value="Non livré">Non livré</option>
                          <option value="Terminé">Terminé</option>
                        </select>
                        {!canModifyStatus && (
                          <p className="text-[10px] text-amber-600 mt-1">⚠️ Article déjà livré - modification bloquée</p>
                        )}
                      </div>
                    </div>

                    {item.Statut === "Terminé" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <label className="font-bold text-amber-800 block mb-1 text-sm">Observation *</label>
                        <textarea 
                          rows={2} 
                          placeholder="Motif de clôture..." 
                          value={item.Observation} 
                          onChange={(e) => handleUpdateFormItem(item.id, { Observation: e.target.value })} 
                          className={`w-full border border-amber-300 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 ${
                            isDelivered && !isAdmin ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                          disabled={isDelivered && !isAdmin}
                        />
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-bold text-gray-800 mb-3 text-sm">Fournisseur</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-gray-700 block mb-1 text-sm">Type *</label>
                          <select 
                            value={item.FournisseurType} 
                            onChange={(e) => handleUpdateFormItem(item.id, { FournisseurType: e.target.value as any })} 
                            className={`w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 ${
                              isDelivered && !isAdmin ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                            }`}
                            disabled={isDelivered && !isAdmin}
                          >
                            <option value="Achat Local">Achat Local</option>
                            <option value="Achat Import">Achat Import</option>
                            <option value="Agence">Agence</option>
                          </select>
                        </div>
                        {item.FournisseurType === "Agence" && (
                          <div>
                            <label className="font-bold text-gray-700 block mb-1 text-sm">Agence *</label>
                            <select 
                              value={item.FournisseurAgence} 
                              onChange={(e) => handleUpdateFormItem(item.id, { FournisseurAgence: e.target.value })} 
                              className={`w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 ${
                                isDelivered && !isAdmin ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                              }`}
                              disabled={isDelivered && !isAdmin}
                            >
                              <option value="">Sélectionner</option>
                              {agencies.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!editingGroup && (
                <button type="button" onClick={handleAddFormItem} className="w-full border-2 border-dashed border-indigo-300 hover:border-indigo-500 py-3 text-indigo-600 hover:text-indigo-700 rounded-xl bg-indigo-50/30 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-sm font-semibold">
                  <Plus className="h-4 w-4" /> Ajouter un article
                </button>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition">Annuler</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl shadow-md transition-all transform hover:scale-105 flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {editingGroup ? `Mettre à jour (${formItems.length})` : `Créer (${formItems.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL avec modification des statuts individuels */}
      {showDetailModal && selectedOrderForDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Détails de la commande
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  N° Bon: <span className="font-semibold">{selectedOrderForDetail.bonCommande}</span>
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Résumé du bon de commande */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Total articles</p>
                  <p className="text-xl font-bold text-gray-900">{selectedOrderForDetail.items.length}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Quantité totale</p>
                  <p className="text-xl font-bold text-gray-900">{selectedOrderForDetail.totalQuantite}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Prix total</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedOrderForDetail.totalPrix > 0 ? `${selectedOrderForDetail.totalPrix.toLocaleString()} FCFA` : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="text-xl font-bold text-gray-900">{selectedOrderForDetail.firstItem.Agence}</p>
                </div>
              </div>

              {/* Liste des articles */}
              <h4 className="font-bold text-gray-800 mb-3">Articles détaillés</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 uppercase">Désignation</th>
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 uppercase">Qté</th>
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 uppercase">Prix</th>
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 uppercase">Réf. Sage</th>
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 uppercase">Livraison</th>
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 uppercase">Fournisseur</th>
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrderForDetail.items.map((item, idx) => {
                      const isOwner = checkOrderOwnership(item, currentUser);
                      const canModify = isOwner || currentUser.role === "Administrateur";
                      const isUpdating = updatingStatus === item.Id;
                      const isModified = modifiedItems.has(item.Id);
                      const isDelivered = item.Statut === "Livré";
                      
                      return (
                        <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50/50 transition ${isModified ? 'bg-gray-50/70' : ''}`}>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            {item.Designation}
                            {isModified && (
                              <span className="ml-2 text-[10px] text-emerald-600 font-medium">✓ Modifié</span>
                            )}
                            {isDelivered && (
                              <span className="ml-2 text-[10px] text-emerald-600 font-medium">✓ Livré</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">{item.Quantite}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            {item.Prix > 0 ? `${item.Prix.toLocaleString()} FCFA` : '-'}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">{item.ReferenceSage || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            {new Date(item.DateLivraison).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">{item.Fournisseur}</td>
                          <td className="py-2 px-3">
                            {canModify && !isDelivered ? (
                              <div className="relative group">
                                <button
                                  onClick={() => {
                                    const newStatus = prompt(
                                      `Changer le statut de "${item.Designation}"\n\nStatuts disponibles:\n- En cours\n- Livré\n- Non livré\n- Terminé\n\nEntrez le nouveau statut:`,
                                      item.Statut
                                    );
                                    if (newStatus && ["En cours", "Livré", "Non livré", "Terminé"].includes(newStatus)) {
                                      handleUpdateSingleStatus(item.Id, newStatus as any);
                                    }
                                  }}
                                  disabled={isUpdating}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition ${
                                    isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-offset-1'
                                  } ${
                                    isModified ? 'opacity-60 ring-2 ring-emerald-300' : ''
                                  } ${getStatusColor(item.Statut)}`}
                                >
                                  {isUpdating ? (
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></span>
                                  ) : (
                                    <ChevronDownIcon className="h-3 w-3" />
                                  )}
                                  {item.Statut}
                                </button>
                                <div className="absolute left-0 mt-1 hidden group-hover:block bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-30 w-32 animate-fade-in">
                                  <button 
                                    onClick={() => handleUpdateSingleStatus(item.Id, "En cours")}
                                    disabled={isUpdating}
                                    className="w-full text-left text-xs px-3 py-1.5 text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                  >
                                    En cours
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateSingleStatus(item.Id, "Livré")}
                                    disabled={isUpdating}
                                    className="w-full text-left text-xs px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                                  >
                                    Livré
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateSingleStatus(item.Id, "Non livré")}
                                    disabled={isUpdating}
                                    className="w-full text-left text-xs px-3 py-1.5 text-red-700 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    Non livré
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateSingleStatus(item.Id, "Terminé")}
                                    disabled={isUpdating}
                                    className="w-full text-left text-xs px-3 py-1.5 text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 border-t border-gray-100 mt-1 pt-1"
                                  >
                                    Terminé
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(item.Statut)}`}>
                                {item.Statut}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-gray-100 p-6 shrink-0 flex justify-end">
              <button onClick={() => setShowDetailModal(false)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIQUE */}
      {showHistoryModal && selectedOrderForHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Historique des statuts</h3>
                <p className="text-xs text-gray-500 mt-0.5">Commande: {selectedOrderForHistory.NoBonCommande}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-4">
              {orderHistoryList.length === 0 ? (
                <div className="text-center py-8"><Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">Aucun historique</p></div>
              ) : (
                <div className="relative border-l-2 border-indigo-200 ml-4 space-y-4">
                  {orderHistoryList.map((hist) => (
                    <div key={hist.Id} className="relative pl-6">
                      <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-indigo-100"></div>
                      <div className="text-xs">
                        <div className="flex items-center gap-2 mb-1"><span className="font-bold text-gray-800">{new Date(hist.DateModification).toLocaleDateString("fr-FR")}</span><span className="text-gray-400">{new Date(hist.DateModification).toLocaleTimeString("fr-FR")}</span></div>
                        <div className="flex items-center gap-2"><span className="text-gray-500 line-through">{hist.AncienStatut}</span><span>→</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${hist.NouveauStatut === "Livré" ? "bg-emerald-100 text-emerald-700" : hist.NouveauStatut === "En cours" ? "bg-amber-100 text-amber-700" : hist.NouveauStatut === "Terminé" ? "bg-indigo-100 text-indigo-700" : "bg-red-100 text-red-700"}`}>{hist.NouveauStatut}</span></div>
                        <p className="text-gray-500 mt-1">Par: <span className="font-semibold text-gray-700">{hist.ModifiePar}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setShowHistoryModal(false)} className="w-full mt-4 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl font-semibold text-sm transition">Fermer</button>
          </div>
        </div>
      )}

      {/* MODAL OBSERVATION */}
      {showObsModal && obsModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 text-lg">Clôture de commande</h3>
              <button onClick={() => { setShowObsModal(false); setObsModalOrder(null); }} className="p-2 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            {obsModalError && <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-xs font-bold text-red-800 mb-4">{obsModalError}</div>}
            <p className="text-sm text-gray-600 mb-4">Commande: <strong>{obsModalOrder.NoBonCommande}</strong></p>
            <textarea rows={4} placeholder="Observation obligatoire pour la clôture..." value={obsModalText} onChange={(e) => setObsModalText(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 mb-4"></textarea>
            <div className="flex gap-3">
              <button onClick={() => { setShowObsModal(false); setObsModalOrder(null); }} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold">Annuler</button>
              <button onClick={handleConfirmObsModal} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-md">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
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