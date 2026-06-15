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
  ArrowRight
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
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Calcul des statistiques en temps réel...</p>
        </div>
      </div>
    );
  }

  // Find most active agency and supplier
  const topAgency = (Object.entries(stats.byAgency) as [string, number][]).sort((a,b) => b[1] - a[1])[0] || ["Aucune", 0];
  const topSupplier = (Object.entries(stats.bySupplier) as [string, number][]).sort((a,b) => b[1] - a[1])[0] || ["Aucun", 0];

  return (
    <div className="space-y-6">
      {/* Welcome & Context Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-l-4 border-indigo-600 rounded-r-xl p-4.5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
            <Building2 className="h-4.5 w-4.5 text-indigo-600" />
            Tableau de Bord Analytique &mdash; {currentUser?.role === "Administrateur" ? "Supervision Globale" : `Espace Service : ${currentUser?.service || "Aucun"}`}
          </h2>
          <p className="text-[11px] text-indigo-900 mt-0.5 font-medium">
            {currentUser?.role === "Administrateur" 
              ? "Vous visualisez et analysez la totalité des flux pour tous les départements et services actifs." 
              : `Sécurisation d'accès : Affichage restreint exclusivement aux données de votre service : "${currentUser?.service || 'Non rattaché'}"`}
          </p>
        </div>
        <div className="text-[11px] font-bold text-gray-500 bg-white/80 backdrop-blur-xs border border-gray-100 px-3 py-1.5 rounded-lg shrink-0">
          Session : <span className="text-indigo-700">{currentUser?.nom} {currentUser?.prenom}</span>
        </div>
      </div>

      {/* Upper Alerts Banner */}
      {(delayedOrders.length > 0 || upcomingOrders.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {delayedOrders.length > 0 && (
            <div id="alert-delay" className="flex items-start gap-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 shadow-sm animate-pulse">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-800">Alertes Commandes de Livraison en Retard ({delayedOrders.length})</h4>
                <p className="text-xs text-red-700 mt-1">Vous avez des commandes actives dont la date de livraison prévue est dépassée.</p>
                <button 
                  onClick={() => onNavigate("Commandes")} 
                  className="mt-2 text-xs font-semibold text-red-800 hover:underline flex items-center gap-1"
                >
                  Inspecter les retards <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {upcomingOrders.length > 0 && (
            <div id="alert-upcoming" className="flex items-start gap-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 shadow-sm">
              <Bell className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-800">Alertes Échéances Imminentes ({upcomingOrders.length})</h4>
                <p className="text-xs text-amber-700 mt-1">Commandes devant être livrées aujourd'hui ou dans les prochaines 72 heures.</p>
                <button 
                  onClick={() => onNavigate("Commandes")} 
                  className="mt-2 text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1"
                >
                  Voir les commandes imminentes <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Metric Card */}
        <div id="kpi-total" className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Actives</span>
            <span className="p-2 rounded-lg bg-gray-50 text-gray-500">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-gray-900">{stats.totalActives}</h3>
            <p className="text-xs text-gray-500 mt-1">Commandes en cours ou en attente</p>
          </div>
        </div>

        {/* En Cours Metric Card */}
        <div id="kpi-encours" className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">En Cours</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4 animate-spin-slow" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-amber-700">{stats.enCours}</h3>
            <p className="text-xs text-gray-500 mt-1">En cours de traitement</p>
          </div>
        </div>

        {/* Livrées Metric Card */}
        <div id="kpi-livre" className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Livrées</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-emerald-700">{stats.livres}</h3>
            <p className="text-xs text-gray-500 mt-1">Livrées et vérifiées</p>
          </div>
        </div>

        {/* Non Livrées Metric Card */}
        <div id="kpi-nonlivre" className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-600">Non Livrées</span>
            <span className="p-2 rounded-lg bg-red-50 text-red-600">
              <XCircle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-red-700">{stats.nonLivres}</h3>
            <p className="text-xs text-gray-500 mt-1">Problèmes d'approvisionnement</p>
          </div>
        </div>

        {/* Archives Metric Card */}
        <div id="kpi-archive" className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs col-span-2 lg:col-span-1 flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Archivées</span>
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Archive className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-indigo-700">{stats.archives}</h3>
            <p className="text-xs text-gray-500 mt-1">Retirées du tableau principal</p>
          </div>
        </div>
      </div>

      {/* Analytical Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Agency distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              Répartition par Service
            </h3>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">Services</span>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {Object.entries(stats.byAgency).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Aucune commande enregistrée</p>
            ) : (
              (Object.entries(stats.byAgency) as [string, number][])
                .sort((a,b) => b[1] - a[1])
                .slice(0, 7)
                .map(([agency, count]) => {
                  const percentage = stats.totalGlobal > 0 ? (count / stats.totalGlobal) * 100 : 0;
                  return (
                    <div key={agency} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-gray-700">
                        <span>{agency}</span>
                        <span className="text-gray-500">{count} commande{count > 1 ? "s" : ""} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
          {Object.keys(stats.byAgency).length > 7 && (
            <p className="text-[11px] text-center text-gray-400 font-medium">+ {Object.keys(stats.byAgency).length - 7} autres services actifs</p>
          )}
        </div>

        {/* Center column: Supplier distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <UserSquare className="h-4 w-4 text-gray-500" />
              Répartition par Fournisseur
            </h3>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">Achats/Logistique</span>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {Object.entries(stats.bySupplier).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Aucun fournisseur associé</p>
            ) : (
              (Object.entries(stats.bySupplier) as [string, number][])
                .sort((a,b) => b[1] - a[1])
                .slice(0, 7)
                .map(([supplier, count]) => {
                  const percentage = stats.totalGlobal > 0 ? (count / stats.totalGlobal) * 100 : 0;
                  return (
                    <div key={supplier} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-gray-700">
                        <span className="truncate max-w-[180px]" title={supplier}>{supplier}</span>
                        <span className="text-gray-500">{count} cmd ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Right column: Evolution and Summary metrics */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                Derniers Rapports Mensuels
              </h3>
            </div>
            <div className="mt-4 space-y-3">
              {Object.entries(stats.byMonth).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Aucune tendance chronologique</p>
              ) : (
                (Object.entries(stats.byMonth) as [string, number][])
                  .sort((a,b) => b[0].localeCompare(a[0]))
                  .slice(0, 4)
                  .map(([month, count]) => {
                    const parts = month.split("-");
                    const dateFormatted = parts.length === 2 ? `${parts[1]}/${parts[0]}` : month;
                    return (
                      <div key={month} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-700">{dateFormatted}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{count} commande{count > 1 ? "s" : ""}</span>
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-indigo-100 rounded-lg p-4 space-y-3 mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Profil Actuel</h4>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Rôle:</span>
                <span className="font-bold text-white">{currentUser?.role || "Utilisateur"}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Majeur:</span>
                <span className="font-bold text-white truncate max-w-[120px]">{topAgency[0]} ({topAgency[1]} cmd)</span>
              </div>
              <div className="flex justify-between">
                <span>Fournisseur Majeur:</span>
                <span className="font-bold text-white truncate max-w-[120px]">{topSupplier[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Mini-Feed */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">
          Dernières commandes ajoutées au registre
        </h3>
        {recentOrders.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">Aucune commande active enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase bg-gray-50">
                  <th className="py-2.5 px-3">N° Bon Commande</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Fournisseur</th>
                  <th className="py-2.5 px-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((cmd) => (
                  <tr key={cmd.Id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-semibold text-gray-900">{cmd.NoBonCommande}</td>
                    <td className="py-3 px-3 text-gray-500">{new Date(cmd.DateEmission).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 px-3 text-gray-700 truncate max-w-xs">{cmd.Designation}</td>
                    <td className="py-3 px-3 font-bold text-gray-600">{cmd.Agence}</td>
                    <td className="py-3 px-3 text-gray-500">
                      <span className="inline-block truncate text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {cmd.Fournisseur || "Achat Local"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cmd.Statut === "Livré" ? "bg-emerald-100 text-emerald-800" :
                        cmd.Statut === "En cours" ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
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
