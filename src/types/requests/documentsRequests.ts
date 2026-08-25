import { RequestGenericInterface } from "fastify"

export interface DocumentParams {
    '*': string
}

export interface DocumentBody {
    content: string
}

export interface CreateDocumentRequest extends RequestGenericInterface {
    Params: DocumentParams
    Body: DocumentBody
}

export interface ReadDocumentRequest extends RequestGenericInterface {
    Params: DocumentParams
}

export interface UpdateDocumentRequest extends RequestGenericInterface {
    Params: DocumentParams
    Body: DocumentBody
}

export interface DeleteDocumentRequest extends RequestGenericInterface {
    Params: DocumentParams
}
