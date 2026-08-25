import DocumentsService from '../services/documents'

export default class DocumentsController {

    static async create(relativePath: string, content: string) {
        return DocumentsService.create(relativePath, content)
    }

    static async read(relativePath: string) {
        return DocumentsService.read(relativePath)
    }

    static async update(relativePath: string, content: string) {
        return DocumentsService.update(relativePath, content)
    }

    static async delete(relativePath: string) {
        return DocumentsService.delete(relativePath)
    }

}
