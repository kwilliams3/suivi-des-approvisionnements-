export interface User {
  Id: string;
  Nom: string;
  Prenom: string;
  Email?: string;
  NomUtilisateur: string;
  Role: "Administrateur" | "Utilisateur";
  Statut: "Actif" | "Desactive";
  DateCreation: string;
  Service?: string;
}

export interface Supplier {
  Id: string;
  NomFournisseur: string;
  TypeFournisseur: "Achat Local" | "Achat Import";
}

export interface Order {
  Id: string;
  NoBonCommande: string;
  NoDS: string;
  DateEmission: string;
  Designation: string;
  Quantite: number;
  Prix?: number;
  ReferenceSage?: string;
  DateLivraison: string;
  Statut: "En cours" | "Livré" | "Non livré" | "Terminé";
  CreePar: string;
  Agence: string;
  EstArchive: boolean;
  DateArchivage?: string;
  Fournisseurs: Supplier[]; // Hydrated in response
  Fournisseur?: string;
  Observation?: string;
}

export interface StatusHistory {
  Id: string;
  CommandeId: string;
  AncienStatut: string;
  NouveauStatut: string;
  DateModification: string;
  ModifiePar: string;
}

export interface ActivityLog {
  Id: string;
  Action: string;
  Utilisateur: string;
  DateAction: string;
  Details: string;
}

export interface DashboardStats {
  totalGlobal: number;
  totalActives: number;
  enCours: number;
  livres: number;
  nonLivres: number;
  archives: number;
  enRetard: number;
  procheLivraison: number;
  byAgency: Record<string, number>;
  bySupplier: Record<string, number>;
  byMonth: Record<string, number>;
}
