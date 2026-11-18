import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';

/**
 * Auth middleware — validates the session cookie set by better-auth
 * and attaches the authenticated user's id to req.userId.
 */
export const protect = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session?.user?.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        req.userId = session.user.id;
        next();
    } catch (error: any) {
        console.error('[auth middleware]', error?.message ?? error);
        res.status(401).json({ message: 'Unauthorized' });
    }
};
