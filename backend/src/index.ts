import express from "express";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`backend on :${PORT}`);
});
