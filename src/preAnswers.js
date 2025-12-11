export function getPreAnswers(eventData = {}) {
  const days = eventData.days || {};
  const rules = eventData.rules || [];
  const ruleList = rules.length ? rules.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'Rules will be announced soon.';

  return [
    {
      patterns: [/when.*event.*start/i, /start time/i, /kab.*shuru/i, /shuru kab/i, /kahile.*suru/i],
      answer: 'I do not know when the event starts yet, but I will share it once it is announced.'
    },
    {
      patterns: [/what is (this )?event/i, /tell me about the event/i, /minecraft civilization/i],
      answer: 'This is a multi-day Minecraft Civilization program with phases for settling, diplomacy, battle, and trading.'
    },
    {
      patterns: [/day\s*1\b/i, /\bfirst day\b/i, /\bday one\b/i],
      answer: `Day 1: ${days['1'] || 'Details coming soon.'}`
    },
    {
      patterns: [/day\s*2\b/i, /\bsecond day\b/i, /\bday two\b/i],
      answer: `Day 2: ${days['2'] || 'Details coming soon.'}`
    },
    {
      patterns: [/day\s*3\b/i, /\bthird day\b/i, /\bday three\b/i, /battle day/i, /pvp day/i],
      answer: `Day 3: ${days['3'] || 'Details coming soon.'} (PvP enabled).`
    },
    {
      patterns: [/day\s*4\b/i, /\bfourth day\b/i, /\bday four\b/i, /trade day/i],
      answer: `Day 4: ${days['4'] || 'Details coming soon.'}`
    },
    {
      patterns: [/rules?/i, /what.*allowed/i, /what.*not allowed/i],
      answer: `Rules:\n${ruleList}`
    },
    {
      patterns: [/pvp.*when/i, /when.*pvp/i, /pvp enabled/i],
      answer: 'PvP is planned for Battle Day (Day 3).'
    },
    {
      patterns: [/roles?/i, /assign.*role/i, /what role/i],
      answer: 'Roles are assigned during Day 2 to organize teams and responsibilities.'
    },
    {
      patterns: [/how.*join/i, /can i join/i, /participate/i],
      answer: 'Join details will be posted in the event channel. Please wait for the announcement and follow the instructions there.'
    },
    {
      patterns: [/server.*ip/i, /server address/i, /ip address/i],
      answer: 'The server IP will be shared privately with participants closer to the start.'
    },
    {
      patterns: [/version/i, /java or bedrock/i],
      answer: 'The server version and platform details will be announced with the server info.'
    },
    {
      patterns: [/voice/i, /\bvc\b/i, /discord call/i],
      answer: 'Use the event Discord voice channels as instructed by the staff for coordination.'
    },
    {
      patterns: [/timezone/i, /time zone/i],
      answer: 'Event times will be announced with timezone details so everyone can sync up.'
    },
    {
      patterns: [/end time/i, /when.*end/i, /how long/i, /duration/i],
      answer: 'The event duration and end time will be shared along with the start schedule.'
    }
  ];
}

