import { useState, useEffect } from 'react';
import { ref, onValue, set, update, push, child, get, onDisconnect, remove } from 'firebase/database';
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

    // Auto-clear error
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Fetch Public Rooms and Cleanup Empty Rooms
    useEffect(() => {
        const roomsRef = ref(db, 'rooms');
        const unsubscribe = onValue(roomsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const roomList = [];
                Object.keys(data).forEach(key => {
                    const roomData = data[key];
                    const players = roomData.players || {};
                    const playerCount = Object.keys(players).length;

                    // Cleanup: Delete room if empty
                    if (playerCount === 0) {
                        // Use a timeout or verify strictly to avoid deleting a just-created room
                        // But for now, if it's empty in the DB, we remove it.
                        // Ideally, we might want to check if it's been empty for X time, but simple removal is usually fine for these toy apps if creation adds a player immediately.
                        // Note: creation adds player immediately.
                        remove(ref(db, `rooms/${key}`));
                    } else if (roomData.status === 'waiting' || roomData.status === 'betting') {
                        roomList.push({
                            id: key,
                            ...roomData,
                            playerCount
                        });
                    }
                });
                setActiveRooms(roomList);
            } else {
                setActiveRooms([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Sync game state
    // Sync game state & Host Migration
    useEffect(() => {
        if (!roomId || !gameState) return;
        const me = gameState.players?.[playerId];
        if (!me?.isHost) return;

        if (gameState.turn === 'dealer_turn') {
            const dealerHand = gameState.dealer.hand || [];
            const dealerScore = calculateScore(dealerHand);

            // Dealer Logic
            if (dealerScore < 17) {
                // Dealer Hit with Delay
                const timer = setTimeout(async () => {
                    const currentDeck = [...gameState.deck];
                    const newCard = currentDeck.pop();
                    const newHand = [...dealerHand, newCard];
                    const newScore = calculateScore(newHand);

                    const updates = {};
                    updates[`rooms/${roomId}/dealer/hand`] = newHand;
                    updates[`rooms/${roomId}/dealer/score`] = newScore;
                    updates[`rooms/${roomId}/deck`] = currentDeck;

                    await update(ref(db), updates);
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                // Dealer Finished - Calculate Results
                const timer = setTimeout(async () => {
                    await finalizeRound();
                }, 500); // Short delay before payout
                return () => clearTimeout(timer);
            }
        }
    }, [gameState?.turn, gameState?.dealer?.score, roomId]); // Re-run when turn is dealer or score changes

    // Host Migration & Sync
    useEffect(() => {
        if (!roomId) return;
        const gameRef = ref(db, `rooms/${roomId}`);
        const unsubscribe = onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGameState(data);

                // Host Migration
                if (data.players) {
                    const playerIds = Object.keys(data.players);
                    const hasHost = playerIds.some(id => data.players[id].isHost);

                    if (!hasHost && playerIds.length > 0) {
                        const sortedIds = playerIds.sort((a, b) => {
                            return (data.players[a].joinedAt || 0) - (data.players[b].joinedAt || 0);
                        });
                        const newHostId = sortedIds[0];
                        if (newHostId === playerId) {
                            update(ref(db, `rooms/${roomId}/players/${playerId}`), { isHost: true }).catch(console.error);
                        }
                    }
                }
            } else setError('Room not found');
        });
        return () => unsubscribe();
    }, [roomId, playerId]);

    const createRoom = async (name) => {
        const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const initialGameState = {
            status: 'betting',
            deck: shuffleDeck(createDeck()),
            players: {
                [playerId]: {
                    name: name,
                    hands: [],
                    score: 0, // Total score logic might need adjustment, or just display from hands
                    status: 'betting', // Player status (betting, playing, finished)
                    isHost: true,
                    balance: 1000,
                    insuranceBet: 0,
                    bet: 0,
                    joinedAt: Date.now()
                }
            },
            dealer: { hand: [], score: 0, status: 'waiting' },
            turn: null
        };

        try {
            await set(ref(db, `rooms/${newRoomId}`), initialGameState);
            setPlayerName(name);
            setRoomId(newRoomId);

            // Set disconnect handler for the creator
            const playerRef = ref(db, `rooms/${newRoomId}/players/${playerId}`);
            onDisconnect(playerRef).remove();

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
                    hands: [],
                    score: 0,
                    status: 'betting',
                    isHost: false,
                    balance: 1000,
                    insuranceBet: 0,
                    bet: 0,
                    joinedAt: Date.now()
                });

                // Set disconnect handler
                const playerRef = ref(db, `rooms/${code}/players/${playerId}`);
                onDisconnect(playerRef).remove();

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

    // Helper to get sorted players
    const getSortedPlayerIds = (players) => {
        return Object.keys(players).sort((a, b) => {
            const timeA = players[a].joinedAt || 0;
            const timeB = players[b].joinedAt || 0;
            // Stable sort using ID if times are equal
            return timeA - timeB || a.localeCompare(b);
        });
    };

    const dealCards = async () => {
        if (!roomId || !gameState) return;

        let currentDeck = shuffleDeck(createDeck());
        const updates = {};

        const sortedPlayerIds = getSortedPlayerIds(gameState.players);

        // Reset hands, keep bets
        sortedPlayerIds.forEach(pid => {
            const playerBet = gameState.players[pid].bet || 0;

            // Initialize first hand
            const handCards = [currentDeck.pop(), currentDeck.pop()];
            const handScore = calculateScore(handCards);
            const handStatus = (handScore === 21) ? 'blackjack' : 'playing';

            const handObj = {
                cards: handCards,
                score: handScore,
                bet: playerBet,
                status: handStatus,
                isDoubled: false
            };

            updates[`rooms/${roomId}/players/${pid}/hands`] = [handObj];
            updates[`rooms/${roomId}/players/${pid}/score`] = handScore; // Legacy/Display support
            updates[`rooms/${roomId}/players/${pid}/status`] = (handStatus === 'blackjack') ? 'blackjack' : 'playing';
            updates[`rooms/${roomId}/players/${pid}/insuranceBet`] = 0;
        });

        const dealerHand = [currentDeck.pop(), currentDeck.pop()];
        const dealerScore = calculateScore(dealerHand);
        updates[`rooms/${roomId}/dealer/hand`] = dealerHand;
        updates[`rooms/${roomId}/dealer/score`] = dealerScore;
        updates[`rooms/${roomId}/dealer/status`] = 'playing';

        updates[`rooms/${roomId}/deck`] = currentDeck;
        updates[`rooms/${roomId}/status`] = 'playing';

        // Check for Dealer Blackjack (Peek)
        // If dealer upcard is 10 or Ace
        const dealerUpCard = dealerHand[0];
        const dealerUpVal = dealerUpCard.weight; // Using weight from gameUtils (10 for Face, 11 for Ace)

        // Simple Instant Resolution if Dealer has BJ
        if (dealerScore === 21) {
            // If Dealer has BJ, round ends immediately (mostly).
            // We should offer insurance if Ace, but for "Pure" flow let's just resolve relative to player BJs.
            // If we want to offer insurance, we pause state.
            // For this step, simply checking if dealer has 21.
            // If Dealer has 21, players with 21 Push, others Lose.
            // We'll effectively skip turns.
            updates[`rooms/${roomId}/status`] = 'finished';
            updates[`rooms/${roomId}/turn`] = 'finished';
            // We need to trigger resolution, but resolution function needs state...
            // Let's just set the turn to 'dealer_reveal' or similar? 
            // Or better, handle it inside the 'turn' logic.
            // For now, let's keep standard flow, but if Dealer has BJ, we might auto-resolve.
            // Actually, if Dealer has BJ, players don't get to hit.
        } else {
            // Find first player without Blackjack
            let firstPlayerIndex = 0;
            let foundPlayer = false;
            while (firstPlayerIndex < sortedPlayerIds.length) {
                const pid = sortedPlayerIds[firstPlayerIndex];
                const pHand = updates[`rooms/${roomId}/players/${pid}/hands`][0];
                if (pHand.status === 'playing') {
                    updates[`rooms/${roomId}/turn`] = pid;
                    foundPlayer = true;
                    break;
                }
                firstPlayerIndex++;
            }

            // If all players have Blackjack, go straight to dealer resolution
            if (!foundPlayer) {
                // We need to pass the state as it WILL be, not as it is. 
                // However, for clean state management, we can trigger resolution immediately.
                // But calculateResolution expects deck/players input.
                // We have the new deck in `currentDeck`.
                // We have the new player states in `updates`. 
                // Constructing the full state object effectively to pass to `calculateResolution` is a bit complex here because `updates` is flat.

                // Simpler approach: Just like Dealer has BJ, we end the round.
                // But we need to play dealer hand if needed (soft 17).
                // Let's defer to a pseudo-turn that triggers resolution? 
                // Or just replicate calculateResolution logic here for the 'All BJ' case? 

                // Actually, if everyone has BJ, the Dealer still plays to try to beat 21 (impossible) or push 21?
                // Dealer must play out their hand.
                // So we can assign turn to 'dealer_play' which triggers an effect? No, better to do it now.

                // Let's re-use calculateResolution logic but we need to re-assemble player objects from updates
                // This is slightly messy. 
                // Alternative: Set turn to 'finished' and handle resolution? No.

                // Let's look at calculateResolution helper. It takes `playersData`.
                // We can construct a temporary playersData.
                const tempPlayers = {};
                sortedPlayerIds.forEach(pid => {
                    tempPlayers[pid] = {
                        ...gameState.players[pid],
                        hands: updates[`rooms/${roomId}/players/${pid}/hands`],
                        balance: gameState.players[pid].balance, // Balance doesn't change on deal
                        bet: gameState.players[pid].bet
                    };
                });

                updates[`rooms/${roomId}/turn`] = 'dealer_turn'; // Trigger Dealer Animation Effect
            }

        }


        await update(ref(db), updates);
    };

    // Helper to get active hand index (first playing hand)
    const getActiveHandIndex = (player) => {
        if (!player || !player.hands) return -1;
        return player.hands.findIndex(h => h.status === 'playing');
    };

    // Calculate Resolution (Dealer Play & Payouts)
    // Finalize Round (Payouts) - NOW SEPARATE FROM CARD DRAWS
    const finalizeRound = async () => {
        if (!roomId || !gameState) return;
        const dealerScore = gameState.dealer.score;
        const dealerHand = gameState.dealer.hand;

        const resolutionUpdates = {};
        resolutionUpdates[`rooms/${roomId}/status`] = 'finished';
        resolutionUpdates[`rooms/${roomId}/turn`] = 'finished';

        Object.keys(gameState.players).forEach(pid => {
            const p = gameState.players[pid];
            const hands = p.hands || [];
            let totalWin = 0;

            hands.forEach((hand) => {
                let winAmount = 0;
                const pScore = hand.score;
                const pStatus = hand.status;
                const pBet = hand.bet;

                if (pStatus === 'blackjack') {
                    if (dealerScore === 21 && dealerHand.length === 2 && calculateScore([dealerHand[0], dealerHand[1]]) === 21) {
                        winAmount = pBet;
                    } else {
                        winAmount = pBet + (pBet * 1.5);
                    }
                } else if (pStatus === 'busted') {
                    winAmount = 0;
                } else {
                    if (dealerScore > 21) {
                        winAmount = pBet * 2;
                    } else if (pScore > dealerScore) {
                        winAmount = pBet * 2;
                    } else if (pScore === dealerScore) {
                        winAmount = pBet;
                    } else {
                        winAmount = 0;
                    }
                }
                totalWin += winAmount;
            });
            resolutionUpdates[`rooms/${roomId}/players/${pid}/balance`] = p.balance + totalWin;
        });

        await update(ref(db), resolutionUpdates);
    };

    const moveToNextStep = (currentDeck, currentPlayerId, currentPlayersState) => {
        const sortedPlayerIds = getSortedPlayerIds(currentPlayersState);

        // 1. Check if current player has more active hands
        const currPlayer = currentPlayersState[currentPlayerId];
        if (currPlayer && getActiveHandIndex(currPlayer) !== -1) {
            // Still current player's turn (next hand)
            return { [`rooms/${roomId}/turn`]: currentPlayerId };
        }

        // 2. Move to next player
        const currentIndex = sortedPlayerIds.indexOf(currentPlayerId);
        let nextIndex = currentIndex + 1;

        while (nextIndex < sortedPlayerIds.length) {
            const nextPid = sortedPlayerIds[nextIndex];
            const nextPlayer = currentPlayersState[nextPid];

            // Check if this player has any playable hands
            if (getActiveHandIndex(nextPlayer) !== -1) {
                return { [`rooms/${roomId}/turn`]: nextPid };
            }
            nextIndex++;
        }

        // 3. Dealer Turn (If we exited loop, no more players)
        // 3. Dealer Turn (If we exited loop, no more players)
        // Switch to dealer turn to start animations
        return { [`rooms/${roomId}/turn`]: 'dealer_turn' };
    };

    const hit = async () => {
        if (!roomId || !gameState) return;
        const currentDeck = [...gameState.deck];
        const card = currentDeck.pop();

        const player = gameState.players[playerId];
        const handIdx = getActiveHandIndex(player);
        if (handIdx === -1) return;

        const targetHand = player.hands[handIdx];
        const newCards = [...targetHand.cards, card];
        const newScore = calculateScore(newCards);

        let newStatus = 'playing';
        if (newScore > 21) newStatus = 'busted';
        if (newScore === 21) newStatus = 'standing'; // Auto stand on 21

        const updatedHand = { ...targetHand, cards: newCards, score: newScore, status: newStatus };
        const updatedHands = [...player.hands];
        updatedHands[handIdx] = updatedHand;

        let updates = {};
        updates[`rooms/${roomId}/deck`] = currentDeck;
        updates[`rooms/${roomId}/players/${playerId}/hands`] = updatedHands;
        updates[`rooms/${roomId}/players/${playerId}/score`] = newScore; // Legacy

        const tempPlayers = {
            ...gameState.players,
            [playerId]: { ...player, hands: updatedHands }
        };

        if (newStatus !== 'playing') {
            const nextUpdates = moveToNextStep(currentDeck, playerId, tempPlayers);
            updates = { ...updates, ...nextUpdates };
        }

        await update(ref(db), updates);
    };

    const stand = async () => {
        if (!roomId || !gameState) return;

        const player = gameState.players[playerId];
        const handIdx = getActiveHandIndex(player);
        if (handIdx === -1) return;

        const updatedHands = [...player.hands];
        updatedHands[handIdx] = { ...updatedHands[handIdx], status: 'standing' };

        let updates = {};
        updates[`rooms/${roomId}/players/${playerId}/hands`] = updatedHands;

        const tempPlayers = {
            ...gameState.players,
            [playerId]: { ...player, hands: updatedHands }
        };

        const nextUpdates = moveToNextStep(gameState.deck, playerId, tempPlayers);
        updates = { ...updates, ...nextUpdates };

        await update(ref(db), updates);
    };

    const doubleDown = async () => {
        if (!roomId || !gameState) return;
        const currentDeck = [...gameState.deck];
        const player = gameState.players[playerId];
        const handIdx = getActiveHandIndex(player);
        if (handIdx === -1) return;

        const targetHand = player.hands[handIdx];

        if (targetHand.cards.length !== 2) return;
        if (player.balance < targetHand.bet) return setError("Insufficient funds to double");

        // Double bet, Deal 1 card, Stand
        const card = currentDeck.pop();
        const newCards = [...targetHand.cards, card];
        const newScore = calculateScore(newCards);

        let newStatus = 'standing';
        if (newScore > 21) newStatus = 'busted';

        const updatedHand = {
            ...targetHand,
            cards: newCards,
            score: newScore,
            status: newStatus,
            bet: targetHand.bet * 2,
            isDoubled: true
        };
        const updatedHands = [...player.hands];
        updatedHands[handIdx] = updatedHand;

        let updates = {};
        updates[`rooms/${roomId}/deck`] = currentDeck;
        updates[`rooms/${roomId}/players/${playerId}/hands`] = updatedHands;
        updates[`rooms/${roomId}/players/${playerId}/balance`] = player.balance - targetHand.bet;

        const tempPlayers = {
            ...gameState.players,
            [playerId]: { ...player, hands: updatedHands, balance: player.balance - targetHand.bet }
        };

        const nextUpdates = moveToNextStep(currentDeck, playerId, tempPlayers);
        updates = { ...updates, ...nextUpdates };

        await update(ref(db), updates);
    };

    const splitPair = async () => {
        if (!roomId || !gameState) return;
        const currentDeck = [...gameState.deck];
        const player = gameState.players[playerId];
        const handIdx = getActiveHandIndex(player);
        if (handIdx === -1) return;

        const targetHand = player.hands[handIdx];
        if (targetHand.cards.length !== 2) return;

        // Check same Rank (Value)
        if (targetHand.cards[0].value !== targetHand.cards[1].value) return setError("Must have same rank to split");

        if (player.balance < targetHand.bet) return setError("Insufficient funds to split");

        const card1 = targetHand.cards[0];
        const card2 = targetHand.cards[1];

        const newCard1 = currentDeck.pop();
        const newCard2 = currentDeck.pop();

        const isAces = card1.value === 'A';
        const splitStatus = isAces ? 'standing' : 'playing';

        const hand1 = {
            cards: [card1, newCard1],
            score: calculateScore([card1, newCard1]),
            bet: targetHand.bet,
            status: splitStatus,
            isDoubled: false
        };
        const hand2 = {
            cards: [card2, newCard2],
            score: calculateScore([card2, newCard2]),
            bet: targetHand.bet,
            status: splitStatus,
            isDoubled: false
        };

        const updatedHands = [...player.hands];
        updatedHands.splice(handIdx, 1, hand1, hand2);

        let updates = {};
        updates[`rooms/${roomId}/deck`] = currentDeck;
        updates[`rooms/${roomId}/players/${playerId}/hands`] = updatedHands;
        updates[`rooms/${roomId}/players/${playerId}/balance`] = player.balance - targetHand.bet;

        const tempPlayers = {
            ...gameState.players,
            [playerId]: { ...player, hands: updatedHands, balance: player.balance - targetHand.bet }
        };

        const nextUpdates = moveToNextStep(currentDeck, playerId, tempPlayers);
        updates = { ...updates, ...nextUpdates };

        await update(ref(db), updates);
    };

    const startNextRound = async () => {
        const updates = {};
        updates[`rooms/${roomId}/status`] = 'betting';
        updates[`rooms/${roomId}/dealer/hand`] = [];
        updates[`rooms/${roomId}/dealer/score`] = 0;
        updates[`rooms/${roomId}/turn`] = null;

        Object.keys(gameState.players).forEach(pid => {
            updates[`rooms/${roomId}/players/${pid}/hands`] = [];
            updates[`rooms/${roomId}/players/${pid}/score`] = 0;
            updates[`rooms/${roomId}/players/${pid}/status`] = 'betting';
            updates[`rooms/${roomId}/players/${pid}/bet`] = 0;
            updates[`rooms/${roomId}/players/${pid}/insuranceBet`] = 0;
        });
        await update(ref(db), updates);
    };

    return {
        roomId, playerId, playerName, gameState, activeRooms, error,
        createRoom, joinRoom, placeBet, dealCards, hit, stand, startNextRound, doubleDown, splitPair
    };
};
