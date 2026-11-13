// Optional split frontend. Recommended: use the same-origin backend on port 5000.
const express = require('../backend/node_modules/express'),
  app = express();
app.disable('x-powered-by');
app.use(express.static(__dirname, { dotfiles: 'deny' }));
app.use((req, res) => res.status(404).send('Page not found'));
app.use((error, req, res, next) => res.status(400).send('Invalid request path'));
app.listen(5500, () =>
  console.log('Frontend: http://localhost:5500 (API must be running on port 5000)'),
);
