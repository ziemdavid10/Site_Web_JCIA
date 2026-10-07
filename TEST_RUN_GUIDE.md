# Lancer les tests du backend JCIA

```bash
npm ci                      # installation propre (Linux, macOS ou Windows)
npm run lint                # ESLint
npm test                    # tests unitaires (tests/unit)            ~2 s
npm run test:integration    # intégration : vrai serveur + faux TIKORA ~15 s
npm run test:all            # les deux
npm run test:load:smoke     # charge k6, 30 s (k6 requis, ou K6_BIN=…)
npm run test:load           # charge k6 nominale, 5 min
node tests/load/run-stack.js stress|spike|soak
```

- Chaque fichier de test a **sa propre base SQLite temporaire** (`tests/helpers/setup.js`) :
  `data/database.sqlite` n'est jamais modifié, le fichier `.env` n'est pas lu.
- Aucun test n'appelle TIKORA ni un vrai serveur SMTP : le faux TIKORA
  (`tests/helpers/mock-tikora-server.js`) reproduit l'API Partenaire.
- Importer `src/app.js` n'ouvre aucun port ; le serveur démarre avec `npm start`
  (`src/server.js`).
- Envoi réel d'un e-mail de contrôle SMTP : `npm run email:test -- vous@example.com`.

Le détail (scénarios, résultats de charge, CI) est dans `../PROCEDURE.md`.
