import { FastifyRequest } from 'fastify'
import { JwtPayload } from '../middleware/jwt'

declare global {
    namespace FastifyInstance {
        interface FastifyRequest {
            user?: JwtPayload
        }
    }
}

declare module 'fastify' {
    interface FastifyRequest {
        user?: JwtPayload
    }
}
