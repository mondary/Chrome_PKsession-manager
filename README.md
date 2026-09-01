# PK Session

PK Session est une extension Chrome locale qui versionne les fenêtres et onglets ouverts, restaure une ancienne session sans fermer la session actuelle et construit une carte chronologique de la navigation par onglet.

## Fonctionnalités

- Capture automatique après navigation, ouverture, fermeture, déplacement, groupement ou épinglage, avec délai anti-doublons de 30 secondes et vérification périodique toutes les 15 minutes.
- Navigation entre les versions sans action manuelle.
- États Chrome conservés : fenêtre, ordre, groupe, couleur du groupe, épingle, onglet actif, `discarded` et `frozen`.
- Restauration dans de nouvelles fenêtres, sans modification des fenêtres en cours.
- Ligne de vie par onglet : création, activation, URL visitée, redirection et fermeture.
- Import facultatif de l’ancien historique Chrome dans une archive séparée, car Chrome ne fournit pas l’onglet d’origine de ces anciennes visites.
- Recherche par titre, URL et domaine.
- Palette `⌘K` (`Ctrl+K` sous Windows/Linux) pour rechercher les onglets actuellement ouverts, puis flèches et `Entrée` pour basculer vers l’onglet choisi.
- Activation directe de l’onglet Chrome en cliquant son titre, son URL ou son domaine.
- Page de gestion automatiquement épinglée et réutilisée, sans créer de doublons.
- Liste complète des sessions enregistrées avec restauration individuelle dans de nouvelles fenêtres.
- Export et import d’une sauvegarde JSON versionnée.
- Domaines exclus configurables, navigation privée systématiquement ignorée.
- Aucune API distante, aucun compte et aucune télémétrie.

## Installation locale

Prérequis : [Bun](https://bun.sh/) et une version récente de [Google Chrome](https://www.google.com/chrome/).

```bash
bun install
bun run build
```

Dans Chrome :

1. Ouvrir `chrome://extensions`.
2. Activer **Mode développeur**.
3. Cliquer **Charger l’extension non empaquetée**.
4. Sélectionner le dossier `extension-build/chrome-mv3` de ce projet. Ne pas sélectionner `src`.
5. Épingler **PK Session** dans la barre d’outils.
6. Cliquer son icône pour ouvrir l’application complète.

Après chaque modification de code, relancer `bun run build`, puis cliquer **Actualiser** sur la carte de l’extension dans `chrome://extensions`.

## Développement

```bash
bun run dev       # développement WXT
bun run compile   # vérification TypeScript
bun run test      # tests Vitest
bun run build     # build Chrome MV3
bun run zip       # archive distribuable
```

Le build décompressé se trouve dans le dossier visible `extension-build/chrome-mv3`.

## Données et permissions

Les sessions et événements sont stockés dans IndexedDB, dans le profil Chrome qui a installé l’extension. `chrome.storage.local` ne contient que de petites préférences. La permission `history` est facultative et n’est demandée que lorsque l’utilisateur lance explicitement l’import de l’historique antérieur.

Permissions principales :

- `tabs`, `tabGroups` : lire et restaurer l’état des onglets et groupes ;
- `webNavigation` : rattacher chaque navigation future à son onglet ;
- `alarms` : créer les jalons automatiques ;
- `storage`, `unlimitedStorage` : conserver l’historique local ;
- `favicon` : afficher les favicons sans service tiers.

## Limites connues de Chrome

- La collecte fiable de la lignée par onglet commence à l’installation de PK Session.
- L’historique Chrome antérieur peut être recherché, mais ne peut pas être rattaché honnêtement aux anciens onglets.
- Chrome ne permet pas de reconstruire la pile interne Précédent/Suivant d’un onglet. Une restauration recrée donc son URL enregistrée.
- Les identifiants natifs d’onglets et de groupes changent après un redémarrage ; PK Session utilise ses propres identifiants logiques et ne raccorde une ancienne lignée qu’en cas de correspondance fiable.
- Les pages internes `chrome://`, les pages de l’extension et la navigation privée ne sont jamais enregistrées.

## Structure

- `src/entrypoints/background.ts` : événements Chrome, commandes et alarmes MV3.
- `src/background/session-engine.ts` : captures, journal et restauration.
- `src/lib/db.ts` : schéma IndexedDB et sauvegardes JSON.
- `src/features/` : écrans Sessions, Parcours, Recherche et Réglages.
- `public/` : icônes générées à partir de `icon2.png`.
