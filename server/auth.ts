import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { storage } from "./storage";
import type { Express, Request } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(
  supplied: string,
  stored: string
): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);

  const sessionMiddleware = session({
    store: new PgSession({
      pool: pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "digiten-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Invalid credentials" });
        const isValid = await comparePasswords(password, user.password);
        if (!isValid)
          return done(null, false, { message: "Invalid credentials" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password, fullName, organizationName } = req.body;
      if (!username || !password || !organizationName) {
        return res
          .status(400)
          .json({ message: "Username, password, and organization name are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const org = await storage.createOrganization({
        name: organizationName,
        email: username,
      });

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        fullName: fullName || username,
        role: "admin",
        organizationId: org.id,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...safeUser } = user;
        return res.status(201).json(safeUser);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate(
      "local",
      (err: any, user: any, info: any) => {
        if (err) return next(err);
        if (!user)
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials" });
        req.login(user, (err) => {
          if (err) return next(err);
          const { password: _, ...safeUser } = user;
          return res.json(safeUser);
        });
      }
    )(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password: _, ...safeUser } = req.user as any;
    res.json(safeUser);
  });
}

export function requireAuth(req: Request, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
