# mc-civilization-program-ai-bot

A Discord bot for the Minecraft Civilization program, powered by Google's Gemini AI.

## Features

- 🤖 AI-powered responses using Google Gemini
- 📅 Event schedule and information management
- 🔄 Hot-reloadable event data
- 💬 Pre-answered FAQs for common questions
- 🛡️ Profanity filtering
- 🔑 API key rotation for rate limit handling
- 📝 Caching for repeated queries

## Prerequisites

- Node.js (v18 or higher)
- Discord Bot Token
- Google Gemini API Key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/birajrai/mc-civilization-program-ai-bot.git
cd mc-civilization-program-ai-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `example.env`:
```bash
cp example.env .env
```

4. Configure your `.env` file with your credentials:
```env
DISCORD_TOKEN=your_discord_bot_token
GEMINI_API_KEY=your_gemini_api_key
EVENT_CHANNEL_ID=your_event_channel_id
```

## Usage

Start the bot:
```bash
npm start
```

For production:
```bash
npm run prod
```

## Project Structure

```
mc-civilization-program-ai-bot/
├── src/
│   ├── index.js        # Main bot file
│   ├── eventData.js    # Event configuration data
│   └── preAnswers.js   # Pre-defined answers for FAQs
├── package.json
└── README.md
```

## Configuration

### Event Data

Edit `src/eventData.js` to update event days and rules. The bot supports hot-reloading of event data without restart.

### Environment Variables

- `DISCORD_TOKEN`: Your Discord bot token
- `GEMINI_API_KEY`: Single Gemini API key
- `GEMINI_API_KEYS`: Multiple API keys (comma-separated) for rotation
- `EVENT_CHANNEL_ID`: Channel ID where the bot should respond

## License

MIT License - see LICENSE file for details

## Author

Biraj Rai

