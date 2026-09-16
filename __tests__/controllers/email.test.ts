import EmailController from '../../src/controllers/email'
import EmailService from '../../src/services/email'

describe('EmailController', () => {
	const originalEnv = process.env

	beforeEach(() => {
		jest.clearAllMocks()
		process.env = { ...originalEnv }
	})

	afterAll(() => {
		process.env = originalEnv
	})

	const mockRequest = (body: any = {}) =>
		({
			body,
			log: {
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				debug: jest.fn()
			}
		}) as any

	const mockReply = () => {
		const res: any = {}
		res.status = jest.fn().mockReturnValue(res)
		res.send = jest.fn().mockReturnValue(res)
		return res
	}

	it('returns 400 when recipient is missing', async () => {
		delete process.env.DEFAULT_EMAIL_TO
		const req = mockRequest({})
		const res = mockReply()

		await EmailController.create(req, res)

		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			error: 'Recipient email is required. Provide body.to or set DEFAULT_EMAIL_TO.'
		})
	})

	it('returns 500 and logs failure when Gmail credentials are missing', async () => {
		delete process.env.GMAIL_USER
		delete process.env.GMAIL_APP_PASSWORD
		process.env.DEFAULT_EMAIL_TO = 'default@example.com'

		const logEmailSpy = jest.spyOn(EmailService, 'logEmail').mockResolvedValue(null)
		const req = mockRequest({ to: 'recipient@example.com' })
		const res = mockReply()

		await EmailController.create(req, res)

		expect(logEmailSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				recipient: 'recipient@example.com',
				status: 'FAILURE',
				errorMessage: expect.stringContaining('Missing Gmail credentials')
			})
		)
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			error: 'Missing Gmail credentials. Set GMAIL_USER and GMAIL_APP_PASSWORD.'
		})
	})

	it('sends email and logs success to SQL database', async () => {
		process.env.GMAIL_USER = 'user@gmail.com'
		process.env.GMAIL_APP_PASSWORD = 'apppassword'
		process.env.DEFAULT_EMAIL_FROM = 'from@example.com'

		const sendSpy = jest.spyOn(EmailService, 'send').mockResolvedValue({
			messageId: 'msg-456',
			accepted: ['recipient@example.com'],
			rejected: []
		} as any)

		const logEmailSpy = jest.spyOn(EmailService, 'logEmail').mockResolvedValue({
			id: 'uuid-1',
			recipient: 'recipient@example.com',
			sender: 'from@example.com',
			subject: 'Custom Subject',
			body: 'Custom Body',
			status: 'SUCCESS',
			messageId: 'msg-456',
			accepted: '["recipient@example.com"]',
			rejected: '[]',
			errorMessage: null,
			createdAt: new Date().toISOString()
		})

		const req = mockRequest({
			to: 'recipient@example.com',
			subject: 'Custom Subject',
			body: 'Custom Body'
		})
		const res = mockReply()

		await EmailController.create(req, res)

		expect(sendSpy).toHaveBeenCalledWith(
			{
				from: 'from@example.com',
				to: 'recipient@example.com',
				subject: 'Custom Subject',
				text: 'Custom Body'
			},
			'user@gmail.com',
			'apppassword'
		)

		expect(logEmailSpy).toHaveBeenCalledWith({
			recipient: 'recipient@example.com',
			sender: 'from@example.com',
			subject: 'Custom Subject',
			body: 'Custom Body',
			status: 'SUCCESS',
			messageId: 'msg-456',
			accepted: '["recipient@example.com"]',
			rejected: '[]'
		})

		expect(res.send).toHaveBeenCalledWith({
			success: true,
			messageId: 'msg-456',
			accepted: ['recipient@example.com'],
			rejected: []
		})
	})

	it('catches send error, logs failure to SQL database, and returns 500', async () => {
		process.env.GMAIL_USER = 'user@gmail.com'
		process.env.GMAIL_APP_PASSWORD = 'apppassword'
		process.env.DEFAULT_EMAIL_FROM = 'from@example.com'

		jest.spyOn(EmailService, 'send').mockRejectedValue(new Error('SMTP connection timed out'))
		const logEmailSpy = jest.spyOn(EmailService, 'logEmail').mockResolvedValue(null)

		const req = mockRequest({
			to: 'recipient@example.com',
			subject: 'Fail Subject',
			body: 'Fail Body'
		})
		const res = mockReply()

		await EmailController.create(req, res)

		expect(logEmailSpy).toHaveBeenCalledWith({
			recipient: 'recipient@example.com',
			sender: 'from@example.com',
			subject: 'Fail Subject',
			body: 'Fail Body',
			status: 'FAILURE',
			errorMessage: 'SMTP connection timed out'
		})

		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			error: 'Failed to send test email.'
		})
	})
})
