export function getPreAnswers(eventData = {}) {
  const days = eventData.days || {};
  const rules = eventData.rules || [];
  const ruleList = rules.length
    ? rules.map((r) => `- ${r}`).join('\n')
    : '- Rules will be announced soon.';

  const withNepaliHint = (text) => {
    // Keep responses primarily English; ~20% chance to add a Nepali-friendly hint.
    if (Math.random() < 0.2) {
      return `${text}\n*Note: अपडेट भए तुरुन्तै यहाँ share गर्छु।*`;
    }
    return text;
  };

  return [
    {
      patterns: [/when.*event.*start/i, /start time/i, /kab.*shuru/i, /shuru kab/i, /kahile.*suru/i],
      answer: withNepaliHint('**Event Start:** Not announced yet. Will drop it here as soon as it’s out. 🙏')
    },
    {
      patterns: [/what is (this )?event/i, /tell me about the event/i, /minecraft civilization/i],
      answer: withNepaliHint('**About Event:**\n- Multi-day Minecraft Civilization vibes\n- Flow: settle → diplomacy → battle → trade\n- Stay chill, have fun ✨')
    },
    {
      patterns: [/day\s*1\b/i, /\bfirst day\b/i, /\bday one\b/i],
      answer: withNepaliHint(`**Day 1 (Peace & Settlement):**\n- ${days['1'] || 'Details coming soon.'}`)
    },
    {
      patterns: [/day\s*2\b/i, /\bsecond day\b/i, /\bday two\b/i],
      answer: withNepaliHint(`**Day 2 (Diplomacy & Expansion):**\n- ${days['2'] || 'Details coming soon.'}`)
    },
    {
      patterns: [/day\s*3\b/i, /\bthird day\b/i, /\bday three\b/i, /battle day/i, /pvp day/i],
      answer: withNepaliHint(`**Day 3 (Battle):**\n- ${days['3'] || 'Details coming soon.'}\n- PvP enabled, stay sharp!`)
    },
    {
      patterns: [/day\s*4\b/i, /\bfourth day\b/i, /\bday four\b/i, /trade day/i],
      answer: withNepaliHint(`**Day 4 (Trade & Alliance):**\n- ${days['4'] || 'Details coming soon.'}`)
    },
    {
      patterns: [/rules?/i, /what.*allowed/i, /what.*not allowed/i],
      answer: withNepaliHint(`**Rules (pls keep it clean):**\n${ruleList}`)
    },
    {
      patterns: [/pvp.*when/i, /when.*pvp/i, /pvp enabled/i],
      answer: withNepaliHint('**PvP:** Only on Battle Day (Day 3). बाकी दिन chill pls. 😌')
    },
    {
      patterns: [/roles?/i, /assign.*role/i, /what role/i],
      answer: withNepaliHint('**Roles:** Assigned on Day 2 so squads stay organized. Teamwork ftw. 🫡')
    },
    {
      patterns: [/how.*join/i, /can i join/i, /participate/i],
      answer: withNepaliHint('**Join:** Info will drop in the event channel soon. Hang tight and follow the steps once posted. 🙌')
    },
    {
      patterns: [/server.*ip/i, /server address/i, /ip address/i],
      answer: withNepaliHint('**Server IP:** Shared privately with confirmed participants closer to start time. 🔒')
    },
    {
      patterns: [/version/i, /java or bedrock/i],
      answer: withNepaliHint('**Version:** Java/Bedrock details will be announced with the server info. Sit tight. 🎮')
    },
    {
      patterns: [/voice/i, /\bvc\b/i, /discord call/i],
      answer: withNepaliHint('**Voice/VC:** Hop into event voice channels when staff says. Keep it chill. 🎙️')
    },
    {
      patterns: [/timezone/i, /time zone/i],
      answer: withNepaliHint('**Timezones:** Schedule will include TZ info so everyone can sync. Wait for the post. 🕒')
    },
    {
      patterns: [/end time/i, /when.*end/i, /how long/i, /duration/i],
      answer: withNepaliHint('**Duration/End:** Will be shared with the start schedule. We’ll keep you posted. 🗓️')
    }
  ];
}

