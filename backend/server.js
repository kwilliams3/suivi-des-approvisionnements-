import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { runAutoArchive, DEFAULT_AGENCIES, readDb, writeDb, logAction } from "./models/db.js";
import authRouter, { authenticator, adminOnly } from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import suppliersRouter from "./routes/suppliers.js";
import ordersRouter from "./routes/orders.js";
import statsRouter from "./routes/stats.js";
import logsRouter from "./routes/logs.js";
import notificationsRouter from "./routes/notifications.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// Run auto-archiving once on startup
try {
  runAutoArchive();
} catch (e) {
  console.error("Startup auto-archive failed:", e);
}

// Set up periodic auto-archive execution (every 5 minutes)
setInterval(() => {
  try {
    runAutoArchive();
  } catch (e) {
    console.error("Interval auto-archive task failed:", e);
  }
}, 5 * 60 * 1000);

// --- Mount Routes ---
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/stats", statsRouter);
app.use("/api/logs", logsRouter);
app.use("/api/notifications", notificationsRouter);

// --- Custom Inline Mappings (Agencies, Services & Archive Config) ---
app.get("/api/agencies", authenticator, (req, res) => {
  const db = readDb();
  res.json(db.agences || []);
});

app.post("/api/agencies", authenticator, adminOnly, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Le nom de l'agence est requis." });
  }

  const db = readDb();
  const normalized = name.trim();
  if (!db.agences) {
    db.agences = [];
  }
  if (db.agences.some((ag) => ag.toLowerCase() === normalized.toLowerCase())) {
    return res.status(400).json({ error: "Cette agence existe déjà." });
  }

  db.agences.push(normalized);
  writeDb(db);
  logAction(req.user?.NomUtilisateur || "admin", "Création d'agence", `Ajout de l'agence : ${normalized}`);
  res.json(db.agences);
});

app.delete("/api/agencies/:name", authenticator, adminOnly, (req, res) => {
  const { name } = req.params;
  const db = readDb();
  
  if (!db.agences) db.agences = [];
  const initialLength = db.agences.length;
  db.agences = db.agences.filter((ag) => ag !== name);

  if (db.agences.length === initialLength) {
    return res.status(404).json({ error: "Agence non trouvée." });
  }

  writeDb(db);
  logAction(req.user?.NomUtilisateur || "admin", "Suppression d'agence", `Suppression de l'agence : ${name}`);
  res.json(db.agences);
});

// --- Services API ---
app.get("/api/services", authenticator, (req, res) => {
  const db = readDb();
  res.json(db.services || []);
});

app.post("/api/services", authenticator, adminOnly, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Le nom du service est requis." });
  }

  const db = readDb();
  const normalized = name.trim();
  if (!db.services) {
    db.services = [];
  }
  if (db.services.some((ser) => ser.toLowerCase() === normalized.toLowerCase())) {
    return res.status(400).json({ error: "Ce service existe déjà." });
  }

  db.services.push(normalized);
  writeDb(db);
  logAction(req.user?.NomUtilisateur || "admin", "Création de service", `Ajout du service : ${normalized}`);
  res.json(db.services);
});

app.delete("/api/services/:name", authenticator, adminOnly, (req, res) => {
  const { name } = req.params;
  const db = readDb();
  
  if (!db.services) db.services = [];
  const initialLength = db.services.length;
  db.services = db.services.filter((ser) => ser !== name);

  if (db.services.length === initialLength) {
    return res.status(404).json({ error: "Service non trouvé." });
  }

  writeDb(db);
  logAction(req.user?.NomUtilisateur || "admin", "Suppression de service", `Suppression du service : ${name}`);
  res.json(db.services);
});

// GET /api/archive/config
app.get("/api/archive/config", authenticator, (req, res) => {
  const db = readDb();
  res.json(db.archiveConfig);
});

// POST /api/archive/config
app.post("/api/archive/config", authenticator, adminOnly, (req, res) => {
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

// --- Vite Static Delivery or Development Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVEUR BACKEND] Actif sur l'adresse http://localhost:${PORT}`);
  });
}

startServer();
export default app;
