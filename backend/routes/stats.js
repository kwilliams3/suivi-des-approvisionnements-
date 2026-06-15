import express from "express";
import { readDb } from "../models/db.js";
import { authenticator } from "./auth.js";

const router = express.Router();

// GET /api/stats
router.get("/", authenticator, (req, res) => {
  const db = readDb();

  let filteredCommandes = db.commandes;
  if (req.user?.role === "Utilisateur" && req.user?.service) {
    filteredCommandes = db.commandes.filter((c) => c.Agence === req.user.service);
  }

  const totalActives = filteredCommandes.filter((c) => !c.EstArchive).length;
  const totalArchived = filteredCommandes.filter((c) => c.EstArchive).length;

  const stats = {
    totalGlobal: filteredCommandes.length,
    totalActives,
    enCours: filteredCommandes.filter((c) => !c.EstArchive && c.Statut === "En cours").length,
    livres: filteredCommandes.filter((c) => !c.EstArchive && c.Statut === "Livré").length,
    nonLivres: filteredCommandes.filter((c) => !c.EstArchive && c.Statut === "Non livré").length,
    archives: totalArchived,
    enRetard: filteredCommandes.filter((c) => {
      if (c.EstArchive || c.Statut === "Livré") return false;
      const deliveryDate = new Date(c.DateLivraison);
      const today = new Date();
      deliveryDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return deliveryDate < today;
    }).length,
    procheLivraison: filteredCommandes.filter((c) => {
      if (c.EstArchive || c.Statut === "Livré") return false;
      const deliveryDate = new Date(c.DateLivraison);
      const today = new Date();
      deliveryDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      const diffMs = deliveryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    }).length,

    byAgency: {},
    bySupplier: {},
    byMonth: {}
  };

  filteredCommandes.forEach((cmd) => {
    stats.byAgency[cmd.Agence] = (stats.byAgency[cmd.Agence] || 0) + 1;

    try {
      const monthStr = cmd.DateEmission.substring(0, 7);
      stats.byMonth[monthStr] = (stats.byMonth[monthStr] || 0) + 1;
    } catch (e) {}

    const supplierName = cmd.Fournisseur || "Achat Local";
    stats.bySupplier[supplierName] = (stats.bySupplier[supplierName] || 0) + 1;
  });

  res.json(stats);
});

export default router;
