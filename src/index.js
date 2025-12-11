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

const loadEventData = async () => {
    const url = `${pathToFileURL(eventDataPath).href}?t=${Date.now()}`;
    const mod = await import(url);
    return mod.default || mod.eventData || {};
};

// Load local event memory
let eventData = await loadEventData();
let preAnswers = getPreAnswers(eventData);

// Hot reload on file change
fs.watchFile(eventDataPath, async () => {
    console.log('Event data updated!');
    eventData = await loadEventData();
    preAnswers = getPreAnswers(eventData);
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

        // Construct prompt with local memory
        const prompt = `
You are a helpful assistant for my Minecraft event/program.
Use ONLY the following event data to answer. Do not mention anything outside this data.

Event Days:
${Object.entries(eventData.days).map(([day, desc]) => `Day ${day}: ${desc}`).join('\n')}

Event Rules:
${eventData.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

User message: ${message.content}
Answer concisely and ONLY based on the event/program data.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        const reply = response.text || "I can only answer about the Minecraft event/program.";
        await message.reply(reply);

    } catch (err) {
        console.error(err);
        await message.reply("Something went wrong while connecting to Gemini AI.");
    }
});

client.login(process.env.DISCORD_TOKEN);
