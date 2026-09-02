import { FastifyPluginAsync } from 'fastify'

import AuthController from '../controllers/auth'
import AuthService from '../services/auth'
import { LoginPostRequest } from '../types/requests/authRequests'

export const Auth: FastifyPluginAsync = async (fastify) => {

    fastify.post<LoginPostRequest>('/login', { schema: fastify.getSchema('auth:postLogin') as {} }, async (req, res) => {
        const credentials = req.body
        return AuthController.login(credentials)
    })

    fastify.post<LoginPostRequest>('/register', async (req, res) => {
        const credentials = req.body
        return AuthController.register(credentials)
    })

    // Refresh token endpoint
    fastify.post<{ Body: { refreshToken: string } }>('/refresh', async (req, res) => {
        const { refreshToken } = req.body
        if (!refreshToken) {
            return res.status(400).send({ error: 'Refresh token is required' })
        }
        return AuthController.refreshToken(refreshToken)
    })

    // Logout endpoint
    fastify.post<{ Body: { refreshToken: string } }>('/logout', async (req, res) => {
        const { refreshToken } = req.body
        if (!refreshToken) {
            return res.status(400).send({ error: 'Refresh token is required' })
        }
        return AuthController.logout(refreshToken)
    })

}

export default Auth