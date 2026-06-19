# Legacy prototype (archived)

These files are the original standalone, pre–Next.js prototype of Agora. They are
kept for historical reference only and are **not used by the running app**.

| File | What it was |
|------|-------------|
| `index.html` | Static entry point for the vanilla-JS prototype |
| `app.js` | Single-file vanilla-JS implementation of the demo |
| `proxy.js` | Early admin-route guard. Next.js never loaded it (middleware must be named `middleware.js`); admin protection now lives in the API routes. |

The active app is the Next.js `app/` directory. The only file from the original
prototype still in use is `styles.css` (imported by `app/layout.js`), which is why
it remains at the project root.

Safe to delete this folder entirely if you no longer need the reference.
