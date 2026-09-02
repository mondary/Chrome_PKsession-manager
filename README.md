# PK Session

[FR](README.md) · [EN](README_en.md)

PK Session conserve vos espaces Chrome comme des sessions vivantes, versionnées automatiquement et restaurables sans fermer vos fenêtres actuelles.

## Fonctionnalités

- Versions immuables créées après les changements de navigation et de structure.
- Composition, ordre, groupes, épingles, onglet actif et état de veille conservés.
- Restauration non destructive dans une nouvelle fenêtre Chrome.
- Identité durable de chaque onglet et historique complet de ses navigations.
- Relations parent/enfant entre les onglets ouverts depuis une page.
- Trois vues complémentaires : Espace, Parcours et Origines.
- Aperçu de page au survol, favicon, titre, URL et fermeture directe pour chaque onglet actif.
- Badge de l’icône synchronisé avec le nombre d’onglets web ouverts.
- Stockage local dans IndexedDB, sans compte, API distante ni télémétrie.

## Utilisation

- **Espace** affiche les onglets et groupes d’une version précise.
- **Parcours** montre les lignes de vie et changements d’adresse de chaque onglet.
- **Origines** représente les relations entre les onglets parents et enfants.
- La colonne Versions permet de consulter puis restaurer un état antérieur.

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
