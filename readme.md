# BleepBloopAPI

API for Bleep Bloop.

## Test Email Route

Use this route to send a test email through Nodemailer and Gmail.

### 1) Set environment variables

PowerShell:

```powershell
$env:GMAIL_USER="your-gmail-address@gmail.com"
$env:GMAIL_APP_PASSWORD="your-16-char-app-password"
$env:MAIL_FROM="your-gmail-address@gmail.com"
```

Git Bash:

```bash
export GMAIL_USER="your-gmail-address@gmail.com"
export GMAIL_APP_PASSWORD="your-16-char-app-password"
export MAIL_FROM="your-gmail-address@gmail.com"
```

### 2) Start the API

```bash
npm run start-dev
```

### 3) Send a test email to bowen61496@gmail.com

```bash
curl -X POST "http://localhost:3000/api/email/test" \
	-H "Content-Type: application/json" \
	-d '{
		"to": "bowen61496@gmail.com",
		"subject": "Bleep Bloop API test email",
		"text": "Hello Bowen, this is a Nodemailer test from bleep-bloop-api."
	}'
```

Expected successful response includes `success: true` and a `messageId`.

## Test Documents Route

Use these routes to create and read a file through the file storage service.

### Create a file (content must be base64-encoded)

```bash
curl -X POST "http://localhost:3000/api/documents/test/hello.txt" \
	-H "Content-Type: application/json" \
	-d "{\"content\": \"$(echo -n 'Hello from bleep-bloop-api' | base64)\"}"
```

### Read the file back

```bash
curl "http://localhost:3000/api/documents/test/hello.txt"
```

Expected successful response includes `success: true` and a base64 `content` field.

This is a test