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
  X,
  Sparkles,
  TrendingUp,
  Package,
  Truck,
  ChevronRight,
  CircleDot,
  Home
} from "lucide-react";

// Views imports
import DashboardView from "./components/DashboardView";
import OrdersView from "./components/OrdersView";
import SuppliersView from "./components/SuppliersView";
import ArchivesView from "./components/ArchivesView";
import UsersView from "./components/UsersView";
import SettingsView from "./components/SettingsView";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Tableau de bord");
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Form Fields for Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Mobile sidebar trigger
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Real-time notifications state
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  
  // Current year for copyright
  const currentYear = new Date().getFullYear();

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

    let eventSource = null;
    let timerId = null;

    function setupSSE() {
      eventSource = new EventSource("/api/notifications/stream");

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "notification" && payload.data) {
            const newNotif = payload.data;
            
            setNotifications((prev) => {
              if (prev.some((n) => n.Id === newNotif.Id)) return prev;
              return [newNotif, ...prev];
            });

            const toastId = Math.random().toString();
            setToasts((prev) => [...prev, { id: toastId, data: newNotif }]);

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

  const handleLoginSubmit = async (e) => {
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
    } catch (err) {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden p-8 space-y-6 animate-fade-in-up relative z-10">
          
          {/* Logo Title section with animation */}
          <div className="text-center space-y-3">
            <div className="relative inline-block mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur-lg opacity-60 animate-pulse"></div>
              <div className="relative h-16 w-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg transform transition-transform hover:scale-110 duration-300">
                <Package className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Suivi des Approvisionnements
              </h1>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Plateforme centralisée de gestion des commandes
              </p>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 text-xs font-semibold text-red-800 animate-shake">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {loginError}
              </div>
            </div>
          )}

          {/* Login Form with enhanced styling */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-indigo-500" />
                Nom d'utilisateur
              </label>
              <input
                type="text"
                required
                placeholder="ex: admin ou utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 focus:shadow-lg"
              />
            </div>

            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-gray-700 block flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-indigo-500" />
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 pr-10 focus:shadow-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="relative w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:via-indigo-600 hover:to-purple-700 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Se connecter
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </form>

          {/* Footer info */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">
              Système sécurisé - Tous les accès sont journalisés
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active Main dashboard View Page layout - SIDEBAR TOTALLY FIXED
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header - Fixed at top with glassmorphism */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 h-16 shrink-0 z-30 px-6 flex items-center justify-between shadow-lg sticky top-0">
        <div className="flex items-center gap-4">
          {/* Mobile menu button with better animation */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 lg:hidden transition-all duration-200"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
              <div className="relative h-9 w-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md transform group-hover:scale-110 transition-transform duration-300">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Suivi Approvisionnements
              </h1>
              <p className="text-[10px] text-gray-500 hidden sm:block">Gestion optimisée des commandes</p>
            </div>
          </div>
        </div>

        {/* Enhanced user section */}
        {currentUser && (
          <div className="flex items-center gap-3">
            {/* Notification Bell with improved design */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 rounded-full transition-all duration-200"
                title="Notifications en temps réel"
              >
                <BellRing className="h-5 w-5" />
                {notifications.filter(n => !n.Lue).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-lg animate-bounce">
                    {notifications.filter(n => !n.Lue).length > 9 ? '9+' : notifications.filter(n => !n.Lue).length}
                  </span>
                )}
              </button>

              {/* Enhanced Notification Dropdown */}
              {showNotificationDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40 lg:hidden"
                    onClick={() => setShowNotificationDropdown(false)}
                  ></div>
                  <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform transition-all duration-200 animate-fade-in-down">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                          <BellRing className="h-3 w-3 text-white" />
                        </div>
                        <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                      </div>
                      <div className="flex gap-2">
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
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition px-2 py-1 rounded hover:bg-indigo-50"
                          >
                            Tout lire
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button 
                            onClick={async () => {
                              if (window.confirm("Vider l'historique des notifications ?")) {
                                try {
                                  const res = await api.notifications.clear();
                                  setNotifications(res.notifications || []);
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold transition px-2 py-1 rounded hover:bg-red-50"
                          >
                            Vider
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="p-12 text-center">
                          <BellRing className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                          <p className="text-sm text-gray-400 font-medium">Aucune notification</p>
                          <p className="text-xs text-gray-300 mt-1">Les mises à jour apparaîtront ici</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.Id} 
                            className={`p-4 hover:bg-gray-50 transition-all duration-150 cursor-pointer group ${!notif.Lue ? "bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-l-4 border-indigo-500" : ""}`}
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
                            <div className="flex gap-3">
                              <div className={`h-10 w-10 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold transition-all ${
                                notif.NouveauStatut.includes("Livré") ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white group-hover:scale-110" :
                                notif.NouveauStatut.includes("Non livré") ? "bg-gradient-to-br from-red-500 to-pink-600 text-white group-hover:scale-110" :
                                notif.NouveauStatut.includes("Archivée") ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white group-hover:scale-110" :
                                "bg-gradient-to-br from-indigo-500 to-purple-600 text-white group-hover:scale-110"
                              } transition-transform duration-200`}>
                                {notif.NouveauStatut.includes("Livré") ? <Truck className="h-5 w-5" /> : 
                                 notif.NouveauStatut.includes("Non livré") ? <XCircle className="h-5 w-5" /> : 
                                 <Clock className="h-5 w-5" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm">
                                  Commande <span className="text-indigo-600">#{notif.NoBonCommande}</span>
                                </p>
                                <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                                  {notif.Designation}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    notif.NouveauStatut.includes("Livré") ? "bg-emerald-100 text-emerald-700" :
                                    notif.NouveauStatut.includes("Non livré") ? "bg-red-100 text-red-700" :
                                    "bg-amber-100 text-amber-700"
                                  }`}>
                                    {notif.NouveauStatut}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                                  <span>Par {notif.ModifiePar}</span>
                                  <span>{new Date(notif.Date).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User info with improved design */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-gray-800">{currentUser.prenom} {currentUser.nom}</span>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <Shield className="h-3 w-3 text-indigo-500" />
                <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent uppercase">
                  {currentUser.role}
                </span>
              </div>
            </div>
            
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold rounded-xl flex items-center justify-center text-sm shadow-lg transform transition-transform hover:scale-110 duration-300">
              {currentUser.prenom?.[0]}{currentUser.nom?.[0]}
            </div>
          </div>
        )}
      </header>

      {/* Main content area with fixed sidebar - ABSOLUTELY NO SCROLL ON SIDEBAR */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Enhanced Navigation Sidebar - COMPLETELY FIXED, NO SCROLL WHATSOEVER */}
        <aside className={`
          fixed inset-y-16 left-0 bg-white border-r border-gray-200 w-72 z-20 transition-all duration-300 transform shadow-2xl lg:shadow-none lg:translate-x-0 lg:static lg:inset-auto
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="h-full flex flex-col">
            {/* Navigation items - FIXED, NO SCROLLING - All items fit perfectly */}
            <div className="flex-1 py-6 px-4 overflow-y-auto">
              <nav className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pb-2">
                  Menu principal
                </p>
                
                {/* Dashboard - always visible */}
                <NavItem 
                  icon={LayoutDashboard}
                  label="Tableau de bord"
                  isActive={activeTab === "Tableau de bord"}
                  onClick={() => { setActiveTab("Tableau de bord"); setMobileMenuOpen(false); }}
                  color="indigo"
                />
                
                {/* Orders - always visible */}
                <NavItem 
                  icon={ClipboardList}
                  label="Commandes"
                  isActive={activeTab === "Commandes"}
                  onClick={() => { setActiveTab("Commandes"); setMobileMenuOpen(false); }}
                  color="blue"
                />
                
                {/* Services & Agences - Admin only */}
                {currentUser?.role === "Administrateur" && (
                  <NavItem 
                    icon={Store}
                    label="Services & Agences"
                    isActive={activeTab === "Services & Agences"}
                    onClick={() => { setActiveTab("Services & Agences"); setMobileMenuOpen(false); }}
                    color="purple"
                  />
                )}
                
                {/* Archives - always visible */}
                <NavItem 
                  icon={Archive}
                  label="Archives"
                  isActive={activeTab === "Archives"}
                  onClick={() => { setActiveTab("Archives"); setMobileMenuOpen(false); }}
                  color="amber"
                />
                
                {/* Users - Admin only */}
                {currentUser?.role === "Administrateur" && (
                  <NavItem 
                    icon={Users2}
                    label="Utilisateurs"
                    isActive={activeTab === "Utilisateurs"}
                    onClick={() => { setActiveTab("Utilisateurs"); setMobileMenuOpen(false); }}
                    color="emerald"
                  />
                )}
                
                {/* Separator for settings */}
                <div className="my-4 border-t border-gray-100"></div>
                
                {/* Settings - always visible */}
                <NavItem 
                  icon={Settings}
                  label="Paramètres"
                  isActive={activeTab === "Paramètres"}
                  onClick={() => { setActiveTab("Paramètres"); setMobileMenuOpen(false); }}
                  color="gray"
                />
              </nav>
            </div>

            {/* Logout section - ALWAYS AT BOTTOM, NEVER SCROLLS */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-semibold text-sm transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="h-5 w-5 transition-transform group-hover:scale-110" />
                  <span>Déconnexion</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              {/* Copyright with dynamic year */}
              <p className="text-[10px] text-gray-400 text-center mt-3">
                © {currentYear} - Tous droits réservés
              </p>
            </div>
          </div>
        </aside>

        {/* Content area - ONLY THIS SCROLLS */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Enhanced Toast Messages */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="bg-white rounded-xl shadow-2xl border border-gray-100 p-4 flex gap-3 text-sm overflow-hidden animate-slide-in-right transform transition-all duration-300 hover:scale-105 cursor-pointer"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          >
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-md">
              <Truck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-emerald-600 text-xs uppercase tracking-wide">Mise à jour statut</span>
                <span className="text-xs text-gray-400 font-medium">À l'instant</span>
              </div>
              <p className="font-bold text-gray-800 text-sm">Commande #{toast.data.NoBonCommande}</p>
              <p className="text-gray-600 text-xs mt-1 line-clamp-2">{toast.data.Designation}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700">
                  <TrendingUp className="h-3 w-3" />
                  {toast.data.NouveauStatut}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2 font-medium">Par {toast.data.ModifiePar}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }}
              className="text-gray-400 hover:text-gray-600 transition h-5 w-5 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Enhanced Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 transform animate-scale-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-xl shadow-lg transform animate-pulse">
                <LogOut className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Confirmer la déconnexion
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Êtes-vous sûr de vouloir quitter ?
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Vous devrez vous reconnecter pour accéder à nouveau à votre tableau de bord.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 transform hover:scale-105"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.4s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

// Navigation Item Component for better organization
const NavItem = ({ icon: Icon, label, isActive, onClick, color }) => {
  const colorGradients = {
    indigo: "from-indigo-600 to-indigo-700",
    blue: "from-blue-600 to-blue-700",
    purple: "from-purple-600 to-purple-700",
    amber: "from-amber-600 to-amber-700",
    emerald: "from-emerald-600 to-emerald-700",
    gray: "from-gray-600 to-gray-700"
  };
  
  const activeBg = colorGradients[color] || colorGradients.indigo;
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 group ${
        isActive 
          ? `bg-gradient-to-r ${activeBg} text-white shadow-md transform scale-[1.02]` 
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 transition-all ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"} ${!isActive && "group-hover:scale-110"}`} />
        <span>{label}</span>
      </div>
      {isActive && <ChevronRight className="h-4 w-4 text-white/70" />}
    </button>
  );
};