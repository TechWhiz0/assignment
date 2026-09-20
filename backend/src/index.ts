import { resolve } from "node:path";
import { config } from "dotenv";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import mongoose from "mongoose";
import { login, logout, me, register, requireAuth } from "./auth.ts";
import {
  batchCreate,
  createKit,
  getKit,
  listKits,
  patchKit,
  recordPractice,
  regenerateSection,
} from "./routes/kits.ts";

config({ path: resolve(import.meta.dirname, "../.env") });

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/interview-kit";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

await mongoose.connect(MONGODB_URI);

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  }),
);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.post("/auth/register", (req, res, next) => register(req, res).catch(next));
app.post("/auth/login", (req, res, next) => login(req, res).catch(next));
app.post("/auth/logout", logout);
app.get("/auth/me", (req, res, next) => me(req, res).catch(next));

app.get("/kits", requireAuth, (req, res, next) => listKits(req, res).catch(next));
app.post("/kits", requireAuth, (req, res, next) => createKit(req, res).catch(next));
app.post("/kits/batch", requireAuth, (req, res, next) => batchCreate(req, res).catch(next));
app.get("/kits/:id", requireAuth, (req, res, next) => getKit(req, res).catch(next));
app.patch("/kits/:id", requireAuth, (req, res, next) => patchKit(req, res).catch(next));
app.post("/kits/:id/regenerate", requireAuth, (req, res, next) => regenerateSection(req, res).catch(next));
app.post("/kits/:id/practice", requireAuth, (req, res, next) => recordPractice(req, res).catch(next));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: err.message } });
});

app.listen(PORT, () => console.log(`backend on :${PORT}`));
