# Voxa Business

A multilingual AI receptionist and booking SaaS for salons and service businesses in Pakistan.

## What is included

- Secure business-owner registration and sign-in
- PostgreSQL multi-tenant data model
- Services and PKR pricing management
- Customer booking pipeline with status tracking
- English and Urdu/Roman Urdu voice demo
- OpenAI response fallback and Twilio voice webhooks
- Starter and Pro subscription request flow
- Easypaisa/JazzCash payment verification requests
- Responsive dashboard and guided customer demo
- Rate limiting, secure cookies, password hashing and production headers

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000/dashboard.html`. PostgreSQL is required for live accounts. The dashboard includes an explicit demo mode for interface evaluation.

## Deploy on Render

The included `render.yaml` provisions the Node service and PostgreSQL database. Add `OPENAI_API_KEY` after deployment. Render generates `JWT_SECRET` and injects `DATABASE_URL`.

## Required before selling

Connect an official Meta WhatsApp Business number, configure the owner's verified payment account, replace sample business details, and add a human escalation contact.

## Test

```bash
npm run check
npm test
```

MIT licensed.
