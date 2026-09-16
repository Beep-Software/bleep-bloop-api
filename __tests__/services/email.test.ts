import EmailService from '../../src/services/email'
import * as db from '../../src/db'
import nodemailer from 'nodemailer'

jest.mock('../../src/db')
jest.mock('nodemailer')

describe('EmailService', () => {
	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('send', () => {
		it('creates transport and sends mail', async () => {
			const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-123' })
			;(nodemailer.createTransport as jest.Mock).mockReturnValue({
				sendMail: mockSendMail
			})

			const result = await EmailService.send(
				{
					from: 'sender@example.com',
					to: 'recipient@example.com',
					subject: 'Test Subject',
					text: 'Test Body'
				},
				'sender@example.com',
				'password123'
			)

			expect(nodemailer.createTransport).toHaveBeenCalledWith({
				service: 'gmail',
				auth: {
					user: 'sender@example.com',
					pass: 'password123'
				}
			})
			expect(mockSendMail).toHaveBeenCalledWith({
				from: 'sender@example.com',
				to: 'recipient@example.com',
				subject: 'Test Subject',
				text: 'Test Body'
			})
			expect(result).toEqual({ messageId: 'msg-123' })
		})
	})

	describe('logEmail', () => {
		it('executes beep.email_log_create with correct inputs and maps the result', async () => {
			const inputMock = jest.fn().mockReturnThis()
			const executeMock = jest.fn().mockResolvedValue({
				recordset: [
					{
						id: 'uuid-1',
						recipient: 'recipient@example.com',
						sender: 'sender@example.com',
						subject: 'Test Subject',
						body: 'Test Body',
						status: 'SUCCESS',
						messageId: 'msg-123',
						accepted: '["recipient@example.com"]',
						rejected: null,
						errorMessage: null,
						createdAt: '2026-09-15T00:00:00.000Z'
					}
				]
			})

			const mockRequest = {
				input: inputMock,
				execute: executeMock
			}

			const mockPool = {
				request: jest.fn().mockReturnValue(mockRequest)
			}

			jest.spyOn(db, 'emailPool').mockResolvedValue(mockPool as any)

			const result = await EmailService.logEmail({
				recipient: 'recipient@example.com',
				sender: 'sender@example.com',
				subject: 'Test Subject',
				body: 'Test Body',
				status: 'SUCCESS',
				messageId: 'msg-123',
				accepted: '["recipient@example.com"]'
			})

			expect(db.emailPool).toHaveBeenCalled()
			expect(inputMock).toHaveBeenCalledWith('recipient', 'recipient@example.com')
			expect(inputMock).toHaveBeenCalledWith('sender', 'sender@example.com')
			expect(inputMock).toHaveBeenCalledWith('subject', 'Test Subject')
			expect(inputMock).toHaveBeenCalledWith('body', 'Test Body')
			expect(inputMock).toHaveBeenCalledWith('status', 'SUCCESS')
			expect(inputMock).toHaveBeenCalledWith('messageId', 'msg-123')
			expect(inputMock).toHaveBeenCalledWith('accepted', '["recipient@example.com"]')
			expect(inputMock).toHaveBeenCalledWith('rejected', null)
			expect(inputMock).toHaveBeenCalledWith('errorMessage', null)
			expect(executeMock).toHaveBeenCalledWith('beep.email_log_create')

			expect(result).toEqual({
				id: 'uuid-1',
				recipient: 'recipient@example.com',
				sender: 'sender@example.com',
				subject: 'Test Subject',
				body: 'Test Body',
				status: 'SUCCESS',
				messageId: 'msg-123',
				accepted: '["recipient@example.com"]',
				rejected: null,
				errorMessage: null,
				createdAt: new Date('2026-09-15T00:00:00.000Z').toISOString()
			})
		})
	})
})
