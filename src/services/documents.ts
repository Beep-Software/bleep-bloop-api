import { promises as fs } from 'node:fs'
import path from 'node:path'
import config from 'config'
import { beepPool } from '../db'

const STORAGE_ROOT = path.resolve(config.get<string>('fileStorage.root'))
const WIKI_ROOT = path.join(STORAGE_ROOT, 'wiki')

export interface WikiDocumentSummary {
    id: string
    title: string
    relativePath: string
    updatedAt: string
}

interface DocumentMetadata {
    docId: string
    fileUuid: string
    relativePath: string
    fileName: string
    year: number
    month: number
    day: number
}

// Prevents path traversal outside of the configured storage root
function resolveSafePath(relativePath: string): string {
    const fullPath = path.resolve(STORAGE_ROOT, relativePath)
    if (fullPath !== STORAGE_ROOT && !fullPath.startsWith(STORAGE_ROOT + path.sep)) {
        throw new Error('Invalid file path')
    }
    return fullPath
}

function getDocumentMetadata(relativePath: string): DocumentMetadata {
    const normalizedPath = relativePath.replace(/\\/g, '/')
    const match = normalizedPath.match(/^wiki\/(\d{4})\/(\d{2})\/(\d{2})\/([0-9a-f-]{36})\.md$/i)
    if (!match) throw new Error('Wiki documents must use the YYYY/MM/DD/<uuid>.md path format')
    const fileUuid = match[4]
    return {
        docId: fileUuid,
        fileUuid,
        relativePath: normalizedPath,
        fileName: `${fileUuid}.md`,
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3])
    }
}

function getTitle(content: string, fallback: string): string {
    return content.match(/^title:\s*(.+?)\s*$/m)?.[1]?.trim() ?? fallback
}

async function recordCreatedDocument(relativePath: string, content: string): Promise<void> {
    const metadata = getDocumentMetadata(relativePath)
    const title = getTitle(content, metadata.fileUuid)
    const pool = await beepPool()
    await pool.request()
        .input('docId', metadata.docId)
        .input('title', title)
        .input('storageRoot', config.get<string>('fileStorage.root'))
        .input('relativePath', metadata.relativePath)
        .input('fileName', metadata.fileName)
        .input('fileUuid', metadata.fileUuid)
        .input('fileExtension', '.md')
        .input('year', metadata.year)
        .input('month', metadata.month)
        .input('day', metadata.day)
        .query(`
            INSERT INTO [beep].[documents]
                ([doc_id], [title], [storage_root], [relative_path], [file_name], [file_uuid], [file_extension], [file_year], [file_month], [file_day])
            VALUES
                (@docId, @title, @storageRoot, @relativePath, @fileName, @fileUuid, @fileExtension, @year, @month, @day);
            INSERT INTO [beep].[document_events]
                ([doc_id], [event_type], [relative_path], [file_name], [file_uuid])
            VALUES
                (@docId, 'created', @relativePath, @fileName, @fileUuid);
        `)
}

async function recordUpdatedDocument(relativePath: string, content: string): Promise<void> {
    const metadata = getDocumentMetadata(relativePath)
    const title = getTitle(content, metadata.fileUuid)
    const pool = await beepPool()
    await pool.request()
        .input('docId', metadata.docId)
        .input('title', title)
        .input('relativePath', metadata.relativePath)
        .input('fileName', metadata.fileName)
        .input('fileUuid', metadata.fileUuid)
        .query(`
            UPDATE [beep].[documents]
            SET [title] = @title, [status] = 'active', [updated_at] = SYSUTCDATETIME(), [deleted_at] = NULL
            WHERE [doc_id] = @docId AND [relative_path] = @relativePath;
            IF @@ROWCOUNT = 0 THROW 51001, 'Document metadata was not found', 1;
            INSERT INTO [beep].[document_events]
                ([doc_id], [event_type], [relative_path], [file_name], [file_uuid])
            VALUES
                (@docId, 'updated', @relativePath, @fileName, @fileUuid);
        `)
}

async function recordDeletedDocument(relativePath: string): Promise<void> {
    const metadata = getDocumentMetadata(relativePath)
    const pool = await beepPool()
    await pool.request()
        .input('docId', metadata.docId)
        .input('relativePath', metadata.relativePath)
        .input('fileName', metadata.fileName)
        .input('fileUuid', metadata.fileUuid)
        .query(`
            UPDATE [beep].[documents]
            SET [status] = 'deleted', [updated_at] = SYSUTCDATETIME(), [deleted_at] = SYSUTCDATETIME()
            WHERE [doc_id] = @docId AND [relative_path] = @relativePath;
            IF @@ROWCOUNT = 0 THROW 51001, 'Document metadata was not found', 1;
            INSERT INTO [beep].[document_events]
                ([doc_id], [event_type], [relative_path], [file_name], [file_uuid])
            VALUES
                (@docId, 'deleted', @relativePath, @fileName, @fileUuid);
        `)
}

export default class DocumentsService {

    static async listWiki(): Promise<WikiDocumentSummary[]> {
        const documents: WikiDocumentSummary[] = []

        async function visit(directory: string): Promise<void> {
            let entries
            try {
                entries = await fs.readdir(directory, { withFileTypes: true })
            } catch (error: unknown) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
                throw error
            }

            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name)
                if (entry.isDirectory()) {
                    await visit(fullPath)
                    continue
                }
                if (!entry.isFile() || !entry.name.endsWith('.md')) continue

                const content = await fs.readFile(fullPath, 'utf8')
                const title = getTitle(content, entry.name.replace(/\.md$/, ''))
                const stats = await fs.stat(fullPath)
                documents.push({
                    id: entry.name.replace(/\.md$/, ''),
                    title,
                    relativePath: path.relative(STORAGE_ROOT, fullPath).split(path.sep).join('/'),
                    updatedAt: stats.mtime.toISOString()
                })
            }
        }

        await visit(WIKI_ROOT)
        return documents.sort((first, second) => first.title.localeCompare(second.title))
    }

    static async create(relativePath: string, content: string) {
        const fullPath = resolveSafePath(relativePath)
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, Buffer.from(content, 'base64'), { flag: 'wx' })
        try {
            await recordCreatedDocument(relativePath, Buffer.from(content, 'base64').toString('utf8'))
        } catch (error) {
            await fs.unlink(fullPath)
            throw error
        }
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
        const decodedContent = Buffer.from(content, 'base64').toString('utf8')
        await fs.writeFile(fullPath, decodedContent)
        await recordUpdatedDocument(relativePath, decodedContent)
        return { success: true, relativePath }
    }

    static async delete(relativePath: string) {
        const fullPath = resolveSafePath(relativePath)
        await fs.unlink(fullPath)
        await recordDeletedDocument(relativePath)
        return { success: true, relativePath }
    }

}
