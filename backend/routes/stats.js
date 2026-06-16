import express from "express";
import { readDb } from "../models/db.js";
import { authenticator } from "./auth.js";

const router = express.Router();

// GET /api/stats
router.get("/", authenticator, (req, res) => {
  const db = readDb();

  let filteredCommandes = db.commandes;
  const roleLower = (req.user?.role || "").trim().toLowerCase();
  if (roleLower === "utilisateur") {
    filteredCommandes = db.commandes.filter((c) => {
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
