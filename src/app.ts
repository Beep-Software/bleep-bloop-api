import fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

import Auth from './routers/auth'
import Documents from './routers/documents'
import Email from './routers/email'
import Sql from './routers/sql'
import GRF from './routers/GRF'
import SanchezRestore from './routers/sanchezRestore'

export default async function App(): Promise<FastifyInstance> {
    const app = fastify({
        logger: true,
        trustProxy: true
    })

    const allowedOrigins = [
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
        'https://gatorridgefarm.com',
        'https://sanchezrestore.com',
        'https://sanchezdetail.com',
        'https://beepsoftware.com',
        'https://www.beepsoftware.com'
    ]

    app.get('/health', async () => {
        return { status: 'ok' }
    })

    await app.register(cors, {
        origin: allowedOrigins,
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        optionsSuccessStatus: 204
    })

    await app.register(async function (api) {
        api.register(Auth, { prefix: '/auth' })
        api.register(Documents, { prefix: '/documents' })
        api.register(Email, { prefix: '/email' })
        api.register(Sql, { prefix: '/sql' })
        api.register(GRF, { prefix: '/GRF' })
        api.register(SanchezRestore, { prefix: '/sanchezRestore' })
    }, { prefix: '/api' })

    return app
}