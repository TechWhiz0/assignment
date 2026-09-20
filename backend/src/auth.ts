import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User } from "./models.ts";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function register(req: Request, res: Response) {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !email.includes("@") || password.length < 8) {
    res.status(400).json({
      error: { code: "INVALID_INPUT", message: "Email and 8+ character password required" },
    });
    return;
  }
  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "Email already registered" } });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });
  req.session.userId = String(user._id);
  res.status(201).json({ id: user._id, email: user.email });
}

export async function login(req: Request, res: Response) {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: { code: "BAD_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }
  req.session.userId = String(user._id);
  res.json({ id: user._id, email: user.email });
}

export function logout(req: Request, res: Response) {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
}

export async function me(req: Request, res: Response) {
  if (!req.session.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } });
    return;
  }
  const user = await User.findById(req.session.userId);
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Session expired" } });
    return;
  }
  res.json({ id: user._id, email: user.email });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } });
    return;
  }
  next();
}
