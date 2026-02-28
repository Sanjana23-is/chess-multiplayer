import { Request, Response, Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_chess_key";

// Helper to verify a token and get the user ID
export const verifyToken = (token: string): string | null => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        return decoded.id;
    } catch (error) {
        return null;
    }
};

// Register
authRouter.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, name, password } = req.body;

        if (!email || !name || !password) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: "User with this email already exists" });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
            }
        });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, rating: user.rating } });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, rating: user.rating } });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get current user (me)
authRouter.get('/me', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, name: true, rating: true, createdAt: true }
        });

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
});
// Get current user games
authRouter.get('/me/games', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

        const games = await prisma.game.findMany({
            where: {
                OR: [
                    { whitePlayerId: decoded.id },
                    { blackPlayerId: decoded.id }
                ]
            },
            include: {
                whitePlayer: {
                    select: { id: true, name: true, rating: true }
                },
                blackPlayer: {
                    select: { id: true, name: true, rating: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({ games });
    } catch (error) {
        console.error("Failed to fetch games:", error);
        res.status(500).json({ error: "Failed to fetch games" });
    }
});
