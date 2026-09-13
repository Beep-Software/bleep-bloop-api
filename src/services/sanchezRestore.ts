import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import config from 'config'
import sql from 'mssql'
import { beepPool } from '../db'
import {
    CreateProjectInput,
    PortfolioImage,
    PortfolioProject,
    UpdateProjectInput,
    UploadImageInput
} from '../types/sanchezRestore'

const STORAGE_ROOT = path.resolve(config.get<string>('fileStorage.root'))
const IMAGE_ROOT = 'sanchez-restore-more/images'
const IMAGE_STORAGE_ROOT = '/srv/file-storage/images'
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const MAX_IMAGE_SIZE = 25 * 1024 * 1024

function mapProject(row: Record<string, unknown>): PortfolioProject {
    return {
        id: String(row.project_id ?? row.id),
        slug: String(row.slug),
        title: String(row.title),
        category: String(row.category ?? ''),
        description: row.description == null ? null : String(row.description),
        createdAt: new Date(String(row.created_at)).toISOString(),
        updatedAt: new Date(String(row.updated_at)).toISOString(),
        images: []
    }
}

function mapImage(row: Record<string, unknown>): PortfolioImage {
    return {
        id: String(row.image_id ?? row.id),
        projectId: String(row.project_id),
        relativePath: String(row.relative_path),
        fileName: String(row.file_name),
        mimeType: String(row.mime_type),
        fileSize: Number(row.file_size),
        sortOrder: Number(row.sort_order ?? 0),
        createdAt: new Date(String(row.created_at)).toISOString(),
        url: `/api/sanchezRestore/images/${String(row.image_id ?? row.id)}`
    }
}

function safeRelativePath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/')
    const fullPath = path.resolve(STORAGE_ROOT, normalized)
    if (fullPath !== STORAGE_ROOT && !fullPath.startsWith(STORAGE_ROOT + path.sep)) throw new Error('Invalid file path')
    return normalized
}

function extensionFor(fileName: string, mimeType: string): string {
    if (!MIME_TYPES.has(mimeType)) throw new Error('Unsupported image MIME type')
    const extension = path.extname(fileName).slice(1).toLowerCase()
    const mimeExtension = mimeType.split('/')[1]?.toLowerCase()
    const selected = extension === 'jpeg' ? 'jpg' : extension || (mimeExtension === 'jpeg' ? 'jpg' : mimeExtension)
    if (!selected || !ALLOWED_EXTENSIONS.has(selected)) throw new Error('Unsupported image type')
    if (selected !== (mimeExtension === 'jpeg' ? 'jpg' : mimeExtension)) throw new Error('Image extension does not match MIME type')
    return selected
}

async function executeRows<T>(procedure: string, inputs: Record<string, unknown>): Promise<T[]> {
    const pool = await beepPool()
    const request = pool.request()
    for (const [name, value] of Object.entries(inputs)) request.input(name, value)
    const result = await request.execute(procedure)
    return (result.recordset ?? []) as T[]
}

async function executeRowsOn<T>(request: sql.Request, procedure: string, inputs: Record<string, unknown>): Promise<T[]> {
    for (const [name, value] of Object.entries(inputs)) request.input(name, value)
    const result = await request.execute(procedure)
    return (result.recordset ?? []) as T[]
}

function slugFor(title: string): string {
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160) || randomUUID()
}

async function writeImage(input: UploadImageInput): Promise<{ relativePath: string, fullPath: string, fileName: string, fileUuid: string, fileExtension: string, year: number, month: number, day: number }> {
    if (!input.buffer.length || input.buffer.length > MAX_IMAGE_SIZE) throw new Error('Image exceeds the upload limit')
    const extension = extensionFor(input.fileName, input.mimeType)
    const now = new Date()
    const fileUuid = randomUUID()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1
    const day = now.getUTCDate()
    const relativePath = `${IMAGE_ROOT}/${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${fileUuid}.${extension}`
    const fullPath = path.resolve(STORAGE_ROOT, safeRelativePath(relativePath))
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, input.buffer, { flag: 'wx' })
    return { relativePath, fullPath, fileName: path.basename(relativePath), fileUuid, fileExtension: `.${extension}`, year, month, day }
}

async function cleanupFiles(paths: string[]): Promise<void> {
    await Promise.all(paths.map(async fullPath => {
        try { await fs.unlink(fullPath) } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
    }))
}

export default class SanchezRestoreService {
    static async listProjects(): Promise<PortfolioProject[]> {
        const rows = await executeRows<Record<string, unknown>>('beep.sanchez_restore_project_list', {})
        return Promise.all(rows.map(async row => {
            const project = mapProject(row)
            project.images = await this.listImages(project.id)
            return project
        }))
    }

    static async getProject(id: string): Promise<PortfolioProject | null> {
        const rows = await executeRows<Record<string, unknown>>('beep.sanchez_restore_project_get', { projectId: id })
        if (!rows[0]) return null
        const project = mapProject(rows[0])
        project.images = await this.listImages(project.id)
        return project
    }

    static async createProject(input: CreateProjectInput): Promise<PortfolioProject> {
        const pool = await beepPool()
        const transaction = new sql.Transaction(pool)
        const writtenFiles: string[] = []
        try {
            await transaction.begin()
            const rows = await executeRowsOn<Record<string, unknown>>(new sql.Request(transaction), 'beep.sanchez_restore_project_create', { slug: slugFor(input.title), title: input.title, category: input.category, description: input.description ?? '' })
            if (!rows[0]) throw new Error('Project was not created')
            const project = mapProject(rows[0])
            for (const [index, imageInput] of input.images.entries()) {
                imageInput.title = input.title
                const file = await writeImage(imageInput)
                writtenFiles.push(file.fullPath)
                await executeRowsOn(new sql.Request(transaction), 'beep.sanchez_restore_image_create', { projectId: project.id, title: imageInput.title, storageRoot: IMAGE_STORAGE_ROOT, relativePath: file.relativePath, fileName: file.fileName, fileUuid: file.fileUuid, fileExtension: file.fileExtension, fileYear: file.year, fileMonth: file.month, fileDay: file.day, mimeType: imageInput.mimeType, fileSize: imageInput.buffer.length, sortOrder: imageInput.sortOrder ?? index })
            }
            await transaction.commit()
            project.images = await this.listImages(project.id)
            return project
        } catch (error) {
            await transaction.rollback().catch(() => undefined)
            await cleanupFiles(writtenFiles)
            throw error
        }
    }

    static async updateProject(id: string, input: UpdateProjectInput): Promise<PortfolioProject | null> {
        const pool = await beepPool()
        const transaction = new sql.Transaction(pool)
        const writtenFiles: string[] = []
        try {
            await transaction.begin()
            const rows = await executeRowsOn<Record<string, unknown>>(new sql.Request(transaction), 'beep.sanchez_restore_project_update', { projectId: id, title: input.title ?? null, category: input.category ?? null, description: input.description ?? null })
            if (!rows[0]) { await transaction.rollback(); return null }
            const project = mapProject(rows[0])
            for (const imageId of input.removedImageIds) {
                await executeRowsOn(new sql.Request(transaction), 'beep.sanchez_restore_image_delete', { imageId })
            }
            for (const [index, imageInput] of input.images.entries()) {
                imageInput.title = input.title ?? project.title
                const file = await writeImage(imageInput)
                writtenFiles.push(file.fullPath)
                await executeRowsOn(new sql.Request(transaction), 'beep.sanchez_restore_image_create', { projectId: id, title: imageInput.title, storageRoot: IMAGE_STORAGE_ROOT, relativePath: file.relativePath, fileName: file.fileName, fileUuid: file.fileUuid, fileExtension: file.fileExtension, fileYear: file.year, fileMonth: file.month, fileDay: file.day, mimeType: imageInput.mimeType, fileSize: imageInput.buffer.length, sortOrder: imageInput.sortOrder ?? index })
            }
            await transaction.commit()
            project.images = await this.listImages(id)
            return project
        } catch (error) {
            await transaction.rollback().catch(() => undefined)
            await cleanupFiles(writtenFiles)
            throw error
        }
    }

    static async deleteProject(id: string): Promise<boolean> {
        const rows = await executeRows<{ deleted: boolean }>('beep.sanchez_restore_project_delete', { projectId: id })
        return Boolean(rows[0]?.deleted)
    }

    static async listImages(projectId: string): Promise<PortfolioImage[]> {
        const rows = await executeRows<Record<string, unknown>>('beep.sanchez_restore_image_list', { projectId })
        return rows.map(mapImage)
    }

    static async getImage(id: string): Promise<{ image: PortfolioImage, fullPath: string } | null> {
        const rows = await executeRows<Record<string, unknown>>('beep.sanchez_restore_image_get', { imageId: id })
        if (!rows[0]) return null
        const image = mapImage(rows[0])
        return { image, fullPath: path.resolve(STORAGE_ROOT, safeRelativePath(image.relativePath)) }
    }

    static async createImage(input: UploadImageInput): Promise<PortfolioImage> {
        const file = await writeImage(input)
        try {
            const rows = await executeRows<Record<string, unknown>>('beep.sanchez_restore_image_create', {
                projectId: input.projectId,
                title: input.title ?? 'Portfolio image',
                storageRoot: IMAGE_STORAGE_ROOT,
                relativePath: file.relativePath,
                fileName: file.fileName,
                fileUuid: file.fileUuid,
                fileExtension: file.fileExtension,
                fileYear: file.year,
                fileMonth: file.month,
                fileDay: file.day,
                mimeType: input.mimeType,
                fileSize: input.buffer.length,
                sortOrder: input.sortOrder ?? 0
            })
            if (!rows[0]) throw new Error('Image metadata was not created')
            return mapImage(rows[0])
        } catch (error) {
            await fs.unlink(file.fullPath)
            throw error
        }
    }

    static async deleteImage(id: string): Promise<boolean> {
        const image = await this.getImage(id)
        if (!image) return false
        const rows = await executeRows<{ deleted: boolean }>('beep.sanchez_restore_image_delete', { imageId: id })
        return Boolean(rows[0]?.deleted)
    }
}