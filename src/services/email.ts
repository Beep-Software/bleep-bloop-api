import nodemailer from 'nodemailer'
import { emailPool } from '../db'
import { EmailLogEntry, EmailMessage, LogEmailInput } from '../types/email'

export { EmailMessage, LogEmailInput, EmailLogEntry }

function mapEmailLog(row: Record<string, unknown>): EmailLogEntry {
	return {
		id: String(row.id),
		recipient: String(row.recipient),
		sender: String(row.sender),
		subject: row.subject == null ? null : String(row.subject),
		body: row.body == null ? null : String(row.body),
		status: String(row.status) as 'SUCCESS' | 'FAILURE',
		messageId: row.messageId == null && row.message_id == null ? null : String(row.messageId ?? row.message_id),
		accepted: row.accepted == null ? null : String(row.accepted),
		rejected: row.rejected == null ? null : String(row.rejected),
		errorMessage: row.errorMessage == null && row.error_message == null ? null : String(row.errorMessage ?? row.error_message),
		createdAt: new Date(String(row.createdAt ?? row.created_at)).toISOString()
	}
}

export default class EmailService {

	static async send(message: EmailMessage, gmailUser: string, gmailAppPassword: string) {
		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: gmailUser,
				pass: gmailAppPassword
			}
		})

		return transporter.sendMail(message)
	}

	static async logEmail(data: LogEmailInput): Promise<EmailLogEntry | null> {
		const pool = await emailPool()
		const request = pool.request()

		request.input('recipient', data.recipient)
		request.input('sender', data.sender)
		request.input('subject', data.subject ?? null)
		request.input('body', data.body ?? null)
		request.input('status', data.status)
		request.input('messageId', data.messageId ?? null)
		request.input('accepted', data.accepted ?? null)
		request.input('rejected', data.rejected ?? null)
		request.input('errorMessage', data.errorMessage ?? null)

		const result = await request.execute('beep.email_log_create')
		const row = result.recordset?.[0]
		return row ? mapEmailLog(row) : null
	}

}
