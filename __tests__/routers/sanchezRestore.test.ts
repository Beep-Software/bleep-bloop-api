import App from '../../src/app'

describe('Sanchez Restore routes', () => {
    it('protects portfolio mutations with the API JWT hook', async () => {
        const app = await App()
        const response = await app.inject({ method: 'POST', url: '/api/sanchezRestore/projects', payload: { slug: 'test', title: 'Test' } })
        await app.close()

        expect(response.statusCode).toBe(401)
        expect(response.json()).toEqual({ error: 'Missing or invalid authorization header' })
    })
})