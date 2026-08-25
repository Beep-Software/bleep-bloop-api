import { FastifyPluginAsync } from 'fastify'

import DocumentsController from '../controllers/documents'
import {
    CreateDocumentRequest,
    ReadDocumentRequest,
    UpdateDocumentRequest,
    DeleteDocumentRequest
} from '../types/requests/documentsRequests'

export const Documents: FastifyPluginAsync = async (fastify) => {

    fastify.post<CreateDocumentRequest>('/*', async (req, res) => {
        return DocumentsController.create(req.params['*'], req.body.content)
    })

    fastify.get<ReadDocumentRequest>('/*', async (req, res) => {
        return DocumentsController.read(req.params['*'])
    })

    fastify.put<UpdateDocumentRequest>('/*', async (req, res) => {
        return DocumentsController.update(req.params['*'], req.body.content)
    })

    fastify.delete<DeleteDocumentRequest>('/*', async (req, res) => {
        return DocumentsController.delete(req.params['*'])
    })

}

export default Documents