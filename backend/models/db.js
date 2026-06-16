import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import sql from "mssql";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "database.json");

const DEFAULT_AGENCIES = [
  "RH",
  "Moyens Généraux",
  "Fiscalité",
  "Sécurité",
  "Achat Import",
  "Courriel",
  "Commercial",
  "Informatique",
  "Supply chaine",
  "Marketing",
  "Contrôle de Gestion",
  "Garage",
  "Comptabilité",
  "Gestion Stock",
  "Transit",
  "Technique",
  "Secrétariat DG",
  "Achat Local",
  "Exploitation",
  "Logistique",
  "Contrôle et Audit Interne",
  "Archive",
  "Juridique"
];

const DEFAULT_PHYSICAL_AGENCIES = [
  "AKWA",
  "DIRECTION",
  "MBOPPI",
  "DOUCHE",
  "BEACH",
  "NDOGPASSI",
  "SODIKO",
  "EMERAUDE",
  "GRAND HANGAR",
  "YASSA",
  "SHOW ROOM",
  "CORON",
  "KRIBI",
  "HM MOKOLO",
  "PDV MOKOLO",
  "NLONGAK",
  "MESSASSI",
  "NGAOUNDERE",
  "BERTOUA",
  "BAMENDA",
  "TAMDJA",
  "DJELENG",
  "M110",
  "PK5",
  "M100",
  "M20",
  "M120",
  "M50",
  "Garage 120",
  "LDI MBOPPI",
  "LDI BESSENGUE",
  "LDI NKOMONDO",
  "PK11",
  "Parc Automobile",
  "SOCOPRODE",
  "Nkoabang"
];

// --- MSSQL Connection Pool Manager ---
let mssqlPool = null;
let mssqlCheckDone = false;
let isMssqlActive = false;

// Global memory cache to prevent any file writes when SQL Server 2014 is active
let memoryDb = null;
let mssqlInitialized = false;

function createDefaultStructure() {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHashed = bcrypt.hashSync("admin123", salt);
  return {
    utilisateurs: [
      {
        Id: "u-admin",
        Nom: "Admin",
        Prenom: "Gestion",
        Email: "admin@example.com",
        NomUtilisateur: "admin",
        MotDePasse: adminPasswordHashed,
        Role: "Administrateur",
        Statut: "Actif",
        Service: "",
        DateCreation: new Date().toISOString(),
      }
    ],
    commandes: [],
    fournisseurs: [],
    commandeFournisseurs: [],
    historiqueStatuts: [],
    logs: [
      {
        Id: "log-1",
        Action: "Initialisation Système",
        Utilisateur: "Système",
        DateAction: new Date().toISOString(),
        Details: "Initialisation de la base de données virtuelle en mémoire."
      }
    ],
    archiveConfig: {
      autoArchiveDays: 30,
      enableAutoArchive: true,
    },
    services: [...DEFAULT_AGENCIES],
    agences: [...DEFAULT_PHYSICAL_AGENCIES]
  };
}

async function getMssqlPool() {
  if (mssqlCheckDone) {
    return isMssqlActive ? mssqlPool : null;
  }

  // Check if configuration exists
  if (!process.env.DB_MSSQL_SERVER) {
    console.log("SQL Server : Aucun serveur SQL configuré. Utilisation exclusive de la base JSON.");
    mssqlCheckDone = true;
    isMssqlActive = false;
    return null;
  }

  try {
    const config = {
      server: process.env.DB_MSSQL_SERVER,
      user: process.env.DB_MSSQL_USER,
      password: process.env.DB_MSSQL_PASSWORD,
      database: process.env.DB_MSSQL_DATABASE,
      port: parseInt(process.env.DB_MSSQL_PORT || "1433", 10),
      options: {
        encrypt: process.env.DB_MSSQL_ENCRYPT === "true",
        trustServerCertificate: process.env.DB_MSSQL_TRUST_CERT === "true",
        enableArithAbort: true
      },
      connectionTimeout: 8000,
      requestTimeout: 15000
    };

    console.log(`Tentative de connexion à SQL Server (${config.server}:${config.port})...`);
    mssqlPool = await sql.connect(config);
    isMssqlActive = true;
    console.log("=================================================================");
    console.log("CONNEXION REUSSIE : Base de données active sur SQL Server 2014 !");
    console.log("=================================================================");
    
    // Auto-bootstrap schemas on first success if configured
    await bootstrapMssqlTables(mssqlPool);

    // Initial load from SQL Server tables directly into memory cache
    await loadDataFromMssql(mssqlPool);

    // Create system log about successful initialization
    const connLog = {
      Id: `log-conn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      Action: "Connexion Base de Données",
      Utilisateur: "Système",
      DateAction: new Date().toISOString(),
      Details: `Connexion établie avec succès à la base de données SQL Server 2014 (${config.server}:${config.port}).`
    };

    if (memoryDb) {
      if (!memoryDb.logs) memoryDb.logs = [];
      // To avoid duplicate system logs on every boot/hot-reload check:
      if (!memoryDb.logs.some(l => l.Action === "Connexion Base de Données" && new Date(l.DateAction).getTime() > Date.now() - 30000)) {
        memoryDb.logs.unshift(connLog);
        try {
          await mssqlPool.request()
            .input("id", sql.NVarChar, connLog.Id)
            .input("act", sql.NVarChar, connLog.Action)
            .input("usr", sql.NVarChar, connLog.Utilisateur)
            .input("dateAct", sql.DateTime, new Date())
            .input("det", sql.NVarChar, connLog.Details)
            .query("INSERT INTO dbo.Logs (Id, Action, Utilisateur, DateAction, Details) VALUES (@id, @act, @usr, @dateAct, @det)");
        } catch (dbErr) {
          console.error("SQL Server : Échec d'insertion du log de connexion :", dbErr.message);
        }
      }
    }

  } catch (err) {
    console.error("=================================================================");
    console.error("ERREUR DE CONNEXION SQL SERVER. Repli automatique sur base JSON.");
    console.error("Détail:", err.message);
    console.error("=================================================================");
    isMssqlActive = false;
    mssqlPool = null;
  }

  mssqlCheckDone = true;
  return isMssqlActive ? mssqlPool : null;
}

/**
 * Checks and creates tables on SQL Server 2014 if they are missing.
 * Also handles applying incremental column modifications like "Service" to the "Utilisateurs" table.
 */
async function bootstrapMssqlTables(pool) {
  try {
    // Basic verification check
    const checkTableQuery = "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Utilisateurs'";
    const res = await pool.request().query(checkTableQuery);
    if (res.recordset.length > 0) {
      console.log("SQL Server : Tables existantes détectées.");
      
      // Dynamic migration verify: Ensure column 'Service' exists in the table Utilisateurs (added in v2.0)
      const checkServiceCol = "SELECT COL_LENGTH('dbo.Utilisateurs', 'Service') AS ColLength";
      const resCol = await pool.request().query(checkServiceCol);
      if (resCol.recordset.length > 0 && resCol.recordset[0].ColLength === null) {
        console.log("SQL Server : Ajout de la colonne 'Service' manquante dans dbo.Utilisateurs...");
        await pool.request().query("ALTER TABLE dbo.Utilisateurs ADD Service NVARCHAR(150) NULL");
      }
      return;
    }

    console.log("SQL Server : Tables manquantes. Création de la structure SQL Server 2014...");
    
    // Create base tables
    await pool.request().query(`
      CREATE TABLE dbo.Services (
          Id INT IDENTITY(1,1) NOT NULL,
          Nom NVARCHAR(150) NOT NULL UNIQUE,
          CONSTRAINT PK_Services PRIMARY KEY CLUSTERED (Id ASC)
      );
      
      CREATE TABLE dbo.Agences (
          Id INT IDENTITY(1,1) NOT NULL,
          Nom NVARCHAR(150) NOT NULL UNIQUE,
          CONSTRAINT PK_Agences PRIMARY KEY CLUSTERED (Id ASC)
      );
      
      CREATE TABLE dbo.ArchiveConfig (
          Id INT IDENTITY(1,1) NOT NULL,
          AutoArchiveDays INT NOT NULL DEFAULT (30),
          EnableAutoArchive BIT NOT NULL DEFAULT (1),
          CONSTRAINT PK_ArchiveConfig PRIMARY KEY CLUSTERED (Id ASC)
      );

      CREATE TABLE dbo.Utilisateurs (
          Id NVARCHAR(50) NOT NULL,
          Nom NVARCHAR(100) NOT NULL,
          Prenom NVARCHAR(100) NOT NULL,
          Email NVARCHAR(150) NULL,
          NomUtilisateur NVARCHAR(50) NOT NULL UNIQUE,
          MotDePasse NVARCHAR(255) NOT NULL,
          Role NVARCHAR(50) NOT NULL DEFAULT ('Utilisateur'),
          Statut NVARCHAR(50) NOT NULL DEFAULT ('Actif'),
          Service NVARCHAR(150) NULL,
          DateCreation DATETIME NOT NULL DEFAULT (GETDATE()),
          CONSTRAINT PK_Utilisateurs PRIMARY KEY CLUSTERED (Id ASC)
      );

      CREATE TABLE dbo.Fournisseurs (
          Id NVARCHAR(50) NOT NULL,
          NomFournisseur NVARCHAR(150) NOT NULL,
          Contact NVARCHAR(150) NULL,
          Telephone NVARCHAR(100) NULL,
          TypeFournisseur NVARCHAR(50) NOT NULL DEFAULT ('Achat Local'),
          DateCreation DATETIME NOT NULL DEFAULT (GETDATE()),
          CONSTRAINT PK_Fournisseurs PRIMARY KEY CLUSTERED (Id ASC)
      );

      CREATE TABLE dbo.Commandes (
          Id NVARCHAR(50) NOT NULL,
          NoBonCommande NVARCHAR(100) NOT NULL,
          NoDS NVARCHAR(100) NULL,
          Designation NVARCHAR(MAX) NULL,
          Quantite INT NOT NULL DEFAULT (1),
          Prix DECIMAL(18,2) NULL,
          Fournisseur NVARCHAR(150) NULL DEFAULT (N'Achat Local'),
          Agence NVARCHAR(150) NULL,
          DateLivraison DATETIME NULL,
          Statut NVARCHAR(50) NOT NULL DEFAULT ('Saisie'),
          DateEmission DATETIME NOT NULL DEFAULT (GETDATE()),
          EstArchive BIT NOT NULL DEFAULT (0),
          DateArchivage DATETIME NULL,
          Observation NVARCHAR(MAX) NULL,
          DemandePar NVARCHAR(100) NULL,
          ServiceDemande NVARCHAR(100) NULL,
          DateCreation DATETIME NOT NULL DEFAULT (GETDATE()),
          DateModification DATETIME NULL,
          ModifiePar NVARCHAR(100) NULL,
          CONSTRAINT PK_Commandes PRIMARY KEY CLUSTERED (Id ASC)
      );

      CREATE TABLE dbo.HistoriqueStatuts (
          Id NVARCHAR(50) NOT NULL,
          CommandeId NVARCHAR(50) NOT NULL,
          AncienStatut NVARCHAR(50) NOT NULL,
          NouveauStatut NVARCHAR(50) NOT NULL,
          DateModification DATETIME NOT NULL DEFAULT (GETDATE()),
          ModifiePar NVARCHAR(100) NOT NULL,
          CONSTRAINT PK_HistoriqueStatuts PRIMARY KEY CLUSTERED (Id ASC),
          CONSTRAINT FK_HistStatuts_Commande FOREIGN KEY (CommandeId) REFERENCES dbo.Commandes (Id) ON DELETE CASCADE
      );

      CREATE TABLE dbo.Logs (
          Id NVARCHAR(50) NOT NULL,
          Action NVARCHAR(150) NOT NULL,
          Utilisateur NVARCHAR(100) NOT NULL,
          DateAction DATETIME NOT NULL DEFAULT (GETDATE()),
          Details NVARCHAR(MAX) NULL,
          CONSTRAINT PK_Logs PRIMARY KEY CLUSTERED (Id ASC)
      );

      CREATE TABLE dbo.Notifications (
          Id NVARCHAR(50) NOT NULL,
          CommandeId NVARCHAR(50) NULL,
          NoBonCommande NVARCHAR(100) NULL,
          Designation NVARCHAR(MAX) NULL,
          AncienStatut NVARCHAR(50) NULL,
          NouveauStatut NVARCHAR(50) NULL,
          ModifiePar NVARCHAR(100) NULL,
          Agence NVARCHAR(150) NULL,
          Date DATETIME NOT NULL DEFAULT (GETDATE()),
          Lue BIT NOT NULL DEFAULT (0),
          CONSTRAINT PK_Notifications PRIMARY KEY CLUSTERED (Id ASC),
          CONSTRAINT FK_Notifications_Commande FOREIGN KEY (CommandeId) REFERENCES dbo.Commandes (Id) ON DELETE SET NULL
      );
    `);

    // Bootstrap Reference / Configuration values
    await pool.request().query("INSERT INTO dbo.ArchiveConfig (AutoArchiveDays, EnableAutoArchive) VALUES (30, 1)");

    for (const s of DEFAULT_AGENCIES) {
      await pool.request().input("nom", sql.NVarChar, s).query("INSERT INTO dbo.Services (Nom) VALUES (@nom)");
    }
    for (const a of DEFAULT_PHYSICAL_AGENCIES) {
      await pool.request().input("nom", sql.NVarChar, a).query("INSERT INTO dbo.Agences (Nom) VALUES (@nom)");
    }

    // Default admin
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHashed = bcrypt.hashSync("admin123", salt);
    await pool.request()
      .input("id", sql.NVarChar, "u-admin")
      .input("nom", sql.NVarChar, "Admin")
      .input("prenom", sql.NVarChar, "Gestion")
      .input("email", sql.NVarChar, "admin@example.com")
      .input("username", sql.NVarChar, "admin")
      .input("password", sql.NVarChar, adminPasswordHashed)
      .input("role", sql.NVarChar, "Administrateur")
      .input("statut", sql.NVarChar, "Actif")
      .query(`
        INSERT INTO dbo.Utilisateurs (Id, Nom, Prenom, Email, NomUtilisateur, MotDePasse, Role, Statut, DateCreation)
        VALUES (@id, @nom, @prenom, @email, @username, @password, @role, @statut, GETDATE())
      `);

    console.log("SQL Server : Base bootstrappée avec succès !");
  } catch (err) {
    console.error("Erreur de bootstrap SQL Server:", err);
  }
}

/**
 * Hydrates our memoryDb structure directly and asynchronously from MS SQL Server tables
 */
async function loadDataFromMssql(pool) {
  try {
    console.log("SQL Server : Hydratation de notre cache mémoire depuis SQL Server...");
    const db = createDefaultStructure();

    // 1. Archive Config
    const rConfig = await pool.request().query("SELECT TOP 1 AutoArchiveDays, EnableAutoArchive FROM dbo.ArchiveConfig");
    if (rConfig.recordset.length > 0) {
      db.archiveConfig = {
        autoArchiveDays: rConfig.recordset[0].AutoArchiveDays,
        enableAutoArchive: rConfig.recordset[0].EnableAutoArchive === true || rConfig.recordset[0].EnableAutoArchive === 1
      };
    }

    // 2. Services
    const rServices = await pool.request().query("SELECT Nom FROM dbo.Services ORDER BY Nom ASC");
    if (rServices.recordset.length > 0) {
      db.services = rServices.recordset.map(row => row.Nom);
    }

    // 3. Agences
    const rAgences = await pool.request().query("SELECT Nom FROM dbo.Agences ORDER BY Nom ASC");
    if (rAgences.recordset.length > 0) {
      db.agences = rAgences.recordset.map(row => row.Nom);
    }

    // 4. Utilisateurs
    const rUsers = await pool.request().query("SELECT * FROM dbo.Utilisateurs");
    if (rUsers.recordset.length > 0) {
      db.utilisateurs = rUsers.recordset.map(row => ({
        Id: row.Id,
        Nom: row.Nom,
        Prenom: row.Prenom,
        Email: row.Email || "",
        NomUtilisateur: row.NomUtilisateur,
        MotDePasse: row.MotDePasse,
        Role: row.Role,
        Statut: row.Statut,
        Service: row.Service || "",
        DateCreation: row.DateCreation ? new Date(row.DateCreation).toISOString() : new Date().toISOString()
      }));
    }

    // 5. Fournisseurs
    const rFourn = await pool.request().query("SELECT * FROM dbo.Fournisseurs");
    db.fournisseurs = rFourn.recordset.map(row => ({
      Id: row.Id,
      NomFournisseur: row.NomFournisseur,
      Contact: row.Contact || "",
      Telephone: row.Telephone || "",
      TypeFournisseur: row.TypeFournisseur,
      DateCreation: row.DateCreation ? new Date(row.DateCreation).toISOString() : new Date().toISOString()
    }));

    // 6. Commandes
    const rCmd = await pool.request().query("SELECT * FROM dbo.Commandes");
    db.commandes = rCmd.recordset.map(row => ({
      Id: row.Id,
      NoBonCommande: row.NoBonCommande,
      NoDS: row.NoDS || "",
      Designation: row.Designation || "",
      Quantite: row.Quantite || 1,
      Prix: row.Prix !== null ? parseFloat(row.Prix) : null,
      Fournisseur: row.Fournisseur || "",
      Agence: row.Agence || "",
      DateLivraison: row.DateLivraison ? new Date(row.DateLivraison).toISOString() : null,
      Statut: row.Statut,
      DateEmission: row.DateEmission ? new Date(row.DateEmission).toISOString() : new Date().toISOString(),
      EstArchive: row.EstArchive === true || row.EstArchive === 1,
      DateArchivage: row.DateArchivage ? new Date(row.DateArchivage).toISOString() : null,
      Observation: row.Observation || "",
      DemandePar: row.DemandePar || "",
      CreePar: row.DemandePar || "",
      ServiceDemande: row.ServiceDemande || "",
      DateCreation: row.DateCreation ? new Date(row.DateCreation).toISOString() : new Date().toISOString(),
      DateModification: row.DateModification ? new Date(row.DateModification).toISOString() : null,
      ModifiePar: row.ModifiePar || ""
    }));

    // 7. HistoriqueStatuts
    const rHist = await pool.request().query("SELECT * FROM dbo.HistoriqueStatuts");
    db.historiqueStatuts = rHist.recordset.map(row => ({
      Id: row.Id,
      CommandeId: row.CommandeId,
      AncienStatut: row.AncienStatut,
      NouveauStatut: row.NouveauStatut,
      DateModification: row.DateModification ? new Date(row.DateModification).toISOString() : new Date().toISOString(),
      ModifiePar: row.ModifiePar
    }));

    // 8. Logs
    const rLogs = await pool.request().query("SELECT TOP 1000 * FROM dbo.Logs ORDER BY DateAction DESC");
    db.logs = rLogs.recordset.map(row => ({
      Id: row.Id,
      Action: row.Action,
      Utilisateur: row.Utilisateur,
      DateAction: row.DateAction ? new Date(row.DateAction).toISOString() : new Date().toISOString(),
      Details: row.Details || ""
    }));

    // 9. Notifications
    const rNotifs = await pool.request().query("SELECT * FROM dbo.Notifications");
    db.notifications = rNotifs.recordset.map(row => ({
      Id: row.Id,
      CommandeId: row.CommandeId || null,
      NoBonCommande: row.NoBonCommande || "",
      Designation: row.Designation || "",
      AncienStatut: row.AncienStatut || "",
      NouveauStatut: row.NouveauStatut || "",
      ModifiePar: row.ModifiePar || "",
      Agence: row.Agence || "",
      Date: row.Date ? new Date(row.Date).toISOString() : new Date().toISOString(),
      Lue: row.Lue === true || row.Lue === 1
    }));

    memoryDb = db;
    mssqlInitialized = true;
    console.log("SQL Server : Cache chargé avec succès ! (Taille Utilisateurs: " + db.utilisateurs.length + ", Commandes: " + db.commandes.length + ")");
  } catch (err) {
    console.error("SQL Server : Erreur critique durant le chargement initial des données:", err);
  }
}

// --- Local File Database Logic (Used during direct fallback only) ---
function ensureDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialDb = createDefaultStructure();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
  }
}

// --- Read Engine ---
export function readDb() {
  // If SQL Server is configured, always read the virtual in-memory copy
  if (process.env.DB_MSSQL_SERVER) {
    if (!memoryDb) {
      memoryDb = createDefaultStructure();
    }
    return memoryDb;
  }

  ensureDb();
  
  // Return cached or read local copy
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const db = JSON.parse(raw);
    let dirty = false;
    
    // Ensure db.services exists
    if (!db.services) {
      if (db.agences && db.agences.length > 0 && db.agences.includes("RH")) {
        db.services = [...db.agences];
      } else {
        db.services = [...DEFAULT_AGENCIES];
      }
      dirty = true;
    }
    
    // Ensure db.agences is a separate list of physical agencies
    if (!db.agences || (db.agences.includes("RH") && db.agences.includes("Comptabilité"))) {
      db.agences = [...DEFAULT_PHYSICAL_AGENCIES];
      dirty = true;
    }

    // Contrôle de sécurité auto-cicatrisant : s'assurer qu'un compte admin existe toujours
    if (!db.utilisateurs || db.utilisateurs.length === 0) {
      db.utilisateurs = createDefaultStructure().utilisateurs;
      dirty = true;
    } else if (!db.utilisateurs.some((u) => u.NomUtilisateur === "admin")) {
      const defaultAdmin = createDefaultStructure().utilisateurs[0];
      db.utilisateurs.push(defaultAdmin);
      dirty = true;
    }
    
    if (dirty) {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
    return db;
  } catch (err) {
    console.error("Erreur de lecture de la DB, réinitialisation...", err);
    try {
      if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
      }
    } catch (e) {}
    ensureDb();
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const db = JSON.parse(raw);
    db.services = [...DEFAULT_AGENCIES];
    db.agences = [...DEFAULT_PHYSICAL_AGENCIES];
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    return db;
  }
}

// --- Write & Asynchronous SQL Server Sync Engine ---
export function writeDb(data) {
  // If SQL Server is configured, update the in-memory state and trigger async save
  if (process.env.DB_MSSQL_SERVER) {
    memoryDb = data;
    
    saveToMssqlAsync(data).catch((err) => {
      console.error("Background SQL Server sync failed:", err.message);
    });
    return;
  }

  ensureDb();
  
  // Instantly write to the local cache JSON (Only when SQL Server is disabled)
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");

  // Perform background write to SQL Server 2014 if active as fallback double-layer
  saveToMssqlAsync(data).catch((err) => {
    console.error("Background SQL Server sync failed:", err.message);
  });
}

/**
 * Pushes local state changes (updates/inserts/deletions) to SQL Server
 */
async function saveToMssqlAsync(data) {
  const pool = await getMssqlPool();
  if (!pool) return; // Silent return if SQL Server is not configured

  try {
    // A. Sync Archive Config
    const config = data.archiveConfig || { autoArchiveDays: 30, enableAutoArchive: true };
    await pool.request()
      .input("days", sql.Int, config.autoArchiveDays)
      .input("enabled", sql.Bit, config.enableAutoArchive ? 1 : 0)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.ArchiveConfig)
          UPDATE dbo.ArchiveConfig SET AutoArchiveDays = @days, EnableAutoArchive = @enabled;
        ELSE
          INSERT INTO dbo.ArchiveConfig (AutoArchiveDays, EnableAutoArchive) VALUES (@days, @enabled);
      `);

    // B. Sync Services list (Updates, Inserts, Deletions)
    if (data.services) {
      for (const s of data.services) {
        await pool.request()
          .input("nom", sql.NVarChar, s)
          .query("IF NOT EXISTS (SELECT 1 FROM dbo.Services WHERE Nom = @nom) INSERT INTO dbo.Services (Nom) VALUES (@nom)");
      }
      const escapedServices = data.services.map(s => s.replace(/'/g, "''"));
      if (escapedServices.length > 0) {
        await pool.request().query(`DELETE FROM dbo.Services WHERE Nom NOT IN (${escapedServices.map(s => `N'${s}'`).join(",")})`);
      } else {
        await pool.request().query("DELETE FROM dbo.Services");
      }
    }

    // C. Sync Agences list (Updates, Inserts, Deletions)
    if (data.agences) {
      for (const a of data.agences) {
        await pool.request()
          .input("nom", sql.NVarChar, a)
          .query("IF NOT EXISTS (SELECT 1 FROM dbo.Agences WHERE Nom = @nom) INSERT INTO dbo.Agences (Nom) VALUES (@nom)");
      }
      const escapedAgences = data.agences.map(a => a.replace(/'/g, "''"));
      if (escapedAgences.length > 0) {
        await pool.request().query(`DELETE FROM dbo.Agences WHERE Nom NOT IN (${escapedAgences.map(a => `N'${a}'`).join(",")})`);
      } else {
        await pool.request().query("DELETE FROM dbo.Agences");
      }
    }

    // D. Sync Users (Updates, Inserts, Deletions)
    if (data.utilisateurs) {
      for (const u of data.utilisateurs) {
        await pool.request()
          .input("id", sql.NVarChar, u.Id)
          .input("nom", sql.NVarChar, u.Nom)
          .input("prenom", sql.NVarChar, u.Prenom)
          .input("email", sql.NVarChar, u.Email || null)
          .input("username", sql.NVarChar, u.NomUtilisateur)
          .input("password", sql.NVarChar, u.MotDePasse)
          .input("role", sql.NVarChar, u.Role)
          .input("statut", sql.NVarChar, u.Statut)
          .input("service", sql.NVarChar, u.Service || null)
          .input("dateCrea", sql.DateTime, u.DateCreation ? new Date(u.DateCreation) : new Date())
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.Utilisateurs WHERE Id = @id)
              UPDATE dbo.Utilisateurs SET Nom = @nom, Prenom = @prenom, Email = @email, NomUtilisateur = @username, MotDePasse = @password, Role = @role, Statut = @statut, Service = @service WHERE Id = @id;
            ELSE
              INSERT INTO dbo.Utilisateurs (Id, Nom, Prenom, Email, NomUtilisateur, MotDePasse, Role, Statut, Service, DateCreation) VALUES (@id, @nom, @prenom, @email, @username, @password, @role, @statut, @service, @dateCrea);
          `);
      }
      const userIds = data.utilisateurs.map(u => u.Id);
      if (userIds.length > 0) {
        const escapedIds = userIds.map(id => id.replace(/'/g, "''"));
        await pool.request().query(`DELETE FROM dbo.Utilisateurs WHERE Id NOT IN (${escapedIds.map(id => `'${id}'`).join(",")})`);
      } else {
        await pool.request().query("DELETE FROM dbo.Utilisateurs");
      }
    }

    // E. Sync Fournisseurs (Updates, Inserts, Deletions)
    if (data.fournisseurs) {
      for (const f of data.fournisseurs) {
        await pool.request()
          .input("id", sql.NVarChar, f.Id)
          .input("nom", sql.NVarChar, f.NomFournisseur)
          .input("contact", sql.NVarChar, f.Contact || null)
          .input("tel", sql.NVarChar, f.Telephone || null)
          .input("type", sql.NVarChar, f.TypeFournisseur)
          .input("dateCrea", sql.DateTime, f.DateCreation ? new Date(f.DateCreation) : new Date())
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.Fournisseurs WHERE Id = @id)
              UPDATE dbo.Fournisseurs SET NomFournisseur = @nom, Contact = @contact, Telephone = @tel, TypeFournisseur = @type WHERE Id = @id;
            ELSE
              INSERT INTO dbo.Fournisseurs (Id, NomFournisseur, Contact, Telephone, TypeFournisseur, DateCreation) VALUES (@id, @nom, @contact, @tel, @type, @dateCrea);
          `);
      }
      const fIds = data.fournisseurs.map(f => f.Id);
      if (fIds.length > 0) {
        const escapedIds = fIds.map(id => id.replace(/'/g, "''"));
        await pool.request().query(`DELETE FROM dbo.Fournisseurs WHERE Id NOT IN (${escapedIds.map(id => `'${id}'`).join(",")})`);
      } else {
        await pool.request().query("DELETE FROM dbo.Fournisseurs");
      }
    }

    // Cascade deletions handling: Clear children before parents to avoid database foreign key integrity errors
    
    // H. Sync Commandes (Inserts & Updates before child records to avoid FK conflicts)
    if (data.commandes) {
      for (const c of data.commandes) {
        const dateLiv = c.DateLivraison ? new Date(c.DateLivraison) : null;
        const dateEmi = c.DateEmission ? new Date(c.DateEmission) : new Date();
        const dateArch = c.DateArchivage ? new Date(c.DateArchivage) : null;
        
        await pool.request()
          .input("id", sql.NVarChar, c.Id)
          .input("noBC", sql.NVarChar, c.NoBonCommande)
          .input("noDS", sql.NVarChar, c.NoDS || null)
          .input("desig", sql.NVarChar, c.Designation || null)
          .input("qte", sql.Int, c.Quantite || 1)
          .input("prix", sql.Decimal(18, 2), c.Prix !== undefined ? c.Prix : null)
          .input("fourn", sql.NVarChar, c.Fournisseur || "Achat Local")
          .input("agence", sql.NVarChar, c.Agence || null)
          .input("dateLiv", sql.DateTime, dateLiv)
          .input("statut", sql.NVarChar, c.Statut)
          .input("dateEmi", sql.DateTime, dateEmi)
          .input("estArch", sql.Bit, c.EstArchive ? 1 : 0)
          .input("dateArch", sql.DateTime, dateArch)
          .input("obs", sql.NVarChar, c.Observation || null)
          .input("demPar", sql.NVarChar, c.CreePar || c.DemandePar || null)
          .input("serDem", sql.NVarChar, c.ServiceDemande || null)
          .input("modPar", sql.NVarChar, c.ModifiePar || null)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.Commandes WHERE Id = @id)
              UPDATE dbo.Commandes SET 
                NoBonCommande = @noBC, NoDS = @noDS, Designation = @desig, Quantite = @qte, Prix = @prix, 
                Fournisseur = @fourn, Agence = @agence, DateLivraison = @dateLiv, Statut = @statut, DateEmission = @dateEmi,
                EstArchive = @estArch, DateArchivage = @dateArch, Observation = @obs, DemandePar = @demPar, ServiceDemande = @serDem,
                DateModification = GETDATE(), ModifiePar = @modPar
              WHERE Id = @id;
            ELSE
              INSERT INTO dbo.Commandes (Id, NoBonCommande, NoDS, Designation, Quantite, Prix, Fournisseur, Agence, DateLivraison, Statut, DateEmission, EstArchive, DateArchivage, Observation, DemandePar, ServiceDemande, DateCreation)
              VALUES (@id, @noBC, @noDS, @desig, @qte, @prix, @fourn, @agence, @dateLiv, @statut, @dateEmi, @estArch, @dateArch, @obs, @demPar, @serDem, GETDATE());
          `);
      }
    }

    // F. Sync HistoriqueStatuts (And Deletions)
    if (data.historiqueStatuts) {
      for (const h of data.historiqueStatuts) {
        // Only insert status history if the referenced CommandeId exists in memory DB active or archived list
        const exists = data.commandes && data.commandes.some(cmd => cmd.Id === h.CommandeId);
        if (!exists) continue; // Skip orphan status history entries to avoid DB crash

        await pool.request()
          .input("id", sql.NVarChar, h.Id)
          .input("cmdId", sql.NVarChar, h.CommandeId)
          .input("anc", sql.NVarChar, h.AncienStatut)
          .input("nouv", sql.NVarChar, h.NouveauStatut)
          .input("dateMod", sql.DateTime, h.DateModification ? new Date(h.DateModification) : new Date())
          .input("modPar", sql.NVarChar, h.ModifiePar)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.HistoriqueStatuts WHERE Id = @id)
              INSERT INTO dbo.HistoriqueStatuts (Id, CommandeId, AncienStatut, NouveauStatut, DateModification, ModifiePar)
              VALUES (@id, @cmdId, @anc, @nouv, @dateMod, @modPar);
          `);
      }
      const hIds = data.historiqueStatuts.map(h => h.Id);
      if (hIds.length > 0) {
        const escapedIds = hIds.map(id => id.replace(/'/g, "''"));
        await pool.request().query(`DELETE FROM dbo.HistoriqueStatuts WHERE Id NOT IN (${escapedIds.map(id => `'${id}'`).join(",")})`);
      } else {
        await pool.request().query("DELETE FROM dbo.HistoriqueStatuts");
      }
    }

    // G. Sync Notifications (And Deletions)
    if (data.notifications) {
      for (const n of data.notifications) {
        // Guard if CommandeId is specified but doesn't exist
        if (n.CommandeId) {
          const exists = data.commandes && data.commandes.some(cmd => cmd.Id === n.CommandeId);
          if (!exists) n.CommandeId = null; // Decouple orphan notifications to avoid FK issues
        }

        await pool.request()
          .input("id", sql.NVarChar, n.Id)
          .input("cmdId", sql.NVarChar, n.CommandeId || null)
          .input("noBC", sql.NVarChar, n.NoBonCommande || null)
          .input("desig", sql.NVarChar, n.Designation || null)
          .input("anc", sql.NVarChar, n.AncienStatut || null)
          .input("nouv", sql.NVarChar, n.NouveauStatut || null)
          .input("modPar", sql.NVarChar, n.ModifiePar || null)
          .input("agence", sql.NVarChar, n.Agence || null)
          .input("date", sql.DateTime, n.Date ? new Date(n.Date) : new Date())
          .input("lue", sql.Bit, n.Lue ? 1 : 0)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.Notifications WHERE Id = @id)
              UPDATE dbo.Notifications SET Lue = @lue WHERE Id = @id;
            ELSE
              INSERT INTO dbo.Notifications (Id, CommandeId, NoBonCommande, Designation, AncienStatut, NouveauStatut, ModifiePar, Agence, Date, Lue)
              VALUES (@id, @cmdId, @noBC, @desig, @anc, @nouv, @modPar, @agence, @date, @lue);
          `);
      }
      const nIds = data.notifications.map(n => n.Id);
      if (nIds.length > 0) {
        const escapedIds = nIds.map(id => id.replace(/'/g, "''"));
        await pool.request().query(`DELETE FROM dbo.Notifications WHERE Id NOT IN (${escapedIds.map(id => `'${id}'`).join(",")})`);
      } else {
        await pool.request().query("DELETE FROM dbo.Notifications");
      }
    }

    // H. Sync Commande deletions last (since child deletions/cascades are already safely synced above)
    if (data.commandes) {
      const cIds = data.commandes.map(c => c.Id);
      if (cIds.length > 0) {
        const escapedIds = cIds.map(id => id.replace(/'/g, "''"));
        await pool.request().query(`DELETE FROM dbo.Commandes WHERE Id NOT IN (${escapedIds.map(id => `'${id}'`).join(",")})`);
      } else {
        await pool.request().query("DELETE FROM dbo.Commandes");
      }
    }

    // I. Sync Logs (And Deletions)
    if (data.logs) {
      for (const l of data.logs) {
        await pool.request()
          .input("id", sql.NVarChar, l.Id)
          .input("act", sql.NVarChar, l.Action)
          .input("usr", sql.NVarChar, l.Utilisateur)
          .input("dateAct", sql.DateTime, l.DateAction ? new Date(l.DateAction) : new Date())
          .input("det", sql.NVarChar, l.Details || null)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.Logs WHERE Id = @id)
              INSERT INTO dbo.Logs (Id, Action, Utilisateur, DateAction, Details)
              VALUES (@id, @act, @usr, @dateAct, @det);
          `);
      }
      const lIds = data.logs.map(l => l.Id);
      if (lIds.length > 0) {
        const escapedIds = lIds.map(id => id.replace(/'/g, "''"));
        await pool.request().query(`DELETE FROM dbo.Logs WHERE Id NOT IN (${escapedIds.map(id => `'${id}'`).join(",")})`);
      }
    }

  } catch (err) {
    console.error("Erreur de synchronisation SQL Server:", err.message);
  }
}

// --- Action Logging ---
export function logAction(utilisateur, action, details) {
  const db = readDb();
  const newLog = {
    Id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    Action: action,
    Utilisateur: utilisateur,
    DateAction: new Date().toISOString(),
    Details: details,
  };
  db.logs.unshift(newLog);
  if (db.logs.length > 1000) {
    db.logs = db.logs.slice(0, 1000);
  }
  writeDb(db);
}

// --- Auto Archiving Runner ---
export function runAutoArchive() {
  const db = readDb();
  if (!db.archiveConfig.enableAutoArchive) return;

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - db.archiveConfig.autoArchiveDays);

  let archivedCount = 0;

  db.commandes = db.commandes.map((cmd) => {
    if (cmd.Statut === "Livré" && !cmd.EstArchive) {
      const history = db.historiqueStatuts
        .filter((h) => h.CommandeId === cmd.Id && h.NouveauStatut === "Livré")
        .sort((a, b) => new Date(b.DateModification).getTime() - new Date(a.DateModification).getTime());

      const statusDate = history.length > 0 ? new Date(history[0].DateModification) : new Date(cmd.DateEmission);

      if (statusDate < thresholdDate) {
        cmd.EstArchive = true;
        cmd.DateArchivage = new Date().toISOString();
        archivedCount++;
        db.historiqueStatuts.push({
          Id: `h-auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          CommandeId: cmd.Id,
          AncienStatut: "Livré (Actif)",
          NouveauStatut: "Livré (Archivé)",
          DateModification: new Date().toISOString(),
          ModifiePar: "Système (Automatique)"
        });
      }
    }
    return cmd;
  });

  if (archivedCount > 0) {
    writeDb(db);
    logAction("Système", "Archivage Automatique", `Archivage automatique de ${archivedCount} commandes livrées depuis plus de ${db.archiveConfig.autoArchiveDays} jours.`);
  }
}

// Trigger initial connection boot asynchronously on application load
getMssqlPool().catch((err) => {
  console.error("Critical async SQL Server boot error:", err.message);
});

export { DEFAULT_AGENCIES };
