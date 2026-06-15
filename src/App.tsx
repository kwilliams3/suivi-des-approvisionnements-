/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { api } from "./services/api";
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Archive, 
  LayoutDashboard,
  ClipboardList,
  Store,
  Users2,
  Settings,
  LogOut,
  User,
  Shield,
  Eye,
  EyeOff,
  BellRing,
  Globe2,
  Lock,
  Menu,
  X
} from "lucide-react";

// Views imports
import DashboardView from "./components/DashboardView";
import OrdersView from "./components/OrdersView";
import SuppliersView from "./components/SuppliersView";
import ArchivesView from "./components/ArchivesView";
import UsersView from "./components/UsersView";
import SettingsView from "./components/SettingsView";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(api.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Tableau de bord");
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Form Fields for Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Mobile sidebar trigger
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Real-time notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Array<{ id: string; data: any }>>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Check login and fetch details on load
  useEffect(() => {
    async function loadMe() {
      if (api.isAuthenticated()) {
        try {
          setIsLoadingUser(true);
          const user = await api.auth.me();
          setCurrentUser(user);
          setIsAuthenticated(true);
        } catch (err) {
          console.error("Session expirée", err);
          api.auth.logout();
          setIsAuthenticated(false);
          setCurrentUser(null);
        } finally {
          setIsLoadingUser(false);
        }
      }
    }
    loadMe();
  }, [isAuthenticated]);

  // SSE Listener for real-time notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    let eventSource: EventSource | null = null;
    let timerId: any = null;

    function setupSSE() {
      // Create EventSource matching the SSE root stream
      eventSource = new EventSource("/api/notifications/stream");

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "notification" && payload.data) {
            const newNotif = payload.data;
            
            // Add notification to state, keeping list unique and sorted (idempotent)
            setNotifications((prev) => {
              if (prev.some((n) => n.Id === newNotif.Id)) return prev;
              return [newNotif, ...prev];
            });

            // Trigger a toast popup on-screen!
            const toastId = Math.random().toString();
            setToasts((prev) => [...prev, { id: toastId, data: newNotif }]);

            // Automatically dismiss toast after 8 seconds
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 8000);
          }
        } catch (e) {
          // Skipping keep-alive lines
        }
      };

      eventSource.onerror = (err) => {
        console.warn("SSE stream interrupted. Reconnecting in 5s...", err);
        if (eventSource) {
          eventSource.close();
        }
        timerId = setTimeout(setupSSE, 5000);
      };
    }

    // Load past notifications on startup
    async function fetchPastNotifications() {
      try {
        const past = await api.notifications.getAll();
        setNotifications(past);
      } catch (err) {
        console.error("Could not fetch past notifications", err);
      }
    }

    fetchPastNotifications();
    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [isAuthenticated]);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!username.trim() || !password.trim()) {
      setLoginError("Veuillez saisir des identifiants valides.");
      return;
    }

    try {
      const res = await api.auth.login(username, password);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      setActiveTab("Tableau de bord");
    } catch (err: any) {
      setLoginError(err.message || "Impossible de se connecter.");
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    api.auth.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setShowLogoutModal(false);
  };

  // Helper to render target view layout
  const renderTabContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case "Tableau de bord":
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} currentUser={currentUser} />;
      case "Commandes":
        return <OrdersView currentUser={currentUser} />;
      case "Services & Agences":
        return currentUser.role === "Administrateur" ? (
          <SuppliersView currentUser={currentUser} />
        ) : (
          <DashboardView onNavigate={(tab) => setActiveTab(tab)} currentUser={currentUser} />
        );
      case "Archives":
        return <ArchivesView currentUser={currentUser} />;
      case "Utilisateurs":
        return <UsersView currentUser={currentUser} />;
      case "Paramètres":
        return <SettingsView currentUser={currentUser} />;
      default:
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} currentUser={currentUser} />;
    }
  };

  // Login View layout
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-150 shadow-xl overflow-hidden p-8 space-y-6 animate-fade-in">
          
          {/* Logo Title section */}
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-md">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Suivi des Approvisionnements</h1>
              <p className="text-xs text-gray-500 mt-1 font-medium">Saisissez vos identifiants pour vous connecter à votre espace sécurisé.</p>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3 text-xs font-bold text-red-800">
              {loginError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 block">Nom d'utilisateur *</label>
              <input
                type="text"
                required
                placeholder="Ex : admin ou user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-semibold text-gray-800 focus:outline-indigo-500"
              />
            </div>

            <div className="space-y-1 relative">
              <label className="text-xs font-bold text-gray-600 block">Mot de passe corporatif *</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Ex : admin123 ou user123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold text-gray-800 focus:outline-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8.5 text-gray-400 hover:text-gray-650 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs p-3.5 rounded-lg shadow-sm transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              Se Connecter à l'Application
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active Main dashboard View Page layout
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Upper header */}
      <header className="bg-white border-b border-gray-150 h-16 shrink-0 relative px-4 flex items-center justify-between z-30 shadow-3xs">
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 lg:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Suivi Approvisionnements</h1>
            </div>
          </div>
        </div>

        {/* User identification capsule */}
        {currentUser && (
          <div className="flex items-center gap-2.5 sm:gap-4 relative">
            {/* Real-time Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-full transition relative cursor-pointer"
                title="Notifications en temps réel"
                id="btn-notification-bell"
              >
                <BellRing className="h-5 w-5" />
                {notifications.filter(n => !n.Lue).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4.5 min-w-4.5 px-1 bg-red-600 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center animate-bounce shadow-sm">
                    {notifications.filter(n => !n.Lue).length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Container */}
              {showNotificationDropdown && (
                <div 
                  className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-gray-150 rounded-xl shadow-xl z-50 overflow-hidden font-sans animate-fade-in"
                  id="notification-dropdown"
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-extrabold text-[10px] text-gray-500 uppercase tracking-wider">Notifications Système</h3>
                    <div className="flex gap-2 text-[10px]">
                      {notifications.some(n => !n.Lue) && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await api.notifications.markAllRead();
                              setNotifications(res.notifications);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-extrabold transition cursor-pointer"
                        >
                          Tout lu
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button 
                          onClick={async () => {
                            if (window.confirm("Voulez-vous vider l'historique des notifications ?")) {
                              try {
                                const res = await api.notifications.clear();
                                setNotifications(res.notifications || []);
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}
                          className="text-red-500 hover:text-red-700 font-extrabold transition cursor-pointer ml-1"
                        >
                          Vider
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-100" id="notification-items-container">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400 font-semibold space-y-1">
                        <BellRing className="h-8 w-8 mx-auto text-gray-300 stroke-1" />
                        <p>Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.Id} 
                          className={`p-3.5 hover:bg-gray-50 transition relative flex gap-3 text-xs ${!notif.Lue ? "bg-indigo-50/20 border-l-2 border-indigo-500" : ""}`}
                          onClick={async () => {
                            if (!notif.Lue) {
                              try {
                                const res = await api.notifications.markRead(notif.Id);
                                setNotifications(res.notifications);
                              } catch (err) {
                                        console.error(err);
                              }
                            }
                          }}
                        >
                          <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-extrabold ${
                            notif.NouveauStatut.includes("Livré") ? "bg-emerald-100 text-emerald-700" :
                            notif.NouveauStatut.includes("Non livré") ? "bg-red-100 text-red-700" :
                            notif.NouveauStatut.includes("Archivée") ? "bg-amber-100 text-amber-700" :
                            "bg-indigo-100 text-indigo-700"
                          }`}>
                            {notif.NouveauStatut.includes("Livré") ? "✓" : 
                             notif.NouveauStatut.includes("Non livré") ? "✕" : "!"}
                          </div>

                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">
                              Cmd <span className="text-indigo-600 font-extrabold">{notif.NoBonCommande}</span>
                            </p>
                            <p className="text-gray-500 font-medium text-[11px] line-clamp-2">
                              {notif.Designation}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mt-1">
                              <span className="text-gray-500">Statut:</span>
                              <span className="text-gray-750 bg-gray-100 px-1.5 py-0.5 rounded-sm uppercase tracking-wide text-[9px] font-extrabold">{notif.NouveauStatut}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium pt-1">
                              <span>Modifié par: {notif.ModifiePar}</span>
                              <span>{new Date(notif.Date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-gray-800">{currentUser.prenom} {currentUser.nom}</span>
              <span className="text-[10px] font-extrabold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded-sm w-fit ml-auto">
                {currentUser.role}
              </span>
            </div>
            
            <div className="h-9 w-9 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center text-xs">
              {currentUser.prenom[0]}{currentUser.nom[0]}
            </div>
          </div>
        )}
      </header>

      {/* Side drawer and tab routing container */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className={`
          fixed inset-y-16 left-0 bg-white border-r border-gray-150 w-64 z-20 transition-transform transform lg:translate-x-0 lg:static lg:h-auto
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="flex flex-col h-full justify-between p-4 space-y-4">
            <nav className="space-y-1.5 text-xs">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider px-3 pb-2">Menu des opérations</p>
              
              {/* Dashboard */}
              <button
                onClick={() => { setActiveTab("Tableau de bord"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold cursor-pointer transition ${
                  activeTab === "Tableau de bord" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <LayoutDashboard className="h-4.5 w-4.5" /> Tableau de bord
              </button>

              {/* Orders */}
              <button
                onClick={() => { setActiveTab("Commandes"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold cursor-pointer transition ${
                  activeTab === "Commandes" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <ClipboardList className="h-4.5 w-4.5" /> Commandes
              </button>

              {/* Services & Agences - Admin Only */}
              {currentUser?.role === "Administrateur" && (
                <button
                  onClick={() => { setActiveTab("Services & Agences"); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold cursor-pointer transition ${
                    activeTab === "Services & Agences" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Store className="h-4.5 w-4.5" /> Services & Agences
                </button>
              )}

              {/* Archives */}
              <button
                onClick={() => { setActiveTab("Archives"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold cursor-pointer transition ${
                  activeTab === "Archives" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Archive className="h-4.5 w-4.5" /> Archives
              </button>

              {/* Admin Only: Users account */}
              {currentUser?.role === "Administrateur" && (
                <button
                  onClick={() => { setActiveTab("Utilisateurs"); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold cursor-pointer transition ${
                    activeTab === "Utilisateurs" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Users2 className="h-4.5 w-4.5" /> Utilisateurs (Admin)
                </button>
              )}

              {/* Paramètres */}
              <button
                onClick={() => { setActiveTab("Paramètres"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold cursor-pointer transition ${
                  activeTab === "Paramètres" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Settings className="h-4.5 w-4.5" /> Paramètres
              </button>
            </nav>

            {/* Logout panel */}
            <div className="pt-4 border-t border-gray-150 text-xs">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 text-red-650 hover:bg-red-50 hover:text-red-700 rounded-xl font-bold transition cursor-pointer"
              >
                <LogOut className="h-4.5 w-4.5" /> Déconnexion
              </button>
            </div>
          </div>
        </aside>

        {/* Content routing stage */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderTabContent()}
        </main>
      </div>

      {/* Real-time Toast Messages Area */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none" id="realtime-toasts-area">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 p-4 flex gap-3 text-xs overflow-hidden animate-slide-in"
          >
            <div className="bg-indigo-600 text-white h-7 w-7 rounded-sm flex items-center justify-center shrink-0">
              <BellRing className="h-4 w-4" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-400 uppercase text-[9px] tracking-wide">Mise à jour statut</span>
                <span className="text-[10px] text-slate-400 font-medium">À l'instant</span>
              </div>
              <p className="font-bold text-slate-100">Commande {toast.data.NoBonCommande}</p>
              <p className="text-slate-350 leading-relaxed font-normal text-[11px] line-clamp-2">
                Nouveau Statut: <span className="bg-slate-800 px-1.5 py-0.5 text-emerald-400 rounded-sm font-bold uppercase tracking-wider text-[9px] font-sans">{toast.data.NouveauStatut}</span>
              </p>
              <p className="text-[10px] text-slate-400 pt-1 font-semibold">Par : {toast.data.ModifiePar}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white transition h-4 w-4 shrink-0 cursor-pointer pointer-events-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <LogOut className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">
                Confirmation de Déconnexion
              </h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed font-semibold">
              Désirez-vous fermer votre session de suivi ? Vous devrez saisir vos identifiants à nouveau pour accéder à l'application.
            </p>

            <div className="flex justify-end gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
