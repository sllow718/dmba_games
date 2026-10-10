# DMBA Games

Browser games that teach data mining for business analytics to polytechnic students. Each activity is a shop on one street; the first one is open.

**Basket Detective** (association rules): students help Mrs Tan, who runs the Corner Mart minimart, find out what her customers buy together. There are six missions, and each one unlocks after the previous one is complete.

| Aisle | Mission | Teaches |
| --- | --- | --- |
| 1 | Read the Receipts | transactions, itemsets, support count |
| 2 | Support Hunt | support, minimum-support threshold |
| 3 | If This, Then That | rules, confidence, direction |
| 4 | The Lift Lens | lift, baseline, misleading rules |
| 5 | Apriori Climb | Apriori principle, pruning |
| 6 | Manager's Meeting | support + confidence + lift → a store decision |

Each mission is its own page and has four stages:

1. **Review:** four short cards with a step-by-step worked example on the receipts.
2. **Explore:** a hands-on task that must be finished before the checkpoint opens.
3. **Checkpoint:** 3–5 questions. A wrong answer gets a hint from Mrs Tan, and the hints get more specific: a targeted nudge, then pointing to the data, then a worked step. Students retry until they're right.
4. **Results:** stars, a badge and a formula card. The next mission unlocks.

Progress is saved in the browser (`localStorage`). There are no accounts and no server.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # rule engine, mission content and unlock rules
npm run build      # static site in dist/
```

## Deploy

`.github/workflows/ci.yml` runs the type check, the tests and the build on every pull request. It publishes `main` to GitHub Pages; enable that once under **Settings → Pages → Source: GitHub Actions**. The build uses relative paths and hash routing, so `dist/` also works on any other static host.

### Firebase MCP

`.mcp.json` registers Firebase's MCP server (`scripts/firebase-mcp.sh`, which runs `firebase-tools mcp`), so Claude Code sessions in this repo can create, configure and deploy Firebase projects. It needs Firebase credentials:

- **On your own machine:** run `npx firebase-tools login` once.
- **In a Claude Code cloud session:** add an environment variable `FIREBASE_SERVICE_ACCOUNT` containing a service account key with the Firebase Hosting Admin role, base64-encoded so it fits on one line (`base64 -i key.json | tr -d '\n'`). One-line JSON also works. The script writes it to a private temp file for the server.

## Project layout

```
src/
  core/                 progress store, unlocking, scoring, hash router, shared types
  components/           receipts, tokens, Mrs Tan, Review and Checkpoint
  pages/                Hub, MissionMap, MissionPage, FormulaCards
  activities/
    index.ts            activities on the street
    association-rules/
      engine.ts         support, confidence, lift, Apriori, answer parsing
      data.ts           items (colour + tag) and the two receipt datasets
      missions.tsx      review cards, briefs and checkpoint questions for all six missions
      explores.tsx      the hands-on task for each mission
      RuleBuilder.tsx   the shared rule builder
docs/                   design proposal and visual directions
```

### Editing questions and hints

All mission wording is in `src/activities/association-rules/missions.tsx`. Each question has:

- a `prompt`;
- for multiple choice, `options`, where every wrong option has its own `hint`;
- for a number answer, an `answer`, plus `traps` for common wrong numbers;
- a two-step `ladder` of later hints;
- an `explain` line shown when the student gets it right.

`npm test` recomputes every number answer from the receipts, so a typo in an answer fails the tests.

### Adding a new activity

Add a folder under `src/activities/`, export an `ActivityDef` (see `src/core/types.ts`), and add it to `ACTIVITIES` in `src/activities/index.ts`. The hub, map, unlocking, review, checkpoint and scoring all come with it.
