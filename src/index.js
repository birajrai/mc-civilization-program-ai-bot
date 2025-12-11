import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { getPreAnswers } from './preAnswers.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventDataPath = path.join(__dirname, 'eventData.js');

const CHANNEL_IDS = {
    rules: '1448585591406202880',
    schedule: '1448588040212713567',
    registration: '1448586387128455258',
    poll: '1448611140421550172',
    announcement: '1448586295323398205'
};

const LINKS = {
    scheduleMessage: 'https://discord.com/channels/1448006312553087048/1448588040212713567/1448602421537542277'
};

const isMathOrCode = (content) => {
    const lowered = content.toLowerCase();
    return /math|calculate|calculation|equation|integral|derivative|algebra|geometry|calculus|solve\s+\d|\d+\s*[+\-*/^]\s*\d+/i.test(lowered)
        || /code|program|script|algorithm|debug|bug|compile|javascript|python|java|c\+\+|c#|rust|typescript|ts|js|go\b|golang/i.test(lowered);
};

const loadEventData = async () => {
    const url = `${pathToFileURL(eventDataPath).href}?t=${Date.now()}`;
    const mod = await import(url);
    return mod.default || mod.eventData || {};
};

// Load local event memory
let eventData = await loadEventData();
let preAnswers = getPreAnswers(eventData, CHANNEL_IDS, LINKS);

// Hot reload on file change
fs.watchFile(eventDataPath, async () => {
    console.log('Event data updated!');
    eventData = await loadEventData();
    preAnswers = getPreAnswers(eventData, CHANNEL_IDS, LINKS);
});

// Initialize Gemini AI client (reads GEMINI_API_KEY from .env)
const ai = new GoogleGenAI({});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

const CHANNEL_ID = process.env.EVENT_CHANNEL_ID;
const badWords = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'piss', 'damn',
    // Hindi/Nepali bad words (still blocked, but not used elsewhere)
    'mc', 'g***u', 'chutiya', 'madarchod', 'behenchod', 'randi', 'bhenchod', 'gand',
    'kutte', 'kutta', 'launda', 'laundi', 'loda', 'lund', 'suar', 'bhainsa', 'boka',
    'saala', 'sala', 'harami', 'lattu', 'lora'
];

const findPreAnswer = (content) => {
    const lowered = content.toLowerCase();
    for (const entry of preAnswers) {
        if (entry.patterns.some((re) => re.test(lowered))) {
            return entry.answer;
        }
    }
    return null;
};

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Basic profanity filter: delete message and DM user politely
    const lowered = message.content.toLowerCase();
    const hasBadWords = badWords.some((w) => lowered.includes(w));
    if (hasBadWords) {
        try {
            await message.delete();
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
        try {
            await message.author.send('Please keep the chat respectful. Your message was removed.');
        } catch (err) {
            console.error('Failed to send DM:', err);
        }
        return;
    }

    // Ignore messages not in the event channel
    if (message.channel.id !== CHANNEL_ID) return;

    try {
        // Pre-answered FAQs to avoid AI calls
        const preAnswer = findPreAnswer(message.content);
        if (preAnswer) {
            await message.reply(preAnswer);
            return;
        }

        // Decline math/coding help
        if (isMathOrCode(message.content)) {
            await message.reply('Hey! I’m Maya. I don’t do math or coding help, but happy to chat about the event or other chill topics.');
            return;
        }

        // Send quick typing placeholder
        const pending = await message.reply('Ekxin ma msg lekhdai xu...');

        // Construct prompt with local memory
        const prompt = `
You are Maya, a friendly, chill Nepali/English (Nepglish) assistant for a Minecraft event. Born in Nepal on 12/11/2025.
Tone: polite, warm, GenZ-friendly, no rude slang. Keep it concise.
Language mix: aim ~80% English, ~20% Nepali words/phrases (no Hindi), natural blend.
Formatting: use Discord Markdown (bold labels, '-' bullets, italics for side-notes), no code blocks.
Only use the event data below; if unknown, say you don’t know yet but will update. Keep replies short, like DM with a friend.
Do NOT answer math or coding questions—politely decline if asked.
You know a lot about cooking. If asked for recipes or processes (especially Nepali food), give concise bullets for ingredients and short steps.

Event Days:
${Object.entries(eventData.days).map(([day, desc]) => `- **Day ${day}:** ${desc}`).join('\n')}

Event Rules:
${eventData.rules.map((r) => `- ${r}`).join('\n')}

Event Channels:
- Rules: <#${CHANNEL_IDS.rules}>
- Schedule: <#${CHANNEL_IDS.schedule}>
- Registration: <#${CHANNEL_IDS.registration}>
- Polls: <#${CHANNEL_IDS.poll}>
- Announcements: <#${CHANNEL_IDS.announcement}>

Schedule Message:
- ${LINKS.scheduleMessage}

User message: ${message.content}
Answer concisely, polite, Discord-styled, and ONLY based on the event/program data.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        const reply = response.text || "I can only answer about the Minecraft event/program.";
        await pending.edit(reply);

    } catch (err) {
        console.error(err);
        await message.reply("Something went wrong while connecting to Gemini AI.");
    }
});

client.login(process.env.DISCORD_TOKEN);
