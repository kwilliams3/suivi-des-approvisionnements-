import express from "express";
import { readDb, writeDb } from "../models/db.js";
import { authenticator } from "./auth.js";

const router = express.Router();
let clients = [];

// Get persistent notifications from DB
router.get("/", authenticator, (req, res) => {
  const db = readDb();
  if (!db.notifications) {
    db.notifications = [];
  }
  res.json(db.notifications);
});

// Clear all notifications post action
router.post("/clear", authenticator, (req, res) => {
  const db = readDb();
  db.notifications = [];
  writeDb(db);
  res.json({ success: true, notifications: [] });
});

// Mark single notification as read
router.patch("/:id/read", authenticator, (req, res) => {
  const { id } = req.params;
  const db = readDb();
  if (!db.notifications) db.notifications = [];
  
  const index = db.notifications.findIndex((n) => n.Id === id);
  if (index !== -1) {
    db.notifications[index].Lue = true;
    writeDb(db);
  }
  res.json({ success: true, notifications: db.notifications });
});

// Mark all as read
router.post("/read-all", authenticator, (req, res) => {
  const db = readDb();
  if (!db.notifications) db.notifications = [];
  
  db.notifications = db.notifications.map((n) => ({ ...n, Lue: true }));
  writeDb(db);
  res.json({ success: true, notifications: db.notifications });
});

// SSE connection setup
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);

  // Send initial message
  res.write("data: {\"type\": \"connected\"}\n\n");

  // Soft keep-alive heartbeat interval every 25 seconds
  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    clients = clients.filter((c) => c.id !== clientId);
  });
});

/**
 * Creates, saves, and broadcasts a notification to all active streams
 */
export function createAndSendNotification({ commandeId, noBonCommande, designat, ancienStatut, nouveauStatut, modifiePar, agence }) {
  const db = readDb();
  if (!db.notifications) {
    db.notifications = [];
  }

  const newNotification = {
    Id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    CommandeId: commandeId,
    NoBonCommande: noBonCommande,
    Designation: designat,
    AncienStatut: ancienStatut,
    NouveauStatut: nouveauStatut,
    ModifiePar: modifiePar,
    Agence: agence,
    Date: new Date().toISOString(),
    Lue: false
  };

  db.notifications.unshift(newNotification);

  // Keep max 100 notifications in persistence
  if (db.notifications.length > 100) {
    db.notifications = db.notifications.slice(0, 100);
  }

  writeDb(db);

  // Broadcast
  const payload = JSON.stringify({ type: "notification", data: newNotification });
  clients.forEach((c) => {
    try {
      c.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      console.error("Failed to write to client response", e);
    }
  });

  return newNotification;
}

export default router;
