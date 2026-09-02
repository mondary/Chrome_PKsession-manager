# Changelog

Historique des versions de PK Session.

---

## TODO — Roadmap

Statut : `2026.09.02` (interface dense et aperçus)

### V2 — Sessions vivantes
- [x] Séparer les espaces, versions immuables et identités d’onglets.
- [x] Restaurer la composition, l’ordre et les groupes d’une version.
- [x] Visualiser les lignes de vie et les relations parent/enfant.
- [ ] Valider la migration des données V1.

---

## Releases

### [2026.09.02] - 2026-09-02
#### Added
- Aperçu de page au survol, vrais favicons et fermeture directe des onglets actifs.
- Capture locale des miniatures lorsqu’un onglet devient actif.

#### Changed
- Vue Espace recomposée en aperçu fixe et liste dense inspirée de Tablerone.
- Meilleure utilisation de la surface pour les sessions contenant de nombreux onglets.

### [2026.09.01] - 2026-09-02
#### Added
- Nouvelle V2 autonome dans `v2/` avec capture automatique et restauration des sessions Chrome.
- Vues Espace, Parcours et Origines alimentées par les mêmes versions locales.
- Identité durable des onglets, historique des navigations et relations parent/enfant.

#### Changed
- Nouvelle interface construite à partir des trois concepts du dossier `templates/`.
- Adoption du versionnement calendaire PK.

#### Fixed
- Capture fraîche des onglets avant chaque ouverture de l’application.
- Badge de l’icône synchronisé avec le nombre d’onglets web ouverts.
- Icônes de l’extension générées depuis `icon.png`.

## [0.12.1] - 2026-06-30
### Fixed
- Fonds opaques et contraste renforcé pour toutes les fenêtres modales.
- Déclaration complète des couleurs sémantiques shadcn dans le thème Tailwind v4.

## [0.12.0] - 2026-06-30
### Added
- Palette `⌘K` pour rechercher instantanément parmi les onglets réellement ouverts et basculer vers le résultat sélectionné.
- Navigation dans la palette au clavier avec les flèches, `Entrée` et `Échap`.

### Changed
- La liste des onglets occupe désormais presque toute la hauteur de la fenêtre.
- Les contrôles de version et de restauration sont regroupés dans un en-tête compact.

## [0.11.0] - 2026-06-29
### Changed
- Liste des onglets compactée à 38 px avec URL complète visible.
- Clic sur le titre, l’URL ou le domaine pour activer directement l’onglet Chrome correspondant.
- Graphe Parcours élargi avec cartes de texte anti-collision et défilement horizontal.
- Clic sur l’URL du Parcours pour activer l’onglet existant ou rouvrir une page fermée.
- Suppression de la création manuelle de jalons dans l’interface.
- Versions automatiques après navigation ou changement structurel, avec délai anti-doublons de 30 secondes.
- Panneau de détails fermé par défaut et libellés clarifiés lorsqu’un onglet est sélectionné.
- Accès à toutes les sessions enregistrées avec actions Afficher et Restaurer sur chaque version.
- Restauration rendue visible directement sous la timeline de versions.
- Page de gestion automatiquement épinglée et réutilisée lors d’un clic sur l’icône PK Session.

## [0.10.0] - 2026-06-28
### Added
- Extension Chrome Manifest V3 construite avec WXT, React et TypeScript.
- Jalons manuels et versions automatiques dédupliquées toutes les 15 minutes.
- Restauration non destructive des fenêtres, groupes, épingles et onglets en veille.
- Journal local des créations, navigations, activations et fermetures d’onglets.
- Vue Parcours inspirée de GitGraph avec lignes de vie et changements d’onglet.
- Recherche transversale, exclusions de domaines, import de l’historique Chrome et sauvegarde JSON.
- Interface shadcn claire avec les écrans Sessions, Parcours, Recherche et Réglages.
