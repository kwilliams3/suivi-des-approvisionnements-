import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { DashboardStats, Order } from "../types";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Archive, 
  AlertTriangle, 
  Bell, 
  Building2, 
  UserSquare, 
  Calendar,
  Layers,
  ArrowRight,
  Package,
  Truck,
  BarChart3,
  Zap,
  Activity,
  Target
} from "lucide-react";

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  currentUser: any;
}

export default function DashboardView({ onNavigate, currentUser }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [delayedOrders, setDelayedOrders] = useState<Order[]>([]);
  const [upcomingOrders, setUpcomingOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [statsData, ordersData] = await Promise.all([
          api.stats.get(),
          api.orders.getAll(false)
        ]);
        setStats(statsData);
        setRecentOrders(ordersData.slice(0, 5));

        // Filter delayed orders
        const today = new Date();
        today.setHours(0,0,0,0);
        const delayed = ordersData.filter(cmd => {
          if (cmd.Statut === "Livré" || cmd.EstArchive) return false;
          const delDate = new Date(cmd.DateLivraison);
          delDate.setHours(0,0,0,0);
          return delDate < today;
        });
        setDelayedOrders(delayed);

        // Filter upcoming (0 to 3 days from now)
        const upcoming = ordersData.filter(cmd => {
          if (cmd.Statut === "Livré" || cmd.EstArchive) return false;
          const delDate = new Date(cmd.DateLivraison);
          delDate.setHours(0,0,0,0);
          const diffMs = delDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 3;
        });
        setUpcomingOrders(upcoming);
      } catch (err) {
        console.error("Erreur de chargement des statistiques", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Chargement des données...</p>
        </div>
      </div>
    );
  }

  // Find most active agency and supplier
  const topAgency = (Object.entries(stats.byAgency) as [string, number][]).sort((a,b) => b[1] - a[1])[0] || ["Aucune", 0];
  const topSupplier = (Object.entries(stats.bySupplier) as [string, number][]).sort((a,b) => b[1] - a[1])[0] || ["Aucun", 0];

  const statsCards = [
    { id: "total", label: "Commandes Actives", value: stats.totalActives, icon: Package, color: "indigo", bg: "from-indigo-500 to-indigo-600", description: "En cours ou en attente" },
    { id: "encours", label: "En Cours", value: stats.enCours, icon: Clock, color: "amber", bg: "from-amber-500 to-amber-600", description: "En traitement" },
    { id: "livre", label: "Livrées", value: stats.livres, icon: CheckCircle2, color: "emerald", bg: "from-emerald-500 to-emerald-600", description: "Livrées et vérifiées" },
    { id: "nonlivre", label: "Non Livrées", value: stats.nonLivres, icon: XCircle, color: "red", bg: "from-red-500 to-red-600", description: "Problèmes d'approvisionnement" },
    { id: "archive", label: "Archivées", value: stats.archives, icon: Archive, color: "purple", bg: "from-purple-500 to-purple-600", description: "Commandes terminées" }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header avec Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative p-6 text-white">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Activity className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Tableau de bord analytique
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-1">
                Bonjour, {currentUser?.prenom} {currentUser?.nom}
              </h1>
              <p className="text-sm text-white/80">
                {currentUser?.role === "Administrateur" 
                  ? "Supervision globale de tous les services et commandes" 
                  : `Gestion du service : ${currentUser?.service || "Non rattaché"}`}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">Rôle : {currentUser?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertes Dynamiques */}
      {(delayedOrders.length > 0 || upcomingOrders.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {delayedOrders.length > 0 && (
            <div className="group relative overflow-hidden bg-gradient-to-r from-red-50 to-red-100/50 rounded-xl border border-red-200 p-5 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-start gap-4">
                <div className="p-2 bg-red-500 rounded-lg shadow-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-800">Commandes en Retard ({delayedOrders.length})</h4>
                  <p className="text-xs text-red-700 mt-1">
                    {delayedOrders.length} commande{delayedOrders.length > 1 ? 's' : ''} dont la date de livraison est dépassée.
                  </p>
                  <button 
                    onClick={() => onNavigate("Commandes")} 
                    className="mt-3 text-xs font-semibold text-red-700 hover:text-red-900 flex items-center gap-1 group/btn"
                  >
                    Voir les détails 
                    <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {upcomingOrders.length > 0 && (
            <div className="group relative overflow-hidden bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl border border-amber-200 p-5 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-start gap-4">
                <div className="p-2 bg-amber-500 rounded-lg shadow-lg">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-800">Échéances Imminentes ({upcomingOrders.length})</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    {upcomingOrders.length} commande{upcomingOrders.length > 1 ? 's' : ''} à livrer dans les 72 heures.
                  </p>
                  <button 
                    onClick={() => onNavigate("Commandes")} 
                    className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 group/btn"
                  >
                    Consulter 
                    <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cartes KPI Modernes */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((card) => (
          <div
            key={card.id}
            className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${card.bg} shadow-lg`}>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {card.label}
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900">{card.value}</h3>
                <p className="text-[11px] text-gray-500 mt-1">{card.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analyses et Rapports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution par Service */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Building2 className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Services</h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
              Distribution
            </span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {Object.entries(stats.byAgency).length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">Aucune donnée disponible</p>
              </div>
            ) : (
              (Object.entries(stats.byAgency) as [string, number][])
                .sort((a,b) => b[1] - a[1])
                .slice(0, 7)
                .map(([agency, count]) => {
                  const percentage = stats.totalGlobal > 0 ? (count / stats.totalGlobal) * 100 : 0;
                  return (
                    <div key={agency} className="group">
                      <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                        <span className="truncate max-w-[150px]" title={agency}>{agency}</span>
                        <span className="text-gray-500">{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500 group-hover:opacity-80" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Distribution par Fournisseur */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <Truck className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Fournisseurs</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              Top fournisseurs
            </span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {Object.entries(stats.bySupplier).length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">Aucun fournisseur</p>
              </div>
            ) : (
              (Object.entries(stats.bySupplier) as [string, number][])
                .sort((a,b) => b[1] - a[1])
                .slice(0, 7)
                .map(([supplier, count]) => {
                  const percentage = stats.totalGlobal > 0 ? (count / stats.totalGlobal) * 100 : 0;
                  return (
                    <div key={supplier} className="group">
                      <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                        <span className="truncate max-w-[150px]" title={supplier}>{supplier}</span>
                        <span className="text-gray-500">{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500 group-hover:opacity-80" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Tendances Mensuelles et Profil */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Tendances Mensuelles</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(stats.byMonth).length === 0 ? (
                <div className="text-center py-6">
                  <BarChart3 className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400">Aucune donnée mensuelle</p>
                </div>
              ) : (
                (Object.entries(stats.byMonth) as [string, number][])
                  .sort((a,b) => b[0].localeCompare(a[0]))
                  .slice(0, 4)
                  .map(([month, count]) => {
                    const parts = month.split("-");
                    const dateFormatted = parts.length === 2 ? `${parts[1]}/${parts[0]}` : month;
                    return (
                      <div key={month} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="text-xs font-medium text-gray-600">{dateFormatted}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">{count} commandes</span>
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Profil Utilisateur */}
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Target className="h-4 w-4 text-white" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Profil Actuel</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/10">
                <span className="text-indigo-300">Rôle</span>
                <span className="font-bold text-white">{currentUser?.role || "Utilisateur"}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/10">
                <span className="text-indigo-300">Service majeur</span>
                <span className="font-bold text-white truncate max-w-[140px]">{topAgency[0]}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-indigo-300">Fournisseur majeur</span>
                <span className="font-bold text-white truncate max-w-[140px]">{topSupplier[0]}</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-indigo-300">Total commandes</span>
                <span className="font-bold text-white">{stats.totalGlobal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dernières Commandes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Dernières commandes</h3>
            </div>
            <button 
              onClick={() => onNavigate("Commandes")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">Aucune commande récente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">N° Commande</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Désignation</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Service</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Fournisseur</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((cmd, idx) => (
                  <tr key={cmd.Id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-3 px-5">
                      <span className="text-xs font-bold text-indigo-600">{cmd.NoBonCommande}</span>
                    </td>
                    <td className="py-3 px-5 text-xs text-gray-500">
                      {new Date(cmd.DateEmission).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-xs text-gray-700 line-clamp-1 max-w-xs">{cmd.Designation}</span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-xs font-medium text-gray-600">{cmd.Agence}</span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                        {cmd.Fournisseur || "Local"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold ${
                        cmd.Statut === "Livré" ? "bg-emerald-100 text-emerald-700" :
                        cmd.Statut === "En cours" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {cmd.Statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}