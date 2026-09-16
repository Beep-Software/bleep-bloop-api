import { FastifyPluginAsync } from 'fastify'
import EmailController from '../controllers/email'

export const Email: FastifyPluginAsync = async (fastify) => {

    fastify.post('/create', EmailController.create)
    fastify.post('/test', EmailController.create)

}

export default Email