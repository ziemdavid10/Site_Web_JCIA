# Validation complète du backend JCIA

## Installation propre

```bat
rmdir /s /q node_modules
npm ci
```

## Suite complète

```bat
npm test
```

La suite doit se terminer avec :

```text
fail 0
```

## Vérification qu'aucun serveur principal ne démarre pendant les tests

Pendant `npm test`, aucun message `Serveur démarré sur http://localhost:5000` ne doit apparaître.

Les tests HTTP démarrent leurs propres serveurs sur leurs ports de test.

## Démarrage normal

```bat
npm start
```

Dans ce cas seulement, le serveur principal écoute sur `PORT` (5000 par défaut).
