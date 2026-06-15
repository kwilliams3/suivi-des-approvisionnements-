import jsPDF from "jspdf";
import "jspdf-autotable";
import { Order } from "../types";

/**
 * Exports orders array to a beautiful PDF report
 */
export function exportToPDF(orders: Order[], title: string) {
  const doc = new jsPDF("landscape", "mm", "a4");

  // Document Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(title, 14, 15);

  // Metadata
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  const generationDate = new Date().toLocaleString("fr-FR", {
    timeZone: "UTC",
    hour12: false,
  });
  doc.text(`Rapport généré le : ${generationDate} (UTC) | Total lignes : ${orders.length}`, 14, 21);

  // Prepare table headers and rows
  const headers = [
    [
      "N° Bon Commande",
      "N° DS",
      "Désignation",
      "Quantité",
      "Prix (F CFA)",
      "Fournisseur",
      "Service demandeur",
      "Date Livraison",
      "Statut"
    ]
  ];

  const data = orders.map((o) => [
    o.NoBonCommande || "",
    o.NoDS || "",
    o.Designation || "",
    o.Quantite || 0,
    o.Prix !== undefined && o.Prix !== null ? o.Prix.toLocaleString("fr-FR") : "-",
    o.Fournisseur || "Achat Local",
    o.Agence || "-",
    o.DateLivraison ? new Date(o.DateLivraison).toLocaleDateString("fr-FR") : "-",
    o.Statut || ""
  ]);

  (doc as any).autoTable({
    head: headers,
    body: data,
    startY: 26,
    styles: { 
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak"
    },
    columnStyles: {
      0: { cellWidth: 35 }, // N° BC
      1: { cellWidth: 25 }, // N° DS
      2: { cellWidth: 60 }, // Désignation
      3: { cellWidth: 15 }, // Qté
      4: { cellWidth: 25 }, // Prix
      5: { cellWidth: 35 }, // Fournisseur
      6: { cellWidth: 35 }, // Service
      7: { cellWidth: 22 }, // Livraison
      8: { cellWidth: 20 }  // Statut
    },
    headStyles: { 
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate 50
    },
    margin: { left: 14, right: 14 }
  });

  const formattedTitle = title.toLowerCase().replace(/[\s']+/g, "_");
  doc.save(`${formattedTitle}_${Date.now()}.pdf`);
}

/**
 * Exports orders array to a standard CSV file
 */
export function exportToCSV(orders: Order[], filename: string) {
  const headers = [
    "N° Bon Commande",
    "N° DS",
    "Désignation",
    "Quantité",
    "Prix (F CFA)",
    "Fournisseur",
    "Service demandeur",
    "Date Livraison",
    "Statut",
    "Date Émission",
    "Est Archivée",
    "Date d'Archivage",
    "Observation d'Archivage"
  ];

  const rows = orders.map((o) => {
    const prix = o.Prix !== undefined && o.Prix !== null ? o.Prix : "";
    const estArchive = o.EstArchive ? "Oui" : "Non";
    const dateArchivage = o.DateArchivage ? new Date(o.DateArchivage).toLocaleDateString("fr-FR") : "";
    const dateEmission = o.DateEmission ? new Date(o.DateEmission).toLocaleDateString("fr-FR") : "";
    
    return [
      o.NoBonCommande || "",
      o.NoDS || "",
      o.Designation ? `"${o.Designation.replace(/"/g, '""')}"` : "",
      o.Quantite || 0,
      prix,
      o.Fournisseur ? `"${o.Fournisseur.replace(/"/g, '""')}"` : "",
      o.Agence ? `"${o.Agence.replace(/"/g, '""')}"` : "",
      o.DateLivraison ? new Date(o.DateLivraison).toLocaleDateString("fr-FR") : "",
      o.Statut || "",
      dateEmission,
      estArchive,
      dateArchivage,
      o.Observation ? `"${o.Observation.replace(/"/g, '""')}"` : ""
    ];
  });

  // Use semicolon as separator for standard Excel in French-speaking locales
  const csvString = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  
  const formattedFilename = filename.toLowerCase().replace(/[\s']+/g, "_");
  link.setAttribute("download", `${formattedFilename}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
