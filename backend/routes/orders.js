import express from "express";
import { readDb, writeDb, logAction } from "../models/db.js";
import { authenticator, adminOnly } from "./auth.js";
import { createAndSendNotification } from "./notifications.js";

const router = express.Router();

// GET /api/orders
router.get("/", authenticator, (req, res) => {
  const db = readDb();
  const showArchived = req.query.archived === "true";

  let foundCommands = db.commandes.filter((c) => c.EstArchive === showArchived);

  // If the user is a standard Utilisateur, restrict they only see orders from their own service (agence) OR those they created themselves
  const roleLower = (req.user?.role || "").trim().toLowerCase();
  if (roleLower === "utilisateur") {
    foundCommands = foundCommands.filter((c) => {
      const userServ = (req.user.service || "").trim().toLowerCase();
      const matchService = userServ ? (
        (c.Agence || "").trim().toLowerCase() === userServ || 
        (c.ServiceDemande || "").trim().toLowerCase() === userServ
      ) : false;

      const creatorName = (c.CreePar || c.DemandePar || "").trim().toLowerCase();
      if (!creatorName) {
        return matchService;
      }

      const userLogin = (req.user.username || "").trim().toLowerCase();
      const userFullName = (req.user.fullName || "").trim().toLowerCase();
      const userId = (req.user.userId || "").trim().toLowerCase();

      const matchCreator = (
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

      return matchService || matchCreator;
    });
  }

  const ordersHydrated = foundCommands.map((cmd) => {
    const fourName = cmd.Fournisseur || "Achat Local";
    const defaultSupplier = {
      Id: `f-temp-${cmd.Id}`,
      NomFournisseur: fourName,
      TypeFournisseur: (fourName === "Achat Import") ? "Achat Import" : "Achat Local"
    };

    return {
      ...cmd,
      Fournisseur: fourName,
      Fournisseurs: [defaultSupplier]
    };
  });

  ordersHydrated.sort((a, b) => new Date(b.DateEmission).getTime() - new Date(a.DateEmission).getTime());

  res.json(ordersHydrated);
});

// GET /api/orders/:id/history
router.get("/:id/history", authenticator, (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const command = db.commandes.find((c) => c.Id === id);
  if (!command) {
    return res.status(404).json({ error: "Commande non trouvée" });
  }

  const history = db.historiqueStatuts
    .filter((h) => h.CommandeId === id)
    .sort((a, b) => new Date(b.DateModification).getTime() - new Date(a.DateModification).getTime());

  res.json({
    order: command,
    history
  });
});

// POST /api/orders
router.post("/", authenticator, (req, res) => {
  const db = readDb();

  if (req.body.items && Array.isArray(req.body.items)) {
    const createdOrders = [];
    const baseTime = Date.now();

    for (let i = 0; i < req.body.items.length; i++) {
      const item = req.body.items[i];
      const {
        NoBonCommande,
        NoDS,
        Designation,
        Quantite,
        Prix,
        ReferenceSage,
        DateLivraison,
        Statut,
        Agence,
        Fournisseur,
        Observation
      } = item;

      if (!NoBonCommande || !Designation || !Quantite || !DateLivraison || !Statut || !Agence || !Fournisseur) {
        return res.status(400).json({ error: "Tous les champs obligatoires doivent être renseignés pour chaque commande" });
      }

      if (Statut === "Terminé" && (!Observation || !Observation.trim())) {
        return res.status(400).json({ error: "L'observation est obligatoire pour les commandes terminées." });
      }

      // Generate unique IDs using baseTime & index & small random salt
      const salt = Math.random().toString(36).substring(2, 6);
      const orderId = `c-${baseTime}-${i}-${salt}`;
      const newOrder = {
        Id: orderId,
        NoBonCommande: NoBonCommande.trim(),
        NoDS: NoDS ? NoDS.trim() : "",
        DateEmission: new Date().toISOString(),
        Designation: Designation.trim(),
        Quantite: Number(Quantite),
        Prix: Prix ? Number(Prix) : undefined,
        ReferenceSage: ReferenceSage ? ReferenceSage.trim() : undefined,
        DateLivraison: DateLivraison,
        Statut: Statut,
        CreePar: req.user.username,
        DemandePar: req.user.username,
        ServiceDemande: req.user.service || "",
        Agence: Agence,
        EstArchive: Statut === "Terminé",
        DateArchivage: Statut === "Terminé" ? new Date().toISOString() : undefined,
        Observation: Statut === "Terminé" ? Observation.trim() : undefined,
        Fournisseur: Fournisseur.trim()
      };

      db.commandes.push(newOrder);

      db.historiqueStatuts.push({
        Id: `h-${baseTime}-${i}-${salt}`,
        CommandeId: orderId,
        AncienStatut: "Nouveau",
        NouveauStatut: Statut,
        DateModification: new Date().toISOString(),
        ModifiePar: req.user.username
      });

      createAndSendNotification({
        commandeId: orderId,
        noBonCommande: NoBonCommande.trim(),
        designat: Designation.trim(),
        ancienStatut: "Création",
        nouveauStatut: Statut,
        modifiePar: req.user.username,
        agence: Agence
      });

      createdOrders.push(newOrder);
    }

    writeDb(db);

    logAction(
      req.user.username,
      "Création commandes (Lot)",
      `Création de ${createdOrders.length} commandes en lot pour le bon de commande ${req.body.items[0]?.NoBonCommande}`
    );

    return res.status(201).json(createdOrders[0]);
  }

  const {
    NoBonCommande,
    NoDS,
    Designation,
    Quantite,
    Prix,
    ReferenceSage,
    DateLivraison,
    Statut,
    Agence,
    Fournisseur,
    Observation
  } = req.body;

  if (!NoBonCommande || !Designation || !Quantite || !DateLivraison || !Statut || !Agence || !Fournisseur) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent être renseignés, incluant le fournisseur" });
  }

  if (Statut === "Terminé" && (!Observation || !Observation.trim())) {
    return res.status(400).json({ error: "L'observation est obligatoire pour les commandes terminées." });
  }

  const orderId = `c-${Date.now()}`;
  const newOrder = {
    Id: orderId,
    NoBonCommande: NoBonCommande.trim(),
    NoDS: NoDS ? NoDS.trim() : "",
    DateEmission: new Date().toISOString(),
    Designation: Designation.trim(),
    Quantite: Number(Quantite),
    Prix: Prix ? Number(Prix) : undefined,
    ReferenceSage: ReferenceSage ? ReferenceSage.trim() : undefined,
    DateLivraison: DateLivraison,
    Statut: Statut,
    CreePar: req.user.username,
    DemandePar: req.user.username,
    ServiceDemande: req.user.service || "",
    Agence: Agence,
    EstArchive: Statut === "Terminé",
    DateArchivage: Statut === "Terminé" ? new Date().toISOString() : undefined,
    Observation: Statut === "Terminé" ? Observation.trim() : undefined,
    Fournisseur: Fournisseur.trim()
  };

  db.commandes.push(newOrder);

  db.historiqueStatuts.push({
    Id: `h-${Date.now()}`,
    CommandeId: orderId,
    AncienStatut: "Nouveau",
    NouveauStatut: Statut,
    DateModification: new Date().toISOString(),
    ModifiePar: req.user.username
  });

  writeDb(db);

  createAndSendNotification({
    commandeId: orderId,
    noBonCommande: NoBonCommande.trim(),
    designat: Designation.trim(),
    ancienStatut: "Création",
    nouveauStatut: Statut,
    modifiePar: req.user.username,
    agence: Agence
  });

  logAction(
    req.user.username,
    "Création commande",
    `Création de la commande ${newOrder.NoBonCommande} pour l'agence: ${newOrder.Agence}. Statut initial: ${newOrder.Statut}`
  );

  res.status(201).json(newOrder);
});

// PUT /api/orders/:id
router.put("/:id", authenticator, (req, res) => {
  const { id } = req.params;
  const {
    NoBonCommande,
    NoDS,
    Designation,
    Quantite,
    Prix,
    ReferenceSage,
    DateLivraison,
    Statut,
    Agence,
    Fournisseur,
    Observation
  } = req.body;

  const db = readDb();
  const index = db.commandes.findIndex((c) => c.Id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Commande non trouvée" });
  }

  const cmd = db.commandes[index];

  if (cmd.Statut === "Livré" && req.user?.role !== "Administrateur") {
    return res.status(403).json({ error: "Seuls les administrateurs peuvent modifier une commande livrée" });
  }

  if (Statut === "Terminé" && (!Observation || !Observation.trim())) {
    return res.status(400).json({ error: "Une observation est obligatoire pour passer au statut 'Terminé'" });
  }

  const previousStatut = cmd.Statut;

  cmd.NoBonCommande = NoBonCommande !== undefined ? NoBonCommande.trim() : cmd.NoBonCommande;
  cmd.NoDS = NoDS !== undefined ? NoDS.trim() : cmd.NoDS;
  cmd.Designation = Designation ? Designation.trim() : cmd.Designation;
  cmd.Quantite = Quantite !== undefined ? Number(Quantite) : cmd.Quantite;
  cmd.Prix = Prix !== undefined ? Number(Prix) : cmd.Prix;
  cmd.ReferenceSage = ReferenceSage !== undefined ? ReferenceSage.trim() : cmd.ReferenceSage;
  cmd.DateLivraison = DateLivraison || cmd.DateLivraison;
  cmd.Statut = Statut || cmd.Statut;
  cmd.Agence = Agence || cmd.Agence;
  
  if (Fournisseur) {
    cmd.Fournisseur = Fournisseur.trim();
  }

  if (cmd.Statut === "Terminé") {
    cmd.EstArchive = true;
    cmd.DateArchivage = new Date().toISOString();
    cmd.Observation = Observation ? Observation.trim() : (cmd.Observation || "");
  }

  db.commandes[index] = cmd;

  if (Statut && Statut !== previousStatut) {
    db.historiqueStatuts.push({
      Id: `h-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      CommandeId: id,
      AncienStatut: previousStatut,
      NouveauStatut: Statut,
      DateModification: new Date().toISOString(),
      ModifiePar: req.user.username
    });

    createAndSendNotification({
      commandeId: id,
      noBonCommande: cmd.NoBonCommande,
      designat: cmd.Designation,
      ancienStatut: previousStatut,
      nouveauStatut: Statut,
      modifiePar: req.user.username,
      agence: cmd.Agence
    });
  }

  writeDb(db);

  logAction(
    req.user.username,
    "Modification commande",
    `Mise à jour de la commande ${cmd.NoBonCommande}. Statut: ${previousStatut}->${cmd.Statut}`
  );

  res.json(cmd);
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", authenticator, (req, res) => {
  const { id } = req.params;
  const { Statut, Observation } = req.body;

  if (!Statut || !["En cours", "Livré", "Non livré", "Terminé"].includes(Statut)) {
    return res.status(400).json({ error: "Statut de commande invalide" });
  }

  if (Statut === "Terminé" && (!Observation || !Observation.trim())) {
    return res.status(400).json({ error: "Une observation est obligatoire pour passer au statut 'Terminé'" });
  }

  const db = readDb();
  const index = db.commandes.findIndex((c) => c.Id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Commande non trouvée" });
  }

  const cmd = db.commandes[index];

  if (cmd.Statut === "Livré" && req.user?.role !== "Administrateur") {
    return res.status(403).json({ error: "Seuls les administrateurs peuvent modifier le statut d'une commande déjà livrée" });
  }

  const previousStatut = cmd.Statut;
  cmd.Statut = Statut;

  if (Statut === "Terminé") {
    cmd.EstArchive = true;
    cmd.DateArchivage = new Date().toISOString();
    cmd.Observation = Observation.trim();
  }

  db.historiqueStatuts.push({
    Id: `h-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    CommandeId: id,
    AncienStatut: previousStatut,
    NouveauStatut: Statut,
    DateModification: new Date().toISOString(),
    ModifiePar: req.user.username
  });

  db.commandes[index] = cmd;
  writeDb(db);

  createAndSendNotification({
    commandeId: id,
    noBonCommande: cmd.NoBonCommande,
    designat: cmd.Designation,
    ancienStatut: previousStatut,
    nouveauStatut: Statut,
    modifiePar: req.user.username,
    agence: cmd.Agence
  });

  logAction(
    req.user.username,
    "Changement Statut Direct",
    `Commande ${cmd.NoBonCommande} statut modifié: ${previousStatut} -> ${Statut}`
  );

  res.json(cmd);
});

// DELETE /api/orders/:id
router.delete("/:id", authenticator, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const index = db.commandes.findIndex((c) => c.Id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Commande non trouvée" });
  }

  const orderNum = db.commandes[index].NoBonCommande;

  db.commandeFournisseurs = db.commandeFournisseurs.filter((cf) => cf.CommandeId !== id);
  db.historiqueStatuts = db.historiqueStatuts.filter((h) => h.CommandeId !== id);
  db.commandes.splice(index, 1);

  writeDb(db);

  logAction(
    req.user.username,
    "Suppression commande",
    `Suppression irréversible de la commande ${orderNum} de la base de données.`
  );

  res.json({ success: true, message: "Commande supprimée définitivement" });
});

// POST /api/orders/:id/archive
router.post("/:id/archive", authenticator, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const index = db.commandes.findIndex((c) => c.Id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Commande non trouvée" });
  }

  db.commandes[index].EstArchive = true;
  db.commandes[index].DateArchivage = new Date().toISOString();

  db.historiqueStatuts.push({
    Id: `h-${Date.now()}`,
    CommandeId: id,
    AncienStatut: db.commandes[index].Statut,
    NouveauStatut: `${db.commandes[index].Statut} (Archivée)`,
    DateModification: new Date().toISOString(),
    ModifiePar: req.user.username
  });

  writeDb(db);

  createAndSendNotification({
    commandeId: id,
    noBonCommande: db.commandes[index].NoBonCommande,
    designat: db.commandes[index].Designation,
    ancienStatut: db.commandes[index].Statut,
    nouveauStatut: `${db.commandes[index].Statut} (Archivée)`,
    modifiePar: req.user.username,
    agence: db.commandes[index].Agence
  });

  logAction(
    req.user.username,
    "Archivage Manuel",
    `La commande ${db.commandes[index].NoBonCommande} a été déplacée dans le module d'archives.`
  );

  res.json({ success: true, message: "Commande archivée avec succès" });
});

// POST /api/orders/:id/restore
router.post("/:id/restore", authenticator, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const index = db.commandes.findIndex((c) => c.Id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Commande non trouvée" });
  }

  db.commandes[index].EstArchive = false;
  delete db.commandes[index].DateArchivage;

  db.historiqueStatuts.push({
    Id: `h-${Date.now()}`,
    CommandeId: id,
    AncienStatut: `${db.commandes[index].Statut} (Archivée)`,
    NouveauStatut: db.commandes[index].Statut,
    DateModification: new Date().toISOString(),
    ModifiePar: req.user.username
  });

  writeDb(db);

  createAndSendNotification({
    commandeId: id,
    noBonCommande: db.commandes[index].NoBonCommande,
    designat: db.commandes[index].Designation,
    ancienStatut: `${db.commandes[index].Statut} (Archivée)`,
    nouveauStatut: db.commandes[index].Statut,
    modifiePar: req.user.username,
    agence: db.commandes[index].Agence
  });

  logAction(
    req.user.username,
    "Restauration Archive",
    `La commande ${db.commandes[index].NoBonCommande} a été restaurée dans la liste principale active.`
  );

  res.json({ success: true, message: "Commande restaurée avec succès" });
});

// GET /api/archive/config
router.get("/config", authenticator, (req, res) => {
  const db = readDb();
  res.json(db.archiveConfig);
});

// POST /api/archive/config
router.post("/config", authenticator, adminOnly, (req, res) => {
  const { autoArchiveDays, enableAutoArchive } = req.body;

  if (autoArchiveDays === undefined || typeof enableAutoArchive !== "boolean") {
    return res.status(400).json({ error: "Données de configuration d'archivage incomplètes" });
  }

  const db = readDb();
  db.archiveConfig.autoArchiveDays = Number(autoArchiveDays);
  db.archiveConfig.enableAutoArchive = enableAutoArchive;

  writeDb(db);

  logAction(
    req.user.username,
    "Configuration Archivage",
    `Mise à jour Archivage Automatique: Activé=${enableAutoArchive}, Délai=${autoArchiveDays} jours`
  );

  res.json({ success: true, config: db.archiveConfig });
});

export default router;
