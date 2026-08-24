import 'dotenv/config'
import config from 'config'
import buildApp from './app'
import { beepPool, closePool } from './db'

async function startServer() {
    const app = await buildApp()

    const port = config.get<number>('server.port') ?? 3000
    const host = config.get<string>('server.host') ?? 'localhost'

    try {
        console.log('Connecting to MSSQL database...')
        // log something from the database to verify connection
        const pool = await beepPool()
        const result = await pool.request().query('SELECT 1 AS number')
        console.log('Database connection verified:', result.recordset[0].number)
        await closePool()
    } catch (err) {
        console.error('Database Connection Failed!', err)
        process.exit(1)
    }

    try {
        await app.listen({ port, host })
        console.log(`Server running at http://${host}:${port}`)
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

startServer()