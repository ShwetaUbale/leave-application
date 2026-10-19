import express from 'express';
import cors from 'cors';
import { router } from './routes.js';
import { initDb } from './db.js';
import { seed } from './seed.js';

await initDb();
await seed();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
