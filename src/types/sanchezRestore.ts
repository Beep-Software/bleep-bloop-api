export interface PortfolioProject {
    id: string
    slug: string
    title: string
    category: string
    description: string | null
    createdAt: string
    updatedAt: string
    images: PortfolioImage[]
}

export interface PortfolioImage {
    id: string
    projectId: string
    relativePath: string
    fileName: string
    mimeType: string
    fileSize: number
    sortOrder: number
    createdAt: string
    url: string
}

export interface CreateProjectInput {
    title: string
    category: string
    description?: string | null
    images: UploadImageInput[]
}

export interface UpdateProjectInput {
    title?: string
    category?: string
    description?: string | null
    images: UploadImageInput[]
    removedImageIds: string[]
}

export interface UploadImageInput {
    projectId: string
    title?: string
    fileName: string
    mimeType: string
    buffer: Buffer
    sortOrder?: number
}