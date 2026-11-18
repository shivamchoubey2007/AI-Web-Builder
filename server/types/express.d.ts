// Augment Express Request to carry userId set by the auth middleware
declare namespace Express {
    interface Request {
        userId?: string;
    }
}
