-- =========================================================================
-- SYSTEME DE GESTION DES BONS DE COMMANDES (SGBC)
-- Script de création de base de données pour Microsoft SQL Server 2014 (et versions ultérieures)
-- Généré le: 15 Juin 2026
-- Auteur: Assistant de Codage IA
-- Description: Script complet de création de tables, clés primaires, clés étrangères,
--              index de performance et jeu d'essai initial (seed data).
-- =========================================================================

-- 1. CREATION DE LA BASE DE DONNEES (Optionnel; décommenter si besoin)
/*
USE master;
GO
IF EXISTS (SELECT * FROM sys.databases WHERE name = N'SGBC_DB')
BEGIN
    ALTER DATABASE SGBC_DB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SGBC_DB;
END
GO
CREATE DATABASE SGBC_DB;
GO
USE SGBC_DB;
GO
*/

-- Activer les contraintes de base
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- =========================================================================
-- 2. SUPPRESSION DES TABLES EXISTANTES POUR REINITIALISATION PROPRE
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
-- 3. CREATION DES TABLES STATIQUES OU DE REFERENCE
-- =========================================================================

-- Table des services demandeurs (ex: RH, Informatique, etc.)
CREATE TABLE dbo.Services (
    Id INT IDENTITY(1,1) NOT NULL,
    Nom NVARCHAR(150) NOT NULL,
    CONSTRAINT PK_Services PRIMARY KEY CLUSTERED (Id ASC),
    CONSTRAINT UQ_Services_Nom UNIQUE (Nom)
);
GO

-- Table des agences de rattachement de la société (ex: Douala, Yaoundé, etc.)
CREATE TABLE dbo.Agences (
    Id INT IDENTITY(1,1) NOT NULL,
    Nom NVARCHAR(150) NOT NULL,
    CONSTRAINT PK_Agences PRIMARY KEY CLUSTERED (Id ASC),
    CONSTRAINT UQ_Agences_Nom UNIQUE (Nom)
);
GO

-- Table de configuration d'archivage automatique
CREATE TABLE dbo.ArchiveConfig (
    Id INT IDENTITY(1,1) NOT NULL,
    AutoArchiveDays INT NOT NULL CONSTRAINT DF_ArchiveConfig_Days DEFAULT (30),
    EnableAutoArchive BIT NOT NULL CONSTRAINT DF_ArchiveConfig_Enabled DEFAULT (1),
    CONSTRAINT PK_ArchiveConfig PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- =========================================================================
-- 4. CREATION DES TABLES APPLICATIVES PRINCIPALES
-- =========================================================================

-- Table des utilisateurs de l'application
CREATE TABLE dbo.Utilisateurs (
    Id NVARCHAR(50) NOT NULL,
    Nom NVARCHAR(100) NOT NULL,
    Prenom NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NULL,
    NomUtilisateur NVARCHAR(50) NOT NULL,
    MotDePasse NVARCHAR(255) NOT NULL, -- Hachage bcryptjs
    Role NVARCHAR(50) NOT NULL CONSTRAINT DF_Utilisateurs_Role DEFAULT ('Utilisateur'), -- Administrateur, Acheteur, Contrôleur, Utilisateur
    Statut NVARCHAR(50) NOT NULL CONSTRAINT DF_Utilisateurs_Statut DEFAULT ('Actif'), -- Actif, Inactif
    DateCreation DATETIME NOT NULL CONSTRAINT DF_Utilisateurs_DateCreation DEFAULT (GETDATE()),
    CONSTRAINT PK_Utilisateurs PRIMARY KEY CLUSTERED (Id ASC),
    CONSTRAINT UQ_Utilisateurs_Username UNIQUE (NomUtilisateur)
);
GO

-- Table des fournisseurs référencés
CREATE TABLE dbo.Fournisseurs (
    Id NVARCHAR(50) NOT NULL,
    NomFournisseur NVARCHAR(150) NOT NULL,
    Contact NVARCHAR(150) NULL,
    Telephone NVARCHAR(100) NULL,
    TypeFournisseur NVARCHAR(50) NOT NULL CONSTRAINT DF_Fournisseurs_Type DEFAULT ('Achat Local'), -- Achat Local, Achat Import
    DateCreation DATETIME NOT NULL CONSTRAINT DF_Fournisseurs_DateCreation DEFAULT (GETDATE()),
    CONSTRAINT PK_Fournisseurs PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table principale des bons de commandes
CREATE TABLE dbo.Commandes (
    Id NVARCHAR(50) NOT NULL,
    NoBonCommande NVARCHAR(100) NOT NULL,
    NoDS NVARCHAR(100) NULL,
    Designation NVARCHAR(MAX) NULL,
    Quantite INT NOT NULL CONSTRAINT DF_Commandes_Quantite DEFAULT (1),
    Prix DECIMAL(18,2) NULL, -- Format monétaire F CFA
    Fournisseur NVARCHAR(150) NULL CONSTRAINT DF_Commandes_Fourn DEFAULT (N'Achat Local'),
    Agence NVARCHAR(150) NULL, -- Service de destination / Service demandeur
    DateLivraison DATETIME NULL,
    Statut NVARCHAR(50) NOT NULL CONSTRAINT DF_Commandes_Statut DEFAULT ('Saisie'), -- Saisie, Transmis, Reçu, Rejet, Saisie-DS, Livré, Non livré
    DateEmission DATETIME NOT NULL CONSTRAINT DF_Commandes_DateEmission DEFAULT (GETDATE()),
    EstArchive BIT NOT NULL CONSTRAINT DF_Commandes_EstArchive DEFAULT (0),
    DateArchivage DATETIME NULL,
    Observation NVARCHAR(MAX) NULL,
    DemandePar NVARCHAR(100) NULL,
    ServiceDemande NVARCHAR(100) NULL,
    DateCreation DATETIME NOT NULL CONSTRAINT DF_Commandes_DateCrea DEFAULT (GETDATE()),
    DateModification DATETIME NULL,
    ModifiePar NVARCHAR(100) NULL,
    CONSTRAINT PK_Commandes PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table de liaison / historique d'association des fournisseurs aux commandes (optionnelle)
CREATE TABLE dbo.CommandeFournisseurs (
    Id NVARCHAR(50) NOT NULL,
    CommandeId NVARCHAR(50) NOT NULL,
    FournisseurId NVARCHAR(50) NOT NULL,
    DateLiaison DATETIME NOT NULL CONSTRAINT DF_CommandeFourn_Date DEFAULT (GETDATE()),
    CONSTRAINT PK_CommandeFournisseurs PRIMARY KEY CLUSTERED (Id ASC),
    CONSTRAINT FK_CommandeFourn_Commande FOREIGN KEY (CommandeId) REFERENCES dbo.Commandes (Id) ON DELETE CASCADE,
    CONSTRAINT FK_CommandeFourn_Fourn FOREIGN KEY (FournisseurId) REFERENCES dbo.Fournisseurs (Id) ON DELETE CASCADE
);
GO

-- Table d'historique de suivi des statuts des commandes
CREATE TABLE dbo.HistoriqueStatuts (
    Id NVARCHAR(50) NOT NULL,
    CommandeId NVARCHAR(50) NOT NULL,
    AncienStatut NVARCHAR(50) NOT NULL,
    NouveauStatut NVARCHAR(50) NOT NULL,
    DateModification DATETIME NOT NULL CONSTRAINT DF_HistStatuts_Date DEFAULT (GETDATE()),
    ModifiePar NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_HistoriqueStatuts PRIMARY KEY CLUSTERED (Id ASC),
    CONSTRAINT FK_HistStatuts_Commande FOREIGN KEY (CommandeId) REFERENCES dbo.Commandes (Id) ON DELETE CASCADE
);
GO

-- Table des logs d'Audit Système
CREATE TABLE dbo.Logs (
    Id NVARCHAR(50) NOT NULL,
    Action NVARCHAR(150) NOT NULL,
    Utilisateur NVARCHAR(100) NOT NULL,
    DateAction DATETIME NOT NULL CONSTRAINT DF_Logs_Date DEFAULT (GETDATE()),
    Details NVARCHAR(MAX) NULL,
    CONSTRAINT PK_Logs PRIMARY KEY CLUSTERED (Id ASC)
);
GO

-- Table des Notifications en Temps Réel (avec historique persistant)
CREATE TABLE dbo.Notifications (
    Id NVARCHAR(50) NOT NULL,
    CommandeId NVARCHAR(50) NULL,
    NoBonCommande NVARCHAR(100) NULL,
    Designation NVARCHAR(MAX) NULL,
    AncienStatut NVARCHAR(50) NULL,
    NouveauStatut NVARCHAR(50) NULL,
    ModifiePar NVARCHAR(100) NULL,
    Agence NVARCHAR(150) NULL,
    Date DATETIME NOT NULL CONSTRAINT DF_Notifications_Date DEFAULT (GETDATE()),
    Lue BIT NOT NULL CONSTRAINT DF_Notifications_Lue DEFAULT (0),
    CONSTRAINT PK_Notifications PRIMARY KEY CLUSTERED (Id ASC),
    -- Clé étrangère optionnelle pour garder l'intégrité sans forcer la suppression stricte si supprimé
    CONSTRAINT FK_Notifications_Commande FOREIGN KEY (CommandeId) REFERENCES dbo.Commandes (Id) ON DELETE SET NULL
);
GO

-- =========================================================================
-- 5. CREATION DES INDEX POUR OPTIMISER LES REQUETES ET RAPPORTS
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_Commandes_EstArchive ON dbo.Commandes (EstArchive ASC, Statut ASC);
CREATE NONCLUSTERED INDEX IX_Commandes_Agence ON dbo.Commandes (Agence ASC);
CREATE NONCLUSTERED INDEX IX_HistoriqueStatuts_CommandeId ON dbo.HistoriqueStatuts (CommandeId ASC);
CREATE NONCLUSTERED INDEX IX_Notifications_Lue ON dbo.Notifications (Lue ASC, Date DESC);
CREATE NONCLUSTERED INDEX IX_Logs_DateAction ON dbo.Logs (DateAction DESC);
GO

-- =========================================================================
-- 6. DUMP DE DONNEES INITIALES (SEED DATA)
-- =========================================================================

-- Configuration standard d'archivage automatique par défaut
INSERT INTO dbo.ArchiveConfig (AutoArchiveDays, EnableAutoArchive)
VALUES (30, 1);
GO

-- Liste initiale des Services
INSERT INTO dbo.Services (Nom) VALUES 
(N'RH'), 
(N'Moyens Généraux'), 
(N'Fiscalité'), 
(N'Sécurité'), 
(N'Achat Import'), 
(N'Courriel'), 
(N'Commercial'), 
(N'Informatique'), 
(N'Supply chaine'), 
(N'Marketing'), 
(N'Contrôle de Gestion'), 
(N'Garage'), 
(N'Comptabilité'), 
(N'Gestion Stock'), 
(N'Transit'), 
(N'Technique'), 
(N'Secrétariat DG'), 
(N'Achat Local'), 
(N'Exploitation'), 
(N'Logistique'), 
(N'Contrôle et Audit Interne'), 
(N'Archive'), 
(N'Juridique');
GO

-- Liste initiale des Agences de rattachement
INSERT INTO dbo.Agences (Nom) VALUES 
(N'Agence de Douala'), 
(N'Agence de Yaoundé'), 
(N'Agence de Garoua'), 
(N'Agence de Bafoussam'), 
(N'Agence de Kribi');
GO

-- Insertion de l'utilisateur Administrateur par défaut
-- Mot de passe par défaut: "admin123" (haché en bcrypt 10 salt pour rétrocompatibilité d'authentification)
INSERT INTO dbo.Utilisateurs (Id, Nom, Prenom, Email, NomUtilisateur, MotDePasse, Role, Statut, DateCreation)
VALUES (
    N'u-admin', 
    N'Admin', 
    N'Gestion', 
    N'admin@example.com', 
    N'admin', 
    N'$2a$10$tZreM6cOf3OofC0jP.K0Wumq66QeJ6B7hR9b09nB/3o.g8fX8jFe.', -- Hachage du mot de passe admin123
    N'Administrateur', 
    N'Actif', 
    GETDATE()
);
GO

-- Exemple de comptes utilisateurs supplémentaires pour tests
INSERT INTO dbo.Utilisateurs (Id, Nom, Prenom, Email, NomUtilisateur, MotDePasse, Role, Statut, DateCreation)
VALUES 
(
    N'u-utilisateur', 
    N'Utilisateur', 
    N'Standard', 
    N'user@example.com', 
    N'user', 
    N'$2a$10$tZreM6cOf3OofC0jP.K0Wumq66QeJ6B7hR9b09nB/3o.g8fX8jFe.', -- Même mot de passe admin123
    N'Utilisateur', 
    N'Actif', 
    GETDATE()
),
(
    N'u-acheteur', 
    N'Acheteur', 
    N'Appro', 
    N'acheteur@example.com', 
    N'acheteur', 
    N'$2a$10$tZreM6cOf3OofC0jP.K0Wumq66QeJ6B7hR9b09nB/3o.g8fX8jFe.',
    N'Acheteur', 
    N'Actif', 
    GETDATE()
);
GO

-- Insertion d'un premier Log système indicatif
INSERT INTO dbo.Logs (Id, Action, Utilisateur, DateAction, Details)
VALUES (
    N'log-1', 
    N'Initialisation Système SQL Server', 
    N'Système', 
    GETDATE(), 
    N'Importation réussie du schéma SQL Server 2014 avec données de démarrage.'
);
GO

-- =========================================================================
-- FIN DU SCRIPT SQL SERVER 2014
-- =========================================================================
