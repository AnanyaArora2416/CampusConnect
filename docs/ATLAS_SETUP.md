# Atlas and startup troubleshooting

`npm start` uses `backend/.env`; `npm run demo` ignores it and uses a disposable local database. Demo accounts do not exist in your Atlas cluster unless you deliberately create equivalent accounts there. Public registration creates students; the operator provisioning tool creates the first admin.

## Read-only diagnosis

Run `npm run check-db` from the project root. This uses MongoClient directly and issues `ping`; it does not load models, initialize indexes, seed data or modify records. Messages intentionally omit URI/credentials. Never paste `.env` or a full connection string into issues/chat.

| Symptom                         | What to check                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing MONGO_URI               | Create `backend/.env` from the example and privately fill the Atlas Drivers URI.                                                                                    |
| DNS lookup failure              | Correct cluster hostname; DNS must support Atlas SRV, TXT and host lookups. Public DNS success alone does not establish that the cloud environment's DNS/TCP works. |
| ECONNREFUSED / timeout          | Cluster active; outbound MongoDB TCP access (typically port 27017); firewall/cloud policy; Atlas Network Access for the Node machine's outbound IP.                 |
| Authentication failure          | Atlas database user, password/URL encoding, correct cluster/auth database. Atlas web-console login is not a database user.                                          |
| Configuration/JWT error         | Provide a random JWT secret of at least 32 bytes; do not place it in browser configuration.                                                                         |
| Duplicate/index startup failure | Review existing duplicate emails/registrations before initializing unique indexes. Do not delete records to silence it.                                             |
| Port already in use             | Stop the other demo/server or change PORT. Demo uses DEMO_PORT.                                                                                                     |
| Browser connection refused      | Ensure server startup completed. Browser and Node must be on the same machine, or use an actual forwarded preview URL.                                              |

The configured server starts only after database connection and index initialization. The UI cannot load while this startup fails. There is no silent fallback to fake data. `GET /api/health` reports connection state once the HTTP server is running.

## Cloud environments

Localhost in your computer's browser is not Codex Cloud's localhost. A cloud environment needs DNS and outbound TCP permissions as well as Atlas's inbound IP allowance. HTTP access to github.com does not establish MongoDB TCP access. Do not disable TLS verification or publish secrets to work around networking. Use your own VS Code/Node installation or configure the cloud environment's network settings and use its shared browser.

## Existing data and credentials

The enhanced schemas add status/token-version and coursework fields with defaults, and response serialization supports older assignments without requirements/resources/marks. Existing users must sign in again because token format changed. Existing data still needs backup and index compatibility review; no migration has been executed against your cluster.

The repository excludes `.env`, private keys, generated dependencies and uploads. If credentials were shared in an earlier archive, rotate them in Atlas before distributing that archive further. The application source and blank `.env.example` do not contain those values.
