# PK Session

[FR](README.md) · [EN](README_en.md)

PK Session conserve vos espaces Chrome comme des sessions vivantes, versionnées automatiquement et restaurables sans fermer vos fenêtres actuelles.

## Fonctionnalités

- Versions immuables créées après les changements de navigation et de structure.
- Composition, ordre, groupes, épingles, onglet actif et état de veille conservés.
- Restauration non destructive de toutes les fenêtres Chrome de la session.
- Identité durable de chaque onglet et historique complet de ses navigations.
- Relations parent/enfant entre les onglets ouverts depuis une page.
- Deux vues complémentaires : Espace et Chronologie.
- Aperçu de page au survol, favicon, titre, URL et fermeture directe pour chaque onglet actif.
- Badge de l’icône synchronisé avec le nombre d’onglets web ouverts.
- Stockage local dans IndexedDB, sans compte, API distante ni télémétrie.

## Utilisation

- **Espace** affiche les onglets et groupes d’une version précise.
- **Chronologie** fusionne navigations, activations, fermetures et relations parent/enfant, avec l’état actuel toujours visible à droite.
- La sélection d’un onglet met en évidence toute sa filiation et atténue les branches sans relation.
- La colonne Versions permet de consulter puis restaurer un état antérieur.
- Un clic sur une ligne active l’onglet Chrome correspondant ; la Chronologie ouvre son parcours détaillé.
- Les fenêtres apparaissent comme des packs distincts contenant leurs groupes et leurs onglets.
- `Cmd/Ctrl+K` cible la recherche et le bouton Réglages ouvre un drawer dédié.
- Les réglages permettent d’exporter ou d’importer manuellement toutes les données locales au format JSON.
- **Créer un point de restauration** conserve volontairement l’état courant, même si aucun onglet n’a changé.

## Build

Prérequis : [Bun](https://bun.sh/) et une version récente de Google Chrome.

```bash
cd v2
bun install
bun run compile
bun run test
bun run build
```

Le build décompressé se trouve dans `v2/extension-build/chrome-mv3`.

## Installation

1. Ouvrir `chrome://extensions`.
2. Activer **Mode développeur**.
3. Cliquer **Charger l’extension non empaquetée**.
4. Sélectionner `v2/extension-build/chrome-mv3`.
5. Après chaque build, cliquer **Actualiser** sur la carte de l’extension.

## Structure

- `v2/src/engine.ts` : capture, identité des onglets et restauration.
- `v2/src/db.ts` : stockage IndexedDB.
- `v2/src/App.tsx` : vues Espace, Parcours et Origines.
- `templates/` : concepts visuels ayant guidé la V2.
- `archive/v1` : branche d’archive de la V1.

## Confidentialité

La permission d’accès aux pages sert uniquement à capturer localement l’aperçu de l’onglet lorsqu’il devient actif. Les miniatures restent dans IndexedDB et ne sont jamais envoyées à un service distant.

## Historique

Voir le [CHANGELOG](CHANGELOG.md) pour l’historique complet.
