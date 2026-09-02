import { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'

// JWT configuration matching beep-auth
const JWT_CONFIG = {
    issuer: process.env.JWT_ISSUER || 'BeepAuth',
    audience: process.env.JWT_AUDIENCE || 'JwtAudience',
    key: process.env.JWT_KEY || 'BeepAuthKeyBeepAuthKeyBeepAuthKey'
}

export interface JwtPayload {
    sub: string
    name: string
    email?: string
    role?: string[]
    scope?: string[]
    iat: number
    exp: number
}

// Extend FastifyRequest to include user property
declare module 'fastify' {
    interface FastifyRequest {
        user?: JwtPayload
    }
}

/**
 * Validate JWT token from Authorization header
 * Token should be in format: "Bearer <token>"
 */
export async function validateJWT(request: FastifyRequest, reply: FastifyReply) {
    try {
        const authHeader = request.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({ error: 'Missing or invalid authorization header' })
        }

        const token = authHeader.substring(7)

        try {
            const decoded = jwt.verify(token, JWT_CONFIG.key, {
                issuer: JWT_CONFIG.issuer,
                audience: JWT_CONFIG.audience
            }) as JwtPayload

            // Attach decoded token to request for use in controllers
            request.user = decoded
        } catch (verifyError: any) {
            if (verifyError.name === 'TokenExpiredError') {
                return reply.status(401).send({ error: 'Token expired' })
            } else if (verifyError.name === 'JsonWebTokenError') {
                return reply.status(401).send({ error: 'Invalid token' })
            }
            throw verifyError
        }
    } catch (error: any) {
        console.error('JWT validation error:', error.message)
        return reply.status(401).send({ error: 'Authentication failed' })
    }
}

/**
 * Decorator for Fastify to use JWT validation as a hook
 * Usage: await app.register(jwtPlugin)
 */
export async function jwtPlugin(fastify: any) {
    fastify.decorate('authenticate', validateJWT)
    
    // Extend FastifyRequest type to include user
    fastify.register(async (fastify: any) => {
        fastify.addHook('preHandler', async (request: FastifyRequest & { user?: JwtPayload }, reply: FastifyReply) => {
            // This hook is optional and doesn't enforce auth globally
            // Use onRequest hook instead for specific routes
        })
    })
}

/**
 * Optional: Create a hook to check for specific scopes/permissions
 */
export function requireScope(requiredScope: string) {
    return async (request: FastifyRequest & { user?: JwtPayload }, reply: FastifyReply) => {
        if (!request.user) {
            return reply.status(401).send({ error: 'Not authenticated' })
        }

        if (!request.user.scope?.includes(requiredScope)) {
            return reply.status(403).send({ error: 'Insufficient permissions' })
        }
    }
}

/**
 * Optional: Create a hook to check for specific roles
 */
export function requireRole(requiredRole: string) {
    return async (request: FastifyRequest & { user?: JwtPayload }, reply: FastifyReply) => {
        if (!request.user) {
            return reply.status(401).send({ error: 'Not authenticated' })
        }

        if (!request.user.role?.includes(requiredRole)) {
            return reply.status(403).send({ error: 'Insufficient permissions' })
        }
    }
}
