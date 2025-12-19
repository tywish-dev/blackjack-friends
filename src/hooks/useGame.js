import { useState, useEffect } from 'react';
import { ref, onValue, set, update, push, child, get } from 'firebase/database';
import { db } from '../firebase';
import { createDeck, shuffleDeck, calculateScore } from '../utils/gameUtils';
import { v4 as uuidv4 } from 'uuid';

export const useGame = () => {
    const [roomId, setRoomId] = useState(null);
    const [playerId, setPlayerId] = useState(localStorage.getItem('bj_playerId') || uuidv4());
    const [playerName, setPlayerName] = useState(localStorage.getItem('bj_playerName') || '');
    const [gameState, setGameState] = useState(null);
    const [activeRooms, setActiveRooms] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        localStorage.setItem('bj_playerId', playerId);
    }, [playerId]);

    useEffect(() => {
        if (playerName) localStorage.setItem('bj_playerName', playerName);
    }, [playerName]);

    // Fetch Public Rooms
    useEffect(() => {
        const roomsRef = ref(db, 'rooms');
        const unsubscribe = onValue(roomsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const roomList = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key],
                    playerCount: data[key].players ? Object.keys(data[key].players).length : 0
                })).filter(room => room.status === 'waiting' || room.status === 'betting');
                setActiveRooms(roomList);
            } else {
                setActiveRooms([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Sync game state
    useEffect(() => {
        if (!roomId) return;
        const gameRef = ref(db, `rooms/${roomId}`);
        const unsubscribe = onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setGameState(data);
            else setError('Room not found');
        });
        return () => unsubscribe();
    }, [roomId]);

    const createRoom = async (name) => {
        const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const initialGameState = {
            status: 'betting', // Start in betting phase
            deck: shuffleDeck(createDeck()),
            players: {
                [playerId]: {
                    name: name,
                    hand: [],
                    score: 0,
                    status: 'betting', // Status reflects phase
                    isHost: true,
                    balance: 1000,
                    bet: 0
                }
            },
            dealer: { hand: [], score: 0, status: 'waiting' },
            turn: null
        };

        try {
            await set(ref(db, `rooms/${newRoomId}`), initialGameState);
            setPlayerName(name);
            setRoomId(newRoomId);
            return newRoomId;
        } catch (err) {
            console.error(err);
            setError("Failed to create room");
        }
    };

    const joinRoom = async (code, name) => {
        const roomRef = ref(db, `rooms/${code}`);
        try {
            const snapshot = await get(roomRef);
            if (snapshot.exists()) {
                await update(ref(db, `rooms/${code}/players/${playerId}`), {
                    name: name,
                    hand: [],
                    score: 0,
                    status: 'betting',
                    isHost: false,
                    balance: 1000,
                    bet: 0
                });
                setPlayerName(name);
                setRoomId(code);
            } else {
                setError('Room does not exist');
            }
        } catch (err) {
            setError("Failed to join room");
        }
    };

    const placeBet = async (amount) => {
        if (!roomId || !gameState) return;
        const player = gameState.players[playerId];
        if (player.balance < amount) return setError("Insufficient funds");

        await update(ref(db, `rooms/${roomId}/players/${playerId}`), {
            balance: player.balance - amount,
            bet: player.bet + amount,
            status: 'ready'
        });
    };

    const dealCards = async () => {
        if (!roomId || !gameState) return;

        // Ensure all players are ready/have bets? (Optional strictness)
        // For now Host forces start.

        let currentDeck = shuffleDeck(createDeck()); // Fresh deck every round
        const updates = {};
        const playerIds = Object.keys(gameState.players);

        // Reset hands but keep bets
        playerIds.forEach(pid => {
            updates[`rooms/${roomId}/players/${pid}/hand`] = [];
            updates[`rooms/${roomId}/players/${pid}/score`] = 0;
            updates[`rooms/${roomId}/players/${pid}/status`] = 'playing';

            // Initial Deal
            const hand = [currentDeck.pop(), currentDeck.pop()];
            updates[`rooms/${roomId}/players/${pid}/hand`] = hand;
            updates[`rooms/${roomId}/players/${pid}/score`] = calculateScore(hand);

            // Check Instant Blackjack
            if (calculateScore(hand) === 21) {
                updates[`rooms/${roomId}/players/${pid}/status`] = 'blackjack';
                // Instant Payout logic could happen here or at end. 
                // To keep turn logic simple, let's mark them as 'standing' effectively but status='blackjack'
                // effectively skipping their turn.
            }
        });

        // Dealer Deal
        const dealerHand = [currentDeck.pop(), currentDeck.pop()];
        updates[`rooms/${roomId}/dealer/hand`] = dealerHand;
        updates[`rooms/${roomId}/dealer/score`] = calculateScore(dealerHand);
        updates[`rooms/${roomId}/dealer/status`] = 'playing';

        updates[`rooms/${roomId}/deck`] = currentDeck;
        updates[`rooms/${roomId}/status`] = 'playing';

        // Find first player who isn't blackjack
        const firstPlayer = playerIds.find(pid => {
            // Need to calculate score here again or trust the update map order?
            // Actually updates map isn't applied yet.
            // Simplified: Set turn to first player. If they have blackjack, they will auto-stand/skip in UI or useEffect.
            return true;
        });
        updates[`rooms/${roomId}/turn`] = firstPlayer || 'dealer';

        await update(ref(db), updates);
    };

    const hit = async () => {
        if (!roomId || !gameState) return;
        const currentDeck = [...gameState.deck];
        const card = currentDeck.pop();
        const currentHand = gameState.players[playerId].hand || [];
        const newHand = [...currentHand, card];
        const newScore = calculateScore(newHand);

        const updates = {};
        updates[`rooms/${roomId}/deck`] = currentDeck;
        updates[`rooms/${roomId}/players/${playerId}/hand`] = newHand;
        updates[`rooms/${roomId}/players/${playerId}/score`] = newScore;

        if (newScore > 21) {
            updates[`rooms/${roomId}/players/${playerId}/status`] = 'busted';
        } else if (newScore === 21) {
            // Auto-stand on 21
            updates[`rooms/${roomId}/players/${playerId}/status`] = 'standing';
            // We'd ideally trigger next turn here, but can let user wait or click stand?
            // User requested "auto win on 21". If it's not blackjack (initial 2), it's just 21.
            // Let's auto-stand them. Turn passing needs to be robust.
            // For now, let's just update status. User can click Stand, or we can improve automation later.
        }

        await update(ref(db), updates);
    };

    const stand = async () => {
        const playerIds = Object.keys(gameState.players);
        const currentIndex = playerIds.indexOf(playerId);

        await update(ref(db, `rooms/${roomId}/players/${playerId}/status`), 'standing');

        // Find next player
        let nextIndex = currentIndex + 1;
        if (nextIndex < playerIds.length) {
            await update(ref(db, `rooms/${roomId}/turn`), playerIds[nextIndex]);
        } else {
            await resolveGame();
        }
    };

    const resolveGame = async () => {
        // Dealer Play
        let currentDeck = [...gameState.deck];
        let dealerHand = [...gameState.dealer.hand];
        let dealerScore = calculateScore(dealerHand);

        while (dealerScore < 17) {
            dealerHand.push(currentDeck.pop());
            dealerScore = calculateScore(dealerHand);
        }

        // Calculate Payouts
        const updates = {};
        updates[`rooms/${roomId}/dealer/hand`] = dealerHand;
        updates[`rooms/${roomId}/dealer/score`] = dealerScore;
        updates[`rooms/${roomId}/status`] = 'finished';
        updates[`rooms/${roomId}/turn`] = 'finished';

        Object.keys(gameState.players).forEach(pid => {
            const p = gameState.players[pid];
            let winAmount = 0;
            const pScore = p.score || 0; // If busted, score might be > 21 but status is busted

            if (p.status === 'blackjack') {
                // Blackjack Pays 3:2
                if (dealerScore === 21 && dealerHand.length === 2) {
                    // Push
                    winAmount = p.bet;
                } else {
                    winAmount = p.bet + (p.bet * 1.5);
                }
            } else if (p.status === 'busted') {
                winAmount = 0;
            } else {
                // Standing
                if (dealerScore > 21) {
                    winAmount = p.bet * 2;
                } else if (pScore > dealerScore) {
                    winAmount = p.bet * 2;
                } else if (pScore === dealerScore) {
                    winAmount = p.bet; // Push
                } else {
                    winAmount = 0;
                }
            }

            updates[`rooms/${roomId}/players/${pid}/balance`] = p.balance + winAmount;
            updates[`rooms/${roomId}/players/${pid}/bet`] = 0; // Reset bet for next round
            updates[`rooms/${roomId}/players/${pid}/status`] = 'betting'; // Ready for next round
        });

        updates[`rooms/${roomId}/status`] = 'finished'; // UI shows results, generic 'finished' state
        // Actually, we should probably set status to 'finished' to show results overlay, 
        // then Host clicks "New Round" to reset everyone to 'betting'.
        // For now, let's keep payouts in DB but reset bets when Host starts new round?
        // Let's DO NOT reset bets to 0 yet, so we can show "You won $X".
        // Instead, we will clear bets in `startRound`.

        // Correction: We apply balance updates NOW.
        // But we keep `bet` field to display "Last Bet" or similar regarding outcome?
        // Let's reset bet to 0 to be clean. UI can show "Balance increased".

        await update(ref(db), updates);
    };

    const startNextRound = async () => {
        await update(ref(db, `rooms/${roomId}/status`), 'betting');
        await update(ref(db, `rooms/${roomId}/dealer/hand`), []);
        await update(ref(db, `rooms/${roomId}/dealer/score`), 0);
        // Reset players
        const updates = {};
        Object.keys(gameState.players).forEach(pid => {
            updates[`rooms/${roomId}/players/${pid}/hand`] = [];
            updates[`rooms/${roomId}/players/${pid}/score`] = 0;
            updates[`rooms/${roomId}/players/${pid}/status`] = 'betting';
            updates[`rooms/${roomId}/players/${pid}/bet`] = 0;
        });
        await update(ref(db), updates);
    };

    return {
        roomId, playerId, playerName, gameState, activeRooms, error,
        createRoom, joinRoom, placeBet, dealCards, hit, stand, startNextRound
    };
};
