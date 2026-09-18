# Voxa — AI Voice Bot

A production-ready starter for cafés, restaurants, real-estate agents and small businesses. The browser demo works without an API key; OpenAI and Twilio can be connected later for real phone calls.

## Highlights

- Voice and text conversations with English and Urdu/Roman Urdu modes
- Three switchable business profiles with grounded answers
- Free local response engine with automatic OpenAI fallback
- Twilio incoming-call webhooks and speech gathering
- Conversation analytics, intent detection and transcript export
- Responsive PWA-style interface, Docker support and automated tests
- GitHub Pages demo plus Render/Railway-ready Node server

## Quick start

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

## Connect OpenAI

Add `OPENAI_API_KEY` to `.env`. Never place keys in frontend code or commit `.env`.

## Connect Twilio

1. Deploy the Node server to a public HTTPS URL.
2. Set the Twilio phone number voice webhook to `POST https://YOUR-DOMAIN/api/twilio/voice`.
3. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_PHONE_NUMBER` to the host environment.
4. Replace the sample business facts in `src/businesses.js` with verified information.

## Production checklist

- Add consent and call-recording notices required in your country.
- Validate Twilio signatures and rate-limit public endpoints.
- Use a database/CRM for bookings instead of treating a spoken request as confirmed.
- Test Urdu voice availability with your selected speech provider.
- Add monitoring and a human escalation number.

## Test

```bash
npm run check
npm test
```

## License

MIT
