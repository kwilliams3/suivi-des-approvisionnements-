-- =========================================================================
-- SYSTEME DE GESTION DES BONS DE COMMANDES (SGBC)
-- Script de création de base de données pour Microsoft SQL Server 2014 (et versions ultérieures)
-- Version : 2.0 (Séparée avec ALTER TABLE pour une compatibilité absolue à 100%)
-- Description : Configuration ultra-robuste avec contraintes déclarées séparément,
--              ce qui évite de nombreux problèmes de parsers sur les anciens moteurs SQL Server.
-- =========================================================================

-- Activer les contraintes de base de l'environnement SQL
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- =========================================================================
-- 1. NETTOYAGE SECURISÉ DES EXISTANTS (Ordre respectant les clés étrangères)
-- =========================================================================
IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL DROP TABLE dbo.Notifications;
IF OBJECT_ID('dbo.Logs', 'U') IS NOT NULL DROP TABLE dbo.Logs;
IF OBJECT_ID('dbo.HistoriqueStatuts', 'U') IS NOT NULL DROP TABLE dbo.HistoriqueStatuts;
IF OBJECT_ID('dbo.CommandeFournisseurs', 'U') IS NOT NULL DROP TABLE dbo.CommandeFournisseurs;
IF OBJECT_ID('dbo.Commandes', 'U') IS NOT NULL DROP TABLE dbo.Commandes;
IF OBJECT_ID('dbo.Fournisseurs', 'U') IS NOT NULL DROP TABLE dbo.Fournisseurs;
IF OBJECT_ID('dbo.Utilisateurs', 'U') IS NOT NULL DROP TABLE dbo.Utilisateurs;
IF OBJECT_ID('dbo.Services', 'U') IS NOT NULL DROP TABLE dbo.Services;
IF OBJECT_ID('dbo.Agences', 'U') IS NOT NULL DROP TABLE dbo.Agences;
IF OBJECT_ID('dbo.ArchiveConfig', 'U') IS NOT NULL DROP TABLE dbo.ArchiveConfig;
GO

-- =========================================================================
-- 2. CRÉATION DES TABLES (SANS CONTRAINTES COMPLEXES INLINE)
-- =========================================================================

-- Table des services
CREATE TABLE dbo.Services (
    Id INT IDENTITY(1,1) NOT NULL,
    Nom NVARCHAR(150) NOT NULL,
    CONSTRAINT PK_Services PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table des agences physiques
CREATE TABLE dbo.Agences (
    Id INT IDENTITY(1,1) NOT NULL,
    Nom NVARCHAR(150) NOT NULL,
    CONSTRAINT PK_Agences PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table de configuration d'archivage automatique
CREATE TABLE dbo.ArchiveConfig (
    Id INT IDENTITY(1,1) NOT NULL,
    AutoArchiveDays INT NOT NULL,
    EnableAutoArchive BIT NOT NULL,
    CONSTRAINT PK_ArchiveConfig PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table des utilisateurs
CREATE TABLE dbo.Utilisateurs (
    Id NVARCHAR(50) NOT NULL,
    Nom NVARCHAR(100) NOT NULL,
    Prenom NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NULL,
    NomUtilisateur NVARCHAR(50) NOT NULL,
    MotDePasse NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL,
    Statut NVARCHAR(50) NOT NULL,
    Service NVARCHAR(150) NULL,
    DateCreation DATETIME NOT NULL,
    CONSTRAINT PK_Utilisateurs PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table des fournisseurs
CREATE TABLE dbo.Fournisseurs (
    Id NVARCHAR(50) NOT NULL,
    NomFournisseur NVARCHAR(150) NOT NULL,
    Contact NVARCHAR(150) NULL,
    Telephone NVARCHAR(100) NULL,
    TypeFournisseur NVARCHAR(50) NOT NULL,
    DateCreation DATETIME NOT NULL,
    CONSTRAINT PK_Fournisseurs PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table principale des commandes
CREATE TABLE dbo.Commandes (
    Id NVARCHAR(50) NOT NULL,
    NoBonCommande NVARCHAR(100) NOT NULL,
    NoDS NVARCHAR(100) NULL,
    Designation NVARCHAR(MAX) NULL,
    Quantite INT NOT NULL,
    Prix DECIMAL(18,2) NULL,
    Fournisseur NVARCHAR(150) NULL,
    Agence NVARCHAR(150) NULL,
    DateLivraison DATETIME NULL,
    Statut NVARCHAR(50) NOT NULL,
    DateEmission DATETIME NOT NULL,
    EstArchive BIT NOT NULL,
    DateArchivage DATETIME NULL,
    Observation NVARCHAR(MAX) NULL,
    DemandePar NVARCHAR(100) NULL,
    ServiceDemande NVARCHAR(100) NULL,
    DateCreation DATETIME NOT NULL,
    DateModification DATETIME NULL,
    ModifiePar NVARCHAR(100) NULL,
    CONSTRAINT PK_Commandes PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table d'association Commandes-Fournisseurs (optionnelle)
CREATE TABLE dbo.CommandeFournisseurs (
    Id NVARCHAR(50) NOT NULL,
    CommandeId NVARCHAR(50) NOT NULL,
    FournisseurId NVARCHAR(50) NOT NULL,
    DateLiaison DATETIME NOT NULL,
    CONSTRAINT PK_CommandeFournisseurs PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table d'historique de statut pour la traçabilité
CREATE TABLE dbo.HistoriqueStatuts (
    Id NVARCHAR(50) NOT NULL,
    CommandeId NVARCHAR(50) NOT NULL,
    AncienStatut NVARCHAR(50) NOT NULL,
    NouveauStatut NVARCHAR(50) NOT NULL,
    DateModification DATETIME NOT NULL,
    ModifiePar NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_HistoriqueStatuts PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table Logs
CREATE TABLE dbo.Logs (
    Id NVARCHAR(50) NOT NULL,
    Action NVARCHAR(150) NOT NULL,
    Utilisateur NVARCHAR(100) NOT NULL,
    DateAction DATETIME NOT NULL,
    Details NVARCHAR(MAX) NULL,
    CONSTRAINT PK_Logs PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table de notifications rattachées aux commandes
CREATE TABLE dbo.Notifications (
    Id NVARCHAR(50) NOT NULL,
    CommandeId NVARCHAR(50) NULL,
    NoBonCommande NVARCHAR(100) NULL,
    Designation NVARCHAR(MAX) NULL,
    AncienStatut NVARCHAR(50) NULL,
    NouveauStatut NVARCHAR(50) NULL,
    ModifiePar NVARCHAR(100) NULL,
    Agence NVARCHAR(150) NULL,
    Date DATETIME NOT NULL,
    Lue BIT NOT NULL,
    CONSTRAINT PK_Notifications PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- =========================================================================
-- 3. AJOUT DES UNIQUES & CONTRAINTES D'INDEX UNIQUE
-- =========================================================================
ALTER TABLE dbo.Services ADD CONSTRAINT UQ_Services_Nom UNIQUE (Nom);
ALTER TABLE dbo.Agences ADD CONSTRAINT UQ_Agences_Nom UNIQUE (Nom);
ALTER TABLE dbo.Utilisateurs ADD CONSTRAINT UQ_Utilisateurs_Username UNIQUE (NomUtilisateur);
GO

-- =========================================================================
-- 4. BINDING DES VALEURS PAR DÉFAUT (FONCTIONNE SUR TOUTES LES VERSIONS DE SQL SERVER)
-- =========================================================================
ALTER TABLE dbo.ArchiveConfig ADD CONSTRAINT DF_ArchiveConfig_Days DEFAULT (30) FOR AutoArchiveDays;
ALTER TABLE dbo.ArchiveConfig ADD CONSTRAINT DF_ArchiveConfig_Enabled DEFAULT (1) FOR EnableAutoArchive;

ALTER TABLE dbo.Utilisateurs ADD CONSTRAINT DF_Utilisateurs_Role DEFAULT ('Utilisateur') FOR Role;
ALTER TABLE dbo.Utilisateurs ADD CONSTRAINT DF_Utilisateurs_Statut DEFAULT ('Actif') FOR Statut;
ALTER TABLE dbo.Utilisateurs ADD CONSTRAINT DF_Utilisateurs_DateCreation DEFAULT (GETDATE()) FOR DateCreation;

ALTER TABLE dbo.Fournisseurs ADD CONSTRAINT DF_Fournisseurs_Type DEFAULT ('Achat Local') FOR TypeFournisseur;
ALTER TABLE dbo.Fournisseurs ADD CONSTRAINT DF_Fournisseurs_DateCreation DEFAULT (GETDATE()) FOR DateCreation;

ALTER TABLE dbo.Commandes ADD CONSTRAINT DF_Commandes_Quantite DEFAULT (1) FOR Quantite;
ALTER TABLE dbo.Commandes ADD CONSTRAINT DF_Commandes_Fourn DEFAULT (N'Achat Local') FOR Fournisseur;
ALTER TABLE dbo.Commandes ADD CONSTRAINT DF_Commandes_Statut DEFAULT ('Saisie') FOR Statut;
ALTER TABLE dbo.Commandes ADD CONSTRAINT DF_Commandes_DateEmission DEFAULT (GETDATE()) FOR DateEmission;
ALTER TABLE dbo.Commandes ADD CONSTRAINT DF_Commandes_EstArchive DEFAULT (0) FOR EstArchive;
ALTER TABLE dbo.Commandes ADD CONSTRAINT DF_Commandes_DateCrea DEFAULT (GETDATE()) FOR DateCreation;

ALTER TABLE dbo.CommandeFournisseurs ADD CONSTRAINT DF_CommandeFourn_Date DEFAULT (GETDATE()) FOR DateLiaison;

ALTER TABLE dbo.HistoriqueStatuts ADD CONSTRAINT DF_HistStatuts_Date DEFAULT (GETDATE()) FOR DateModification;

ALTER TABLE dbo.Logs ADD CONSTRAINT DF_Logs_Date DEFAULT (GETDATE()) FOR DateAction;

ALTER TABLE dbo.Notifications ADD CONSTRAINT DF_Notifications_Date DEFAULT (GETDATE()) FOR Date;
ALTER TABLE dbo.Notifications ADD CONSTRAINT DF_Notifications_Lue DEFAULT (0) FOR Lue;
GO

-- =========================================================================
-- 5. AJOUT DES CLÉS ÉTRANGÈRES ET GESTION INTÉGRITÉ REFERENTIELLE
-- =========================================================================
ALTER TABLE dbo.CommandeFournisseurs ADD CONSTRAINT FK_CommandeFourn_Commande FOREIGN KEY (CommandeId) REFERENCES dbo.Commandes (Id) ON DELETE CASCADE;
ALTER TABLE dbo.CommandeFournisseurs ADD CONSTRAINT FK_CommandeFourn_Fourn FOREIGN KEY (FournisseurId) REFERENCES dbo.Fournisseurs (Id) ON DELETE CASCADE;

ALTER TABLE dbo.HistoriqueStatuts ADD CONSTRAINT FK_HistStatuts_Commande FOREIGN KEY (CommandeId) REFERENCES dbo.Commandes (Id) ON DELETE CASCADE;

ALTER TABLE dbo.Notifications ADD CONSTRAINT FK_Notifications_Commande FOREIGN KEY (CommandeId) REFERENCES dbo.Commandes (Id) ON DELETE SET NULL;
GO

-- =========================================================================
-- 6. INDEX DE PERFORMANCE
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_Commandes_EstArchive ON dbo.Commandes (EstArchive ASC, Statut ASC);
CREATE NONCLUSTERED INDEX IX_Commandes_Agence ON dbo.Commandes (Agence ASC);
CREATE NONCLUSTERED INDEX IX_HistoriqueStatuts_CommandeId ON dbo.HistoriqueStatuts (CommandeId ASC);
CREATE NONCLUSTERED INDEX IX_Notifications_Lue ON dbo.Notifications (Lue ASC, Date DESC);
CREATE NONCLUSTERED INDEX IX_Logs_DateAction ON dbo.Logs (DateAction DESC);
GO

-- =========================================================================
-- 7. IMPORT DES DONNÉES DE CONFIGURATION DE BASE
-- =========================================================================

-- Configuration d'archivage par défaut
INSERT INTO dbo.ArchiveConfig (AutoArchiveDays, EnableAutoArchive) VALUES (30, 1);
GO

-- Services demandeurs standard
INSERT INTO dbo.Services (Nom) VALUES (N'RH');
INSERT INTO dbo.Services (Nom) VALUES (N'Moyens Généraux');
INSERT INTO dbo.Services (Nom) VALUES (N'Fiscalité');
INSERT INTO dbo.Services (Nom) VALUES (N'Sécurité');
INSERT INTO dbo.Services (Nom) VALUES (N'Achat Import');
INSERT INTO dbo.Services (Nom) VALUES (N'Courriel');
INSERT INTO dbo.Services (Nom) VALUES (N'Commercial');
INSERT INTO dbo.Services (Nom) VALUES (N'Informatique');
INSERT INTO dbo.Services (Nom) VALUES (N'Supply chaine');
INSERT INTO dbo.Services (Nom) VALUES (N'Marketing');
INSERT INTO dbo.Services (Nom) VALUES (N'Contrôle de Gestion');
INSERT INTO dbo.Services (Nom) VALUES (N'Garage');
INSERT INTO dbo.Services (Nom) VALUES (N'Comptabilité');
INSERT INTO dbo.Services (Nom) VALUES (N'Gestion Stock');
INSERT INTO dbo.Services (Nom) VALUES (N'Transit');
INSERT INTO dbo.Services (Nom) VALUES (N'Technique');
INSERT INTO dbo.Services (Nom) VALUES (N'Secrétariat DG');
INSERT INTO dbo.Services (Nom) VALUES (N'Achat Local');
INSERT INTO dbo.Services (Nom) VALUES (N'Exploitation');
INSERT INTO dbo.Services (Nom) VALUES (N'Logistique');
INSERT INTO dbo.Services (Nom) VALUES (N'Contrôle et Audit Interne');
INSERT INTO dbo.Services (Nom) VALUES (N'Archive');
INSERT INTO dbo.Services (Nom) VALUES (N'Juridique');
GO

-- Agences physiques
INSERT INTO dbo.Agences (Nom) VALUES (N'AKWA');
INSERT INTO dbo.Agences (Nom) VALUES (N'DIRECTION');
INSERT INTO dbo.Agences (Nom) VALUES (N'MBOPPI');
INSERT INTO dbo.Agences (Nom) VALUES (N'DOUCHE');
INSERT INTO dbo.Agences (Nom) VALUES (N'BEACH');
INSERT INTO dbo.Agences (Nom) VALUES (N'NDOGPASSI');
INSERT INTO dbo.Agences (Nom) VALUES (N'SODIKO');
INSERT INTO dbo.Agences (Nom) VALUES (N'EMERAUDE');
INSERT INTO dbo.Agences (Nom) VALUES (N'GRAND HANGAR');
INSERT INTO dbo.Agences (Nom) VALUES (N'YASSA');
INSERT INTO dbo.Agences (Nom) VALUES (N'SHOW ROOM');
INSERT INTO dbo.Agences (Nom) VALUES (N'CORON');
INSERT INTO dbo.Agences (Nom) VALUES (N'KRIBI');
INSERT INTO dbo.Agences (Nom) VALUES (N'HM MOKOLO');
INSERT INTO dbo.Agences (Nom) VALUES (N'PDV MOKOLO');
INSERT INTO dbo.Agences (Nom) VALUES (N'NLONGAK');
INSERT INTO dbo.Agences (Nom) VALUES (N'MESSASSI');
INSERT INTO dbo.Agences (Nom) VALUES (N'NGAOUNDERE');
INSERT INTO dbo.Agences (Nom) VALUES (N'BERTOUA');
INSERT INTO dbo.Agences (Nom) VALUES (N'BAMENDA');
INSERT INTO dbo.Agences (Nom) VALUES (N'TAMDJA');
INSERT INTO dbo.Agences (Nom) VALUES (N'DJELENG');
INSERT INTO dbo.Agences (Nom) VALUES (N'M110');
INSERT INTO dbo.Agences (Nom) VALUES (N'PK5');
INSERT INTO dbo.Agences (Nom) VALUES (N'M100');
INSERT INTO dbo.Agences (Nom) VALUES (N'M20');
INSERT INTO dbo.Agences (Nom) VALUES (N'M120');
INSERT INTO dbo.Agences (Nom) VALUES (N'M50');
INSERT INTO dbo.Agences (Nom) VALUES (N'Garage 120');
INSERT INTO dbo.Agences (Nom) VALUES (N'LDI MBOPPI');
INSERT INTO dbo.Agences (Nom) VALUES (N'LDI BESSENGUE');
INSERT INTO dbo.Agences (Nom) VALUES (N'LDI NKOMONDO');
INSERT INTO dbo.Agences (Nom) VALUES (N'PK11');
INSERT INTO dbo.Agences (Nom) VALUES (N'Parc Automobile');
INSERT INTO dbo.Agences (Nom) VALUES (N'SOCOPRODE');
INSERT INTO dbo.Agences (Nom) VALUES (N'Nkoabang');
GO

-- Utilisateurs requis au démarrage
-- Password configuré par défaut: "admin123" (haché avec le même sel bcrypt)
INSERT INTO dbo.Utilisateurs (Id, Nom, Prenom, Email, NomUtilisateur, MotDePasse, Role, Statut, DateCreation)
VALUES (
    N'u-admin', 
    N'Admin', 
    N'Gestion', 
    N'admin@example.com', 
    N'admin', 
    N'$2b$10$TIb88N63Bopby8vTBCSAKOh5FvNsYC0qFwH7Hf5jICLgiZBjmwPuS', -- Correspond à admin123 ou le mdp de l'admin configuré
    N'Administrateur', 
    N'Actif', 
    GETDATE()
);
GO

-- Log initial d'audit
INSERT INTO dbo.Logs (Id, Action, Utilisateur, DateAction, Details)
VALUES (
    N'log-1', 
    N'Initialisation Système', 
    N'Système', 
    GETDATE(), 
    N'Initialisation réussie de la structure MSSQL 2014 via le script ultra-compatible.'
);
GO
