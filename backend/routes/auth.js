import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { readDb, logAction } from "../models/db.js";

const router = express.Router();
export const JWT_SECRET = process.env.JWT_SECRET || "suivi_appro_secret_key_2026_cameroon";

// Auth Middleware
export function authenticator(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expirée ou jeton invalide" });
  }
}

// Admin only middleware
export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "Administrateur") {
    return res.status(403).json({ error: "Accès refusé. Rôle Administrateur requis" });
  }
  next();
}

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Veuillez fournir un nom d'utilisateur et un mot de passe" });
  }

  const db = readDb();
  const user = db.utilisateurs.find(
    (u) => u.NomUtilisateur.toLowerCase() === username.trim().toLowerCase()
  );

  if (!user) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }

  if (user.Statut === "Desactive") {
    return res.status(403).json({ error: "Votre compte est désactivé. Veuillez contacter un administrateur." });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.MotDePasse);
  if (!isPasswordValid) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }

  const token = jwt.sign(
    {
      userId: user.Id,
      username: user.NomUtilisateur,
      role: user.Role,
      fullName: `${user.Prenom} ${user.Nom}`,
      service: user.Service || "",
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  logAction(user.NomUtilisateur, "Connexion", `Utilisateur connecté avec succès (Rôle: ${user.Role}, Service: ${user.Service || "Aucun"})`);

  res.json({
    token,
    user: {
      id: user.Id,
      username: user.NomUtilisateur,
      role: user.Role,
      nom: user.Nom,
      prenom: user.Prenom,
      email: user.Email,
      service: user.Service || "",
    },
  });
});

// GET /api/auth/me
router.get("/me", authenticator, (req, res) => {
  const db = readDb();
  const userObj = db.utilisateurs.find((u) => u.Id === req.user?.userId);

  if (!userObj || userObj.Statut === "Desactive") {
    return res.status(404).json({ error: "Utilisateur introuvable ou désactivé" });
  }

  res.json({
    id: userObj.Id,
    username: userObj.NomUtilisateur,
    role: userObj.Role,
    nom: userObj.Nom,
    prenom: userObj.Prenom,
    email: userObj.Email,
    service: userObj.Service || "",
  });
});

export default router;
