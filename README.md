# Architecture du Backend & Suivi des Approvisionnements

Ce dossier contient l'organisation complète de la structure de l'application divisée proprement entre le client (React + Vite) et l'architecture backend modulaire en JavaScript moderne (ES Modules).

## Structure du Dossier Backend

Conformément aux spécifications, le code serveur est structuré de la manière suivante :

```bash
├── backend/
│   ├── routes/
│   │   ├── auth.js          # Authentification / Connexion & Middlewares de sécurité
│   │   ├── users.js         # Administration des fiches utilisateurs rattachés (Admin Only)
│   │   ├── suppliers.js     # Gestion des fiches fournisseurs agréés
│   │   ├── orders.js        # Gestion dynamique des bons de commandes & archives
│   │   ├── stats.js         # Statistiques de performance d'approvisionnement
│   │   └── logs.js          # Audit système et traçabilité en temps réel
│   ├── models/
│   │   └── db.js            # Modèle de données persistantes & archivage automatique
│   ├── server.js            # Point d’entrée de l'application Express connectée à Vite
│   └── package.json         # Dépendances et scripts d'exécution du backend découpé
│
└── README.md                # Documentation globale d'administration
```

---

## Fonctionnalités Clés Implémentées

### 🔐 Authentification & Rôles
- **Génération de JWT (JSON Web Tokens)** robuste avec date de péremption sécurisée.
- **Middlewares de vérification de session** (`authenticator`, `adminOnly`) garantissant le cloisonnement strict des accès.
- **Hachage des mots de passe** avec l'algorithme cryptographique Blowfish `bcryptjs`.

### 📦 Routage Modulaire et REST
Chaque ressource possède son propre contrôleur dédié dans le sous-répertoire `/backend/routes/` pour garantir la lisibilité et l'extensibilité du code.

### 💾 Persistance de Données Réelle (Modèle JSON)
- Intégration en lecture/écriture structurée d'un modèle non relationnel performant doté d'intégrité référentielle en cascade pour les tables liées (`commandes`, `fournisseurs`, `logs`, etc.).

### ⚙️ Automatisation de l'Archivage (Watchdog)
- Processus autonome s'exécutant périodiquement en arrière-plan (intervalle régulier de 5 minutes) visant à déplacer automatiquement les commandes marquées comme **"Livré"** vers les archives de l'entreprise s'il dépasse le seuil paramétré par l'Administrateur.

---

## Guide d'Installation et de Démarrage Rapide

### 1. Prérequis
- [Node.js](https://nodejs.org/) (Version 16 ou supérieure recommandée)
- npm ou yarn

### 2. Démarrer le Serveur Backend
Pour démarrer le serveur individuellement et interagir avec l'API :

```bash
# Se positionner dans le dossier backend
cd backend

# Installer les dépendances
npm install

# Lancer l'application Express en environnement local
node server.js
```

Le point de terminaison de l'API sera alors accessible sur le port **3000** et servira automatiquement l'application front-end React en mode SPA unifiée.
