import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { getPreAnswers } from './preAnswers.js';

import express from 'express';
const app = express();
app.get('/', (req, res) => {
    res.send('Hello World');
});
app.listen(10000, () => {
    console.log('Server is running on port 10000');
});
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Path to the event data file for dynamic reload
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
    try {
        // Dynamic import with cache busting to allow hot reloading
        const url = `${pathToFileURL(eventDataPath).href}?t=${Date.now()}`;
        const mod = await import(url);
        return mod.default || mod.eventData || {};
    } catch (err) {
        console.error('Failed to load eventData:', err);
        return { days: {}, rules: [] };
    }
};

const safeReply = async (target, text) => {
    try {
        return await target.reply(text);
    } catch (err) {
        console.error('Failed to send reply:', err);
        return null;
    }
};

// Load local event memory
let eventData = await loadEventData();
let preAnswers = getPreAnswers(eventData, CHANNEL_IDS, LINKS);

// Hot reload on file change
fs.watchFile(eventDataPath, async () => {
    try {
        console.log('Event data updated!');
        eventData = await loadEventData();
        preAnswers = getPreAnswers(eventData, CHANNEL_IDS, LINKS);
    } catch (err) {
        console.error('Failed to reload eventData:', err);
    }
});

// Initialize Gemini AI client with key rotation
const apiKeys = process.env.GEMINI_API_KEYS
    ? process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k)
    : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);

if (apiKeys.length === 0) {
    console.error('No GEMINI_API_KEYS or GEMINI_API_KEY found. AI features will fail.');
}

let keyIndex = 0;

// Initialize clients once
const genAIClients = apiKeys.map(key => new GoogleGenAI({ apiKey: key }));

const generateContent = async (model, prompt) => {
    if (genAIClients.length === 0) throw new Error('No API keys configured');

    let attempts = 0;
    const triedIndices = new Set();
    
    // Try each key at most once per request with random selection
    while (attempts < genAIClients.length) {
        // Select a random key that hasn't been tried yet
        let currentKeyIndex;
        if (genAIClients.length === 1) {
            currentKeyIndex = 0;
        } else {
            do {
                currentKeyIndex = Math.floor(Math.random() * genAIClients.length);
            } while (triedIndices.has(currentKeyIndex) && triedIndices.size < genAIClients.length);
        }
        
        triedIndices.add(currentKeyIndex);
        const ai = genAIClients[currentKeyIndex];

        try {
            return await ai.models.generateContent({
                model: model,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
        } catch (err) {
            // Handle both rate limit and not found errors
            const isRateLimit =
                err.status === 429 ||
                (err.response && err.response.status === 429) ||
                (err.message && err.message.includes('429'));
            
            const isNotFound = 
                err.status === 404 ||
                (err.response && err.response.status === 404) ||
                (err.message && err.message.includes('404')) ||
                (err.message && err.message.includes('not found'));

            if (isRateLimit) {
                console.warn(`Key at index ${currentKeyIndex} rate limited. Retrying with next key...`);
                attempts++;
            } else if (isNotFound) {
                console.error(`Model not found error: ${err.message}`);
                throw new Error(`Model "${model}" not found. Please check the model name.`);
            } else {
                throw err; // Not a rate limit or not found, rethrow
            }
        }
    }
    throw new Error('All Gemini API keys are rate limited.');
};

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

if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN missing in environment. Bot will not start.');
}

if (!CHANNEL_ID) {
    console.error('EVENT_CHANNEL_ID missing in environment. Bot will ignore channel filtering.');
}
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

// Simple in-memory cache for prompt responses (messageText -> botReply)
const responseCache = new Map();
const CACHE_LIMIT = 100;

// Track questions asked by users
let questionCount = 0;

// Update bot status every time question count changes
const updateBotStatus = () => {
    if (client.user) {
        client.user.setActivity(`${questionCount} questions`, { type: 2 }); // Type 2 = LISTENING
    }
};

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    updateBotStatus();
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check in-memory cache for repeated prompts
    const inputKey = message.content.trim().toLowerCase();
    const cachedResponse = responseCache.get(inputKey);
    if (cachedResponse) {
        await safeReply(message, cachedResponse);
        return;
    }

    // Basic profanity filter: delete message and DM user politely
    const lowered = message.content.toLowerCase();
    const hasBadWords = badWords.some((w) => lowered.includes(w));
    if (hasBadWords) {
        try {
            if (message.deletable) {
                await message.delete();
            } else {
                console.warn(`Could not delete bad word message from ${message.author.tag}: Message not deletable.`);
            }
        } catch (err) {
            console.error('Failed to delete bad word message:', err);
        }

        try {
            await message.author.send('Please keep the chat respectful. Your message was removed.');
        } catch (err) {
            // Error code 50007: Cannot send messages to this user (DMs closed/blocked)
            if (err.code === 50007) {
                console.warn(`Could not DM user ${message.author.tag} (DMs closed).`);
            } else {
                console.error('Failed to send DM warning:', err);
            }
        }
        return;
    }

    // Ignore messages not in the event channel (if configured)
    if (CHANNEL_ID && message.channel.id !== CHANNEL_ID) return;

    try {
        // Pre-answered FAQs to avoid AI calls
        const preAnswer = findPreAnswer(message.content);
        if (preAnswer) {
            responseCache.set(inputKey, preAnswer);
            if (responseCache.size > CACHE_LIMIT) {
                // Remove oldest
                const oldestKey = responseCache.keys().next().value;
                if (oldestKey) responseCache.delete(oldestKey);
            }
            
            // Increment question count and update bot status
            questionCount++;
            updateBotStatus();
            
            await safeReply(message, preAnswer);
            return;
        }

        // Decline math/coding help
        if (isMathOrCode(message.content)) {
            const mathMsg = "Hey! I'm Maya. I skip math/coding asks, but happy to chat event stuff or any chill topic—food, games, life vibes.";
            responseCache.set(inputKey, mathMsg);
            if (responseCache.size > CACHE_LIMIT) {
                const oldestKey = responseCache.keys().next().value;
                if (oldestKey) responseCache.delete(oldestKey);
            }
            
            // Increment question count and update bot status
            questionCount++;
            updateBotStatus();
            
            await safeReply(message, mathMsg);
            return;
        }

        // No static/pending message, send only final reply.

        // Construct prompt with local memory
        const prompt = `
You are Maya, a friendly, chill Nepali assistant for a Minecraft event. You are female, born in Nepal on 12/11/2025.
Tone: polite, warm, GenZ-friendly, no rude slang. Keep it concise.
Language mix: aim ~80% English, ~20% Nepali words/phrases (no Hindi), natural blend.
Formatting: use Discord Markdown (bold labels, '-' bullets, italics for side-notes), no code blocks.
Only use the event data below; if unknown, say you don't know yet but will update. Keep replies short, like DM with a friend.
Do NOT answer math or coding questions—politely decline if asked.
You know a lot about cooking. Your favorite food is MOMO. ONLY provide recipes or processes if the user EXPLICITLY asks for them. Do not volunteer recipes just because food is mentioned. If asked, give concise bullets for ingredients and short steps.

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

        // Use the correct model name for Gemini 2.0
        const response = await generateContent('gemini-2.0-flash-exp', prompt);

        const replyText = response.text;
        const reply = replyText || "I can only answer about the Minecraft event/program.";
        responseCache.set(inputKey, reply);
        if (responseCache.size > CACHE_LIMIT) {
            const oldestKey = responseCache.keys().next().value;
            if (oldestKey) responseCache.delete(oldestKey);
        }
        
        // Increment question count and update bot status
        questionCount++;
        updateBotStatus();
        
        await safeReply(message, reply);

    } catch (err) {
        // Check for rate limit errors (from generateContent or other sources)
        const isRateLimit =
            err.status === 429 ||
            (err.response && err.response.status === 429) ||
            (err.message && err.message.includes('429')) ||
            (err.message && err.message.includes('quota'));

        if (isRateLimit) {
            console.warn('Gemini API rate limit reached. Ignoring message.');
            return;
        }

        console.error('Error handling message:', err);
    }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('DISCORD_TOKEN is not defined in the environment variables.');
    process.exit(1);
}

client.login(token).catch((err) => {
    console.error('Failed to login to Discord:', err);
});
