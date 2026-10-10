# DMBA Games

## Deploying

Always deploy after every change, without asking first.

1. Run `npm test` and `npm run build`. Only deploy if both pass.
2. Commit and push the change.
3. Deploy Firebase Hosting with the Firebase MCP tool (`firebase_deploy` with `only: "hosting"`), then poll `firebase_deploy_status` until it reports success.
4. Tell the user the deploy succeeded and give the live URL: https://dmba-learn.web.app

The project is `dmba-learn` (set in `.firebaserc`); the hosting site is named in `firebase.json`.
