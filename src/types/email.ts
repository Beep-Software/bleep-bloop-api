export interface EmailMessage {
    from: string
    to: string
    subject: string
    text: string
}

export interface LogEmailInput {
    recipient: string
    sender: string
    subject?: string
    body?: string
    status: 'SUCCESS' | 'FAILURE'
    messageId?: string | null
    accepted?: string | null
    rejected?: string | null
    errorMessage?: string | null
}

export interface EmailLogEntry {
    id: string
    recipient: string
    sender: string
    subject: string | null
    body: string | null
    status: 'SUCCESS' | 'FAILURE'
    messageId: string | null
    accepted: string | null
    rejected: string | null
    errorMessage: string | null
    createdAt: string
}

export interface CreateEmailRequest {
    to?: string
    subject?: string
    body?: string
}
