const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.get("/api/message", (_req, res) => {
  res.json({ message: "Hello from Node.js API in your monorepo!" });
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
