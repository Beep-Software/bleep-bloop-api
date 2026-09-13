import App from '../../src/app'
import { parseProjectForm } from '../../src/routers/sanchezRestore'

describe('Sanchez Restore routes', () => {
    it('protects portfolio mutations with the API JWT hook', async () => {
        const app = await App()
        const response = await app.inject({ method: 'POST', url: '/api/sanchezRestore/projects', payload: { slug: 'test', title: 'Test' } })
        await app.close()

        expect(response.statusCode).toBe(401)
        expect(response.json()).toEqual({ error: 'Missing or invalid authorization header' })
    })

    it('buffers repeated images multipart parts and preserves scalar fields', async () => {
        const request = {
            parts: async function* () {
                yield { type: 'field', fieldname: 'title', value: 'Test project' }
                yield { type: 'field', fieldname: 'category', value: 'Detailing' }
                yield { type: 'field', fieldname: 'description', value: 'Description' }
                yield { type: 'file', fieldname: 'images', filename: 'one.jpg', mimetype: 'image/jpeg', toBuffer: async () => Buffer.from([1, 2]) }
                yield { type: 'file', fieldname: 'images', filename: 'two.png', mimetype: 'image/png', toBuffer: async () => Buffer.from([3, 4]) }
            }
        } as any

        await expect(parseProjectForm(request, false)).resolves.toMatchObject({
            title: 'Test project',
            category: 'Detailing',
            description: 'Description',
            images: [
                { fileName: 'one.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([1, 2]), sortOrder: 0 },
                { fileName: 'two.png', mimeType: 'image/png', buffer: Buffer.from([3, 4]), sortOrder: 1 }
            ]
        })
    })

    it('rejects file parts that are not named images', async () => {
        const request = {
            parts: async function* () {
                yield { type: 'file', fieldname: 'file', filename: 'one.jpg', mimetype: 'image/jpeg', toBuffer: async () => Buffer.from([1]) }
            }
        } as any

        await expect(parseProjectForm(request, false)).rejects.toThrow('Unexpected file field')
    })
})