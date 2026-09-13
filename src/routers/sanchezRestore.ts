import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { createReadStream } from 'node:fs'
import SanchezRestoreController from '../controllers/sanchezRestore'
import { CreateProjectInput, UpdateProjectInput, UploadImageInput } from '../types/sanchezRestore'

async function parseProjectForm(request: FastifyRequest, includeRemovedImages: boolean): Promise<CreateProjectInput | UpdateProjectInput> {
    const fields: Record<string, string> = {}
    const removedImageIds: string[] = []
    const images: UploadImageInput[] = []
    for await (const part of request.parts()) {
        if (part.type === 'file') {
            images.push({
                projectId: '',
                fileName: part.filename,
                mimeType: part.mimetype,
                buffer: await part.toBuffer(),
                sortOrder: images.length
            })
        } else if (part.fieldname === 'removedImageIds' && includeRemovedImages) {
            removedImageIds.push(String(part.value))
        } else {
            fields[part.fieldname] = String(part.value)
        }
    }
    return { title: fields.title?.trim() ?? '', category: fields.category?.trim() ?? '', description: fields.description ?? '', images, ...(includeRemovedImages ? { removedImageIds } : {}) } as CreateProjectInput | UpdateProjectInput
}

export const SanchezRestore: FastifyPluginAsync = async (fastify) => {
    fastify.get('/projects', async () => ({ success: true, projects: await SanchezRestoreController.listProjects() }))
    fastify.get<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
        const project = await SanchezRestoreController.getProject(request.params.id)
        if (!project) return reply.code(404).send({ error: 'Project not found' })
        return { success: true, project, images: await SanchezRestoreController.listImages(project.id) }
    })
    fastify.post('/projects', async request => {
        const project = await SanchezRestoreController.createProject(await parseProjectForm(request, false) as CreateProjectInput)
        return { success: true, project }
    })
    fastify.put<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
        const project = await SanchezRestoreController.updateProject(request.params.id, await parseProjectForm(request, true) as UpdateProjectInput)
        if (!project) return reply.code(404).send({ error: 'Project not found' })
        return { success: true, project }
    })
    fastify.delete<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
        if (!await SanchezRestoreController.deleteProject(request.params.id)) return reply.code(404).send({ error: 'Project not found' })
        return { success: true }
    })
    fastify.get<{ Params: { projectId: string } }>('/projects/:projectId/images', async request => ({ success: true, images: await SanchezRestoreController.listImages(request.params.projectId) }))
    fastify.post<{ Params: { projectId: string } }>('/projects/:projectId/images', async (request, reply) => {
        let upload: { filename: string, mimetype: string, buffer: Buffer } | undefined
        const fields: Record<string, string> = {}
        for await (const part of request.parts()) {
            if (part.type === 'file') upload = { filename: part.filename, mimetype: part.mimetype, buffer: await part.toBuffer() }
            else fields[part.fieldname] = String(part.value)
        }
        if (!upload) return reply.code(400).send({ error: 'An image file is required' })
        const image = await SanchezRestoreController.createImage({ projectId: request.params.projectId, fileName: upload.filename, mimeType: upload.mimetype, buffer: upload.buffer, sortOrder: fields.sortOrder ? Number(fields.sortOrder) : undefined })
        return reply.code(201).send({ success: true, image })
    })
    fastify.get<{ Params: { id: string } }>('/images/:id', async (request, reply) => {
        const result = await SanchezRestoreController.getImage(request.params.id)
        if (!result) return reply.code(404).send({ error: 'Image not found' })
        return reply.type(result.image.mimeType).send(createReadStream(result.fullPath))
    })
    fastify.delete<{ Params: { id: string } }>('/images/:id', async (request, reply) => {
        if (!await SanchezRestoreController.deleteImage(request.params.id)) return reply.code(404).send({ error: 'Image not found' })
        return { success: true }
    })
}

export default SanchezRestore