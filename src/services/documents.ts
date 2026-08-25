import { promises as fs } from 'node:fs'
import path from 'node:path'
import config from 'config'

const STORAGE_ROOT = path.resolve(config.get<string>('fileStorage.root'))

// Prevents path traversal outside of the configured storage root
function resolveSafePath(relativePath: string): string {
    const fullPath = path.resolve(STORAGE_ROOT, relativePath)
    if (fullPath !== STORAGE_ROOT && !fullPath.startsWith(STORAGE_ROOT + path.sep)) {
        throw new Error('Invalid file path')
    }
    return fullPath
}

export default class DocumentsService {

    static async create(relativePath: string, content: string) {
        const fullPath = resolveSafePath(relativePath)
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, Buffer.from(content, 'base64'), { flag: 'wx' })
        return { success: true, relativePath }
    }

    static async read(relativePath: string) {
        const fullPath = resolveSafePath(relativePath)
        const buffer = await fs.readFile(fullPath)
        return { success: true, relativePath, content: buffer.toString('base64') }
    }

    static async update(relativePath: string, content: string) {
        const fullPath = resolveSafePath(relativePath)
        await fs.access(fullPath)
        await fs.writeFile(fullPath, Buffer.from(content, 'base64'))
        return { success: true, relativePath }
    }

    static async delete(relativePath: string) {
        const fullPath = resolveSafePath(relativePath)
        await fs.unlink(fullPath)
        return { success: true, relativePath }
    }

}
