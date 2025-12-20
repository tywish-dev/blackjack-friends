export const SUITS = ['♠', '♥', '♣', '♦'];
export const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const createDeck = (numDecks = 6) => {
    const deck = [];
    for (let i = 0; i < numDecks; i++) {
        for (let suit of SUITS) {
            for (let value of VALUES) {
                let weight = parseInt(value);
                if (value === 'A') weight = 11;
                if (['J', 'Q', 'K'].includes(value)) weight = 10;
                deck.push({ suit, value, weight });
            }
        }
    }
    return deck;
};

export const shuffleDeck = (deck) => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};

export const calculateScore = (hand) => {
    let score = 0;
    let aces = 0;

    for (let card of hand) {
        score += card.weight;
        if (card.value === 'A') aces += 1;
    }

    while (score > 21 && aces > 0) {
        score -= 10;
        aces -= 1;
    }

    return score;
};
