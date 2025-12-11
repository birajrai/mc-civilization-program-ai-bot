export interface EventData {
    days: Record<string, string>;
    rules: string[];
}

const eventData: EventData = {
    days: {
        "1": "Peace & Settlement – 8h: Build bases, gather resources, assign roles. PvP OFF.",
        "2": "Diplomacy & Expansion – 8h: Explore, trade, form alliances. PvP OFF.",
        "3": "War & Skirmishes – 6h: PvP ON. Raid/defend territories.",
        "4": "Final Battle – 6h: Merge everyone to central server for the showdown."
    },
    rules: [
        "No griefing or toxicity",
        "PvP only on Day 3 (War & Skirmishes) and Day 4 (Final Battle)",
        "Follow assigned roles and staff directions",
        "Respect other players and keep comms clean"
    ]
};

export default eventData;
