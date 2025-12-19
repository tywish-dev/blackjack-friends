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
    const [error, setError] = useState(null);

    useEffect(() => {
        localStorage.setItem('bj_playerId', playerId);
    }, [playerId]);

    useEffect(() => {
        if (playerName) localStorage.setItem('bj_playerName', playerName);
    }, [playerName]);

    // Sync game state
    useEffect(() => {
        if (!roomId) return;

        const gameRef = ref(db, `rooms/${roomId}`);
        const unsubscribe = onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGameState(data);
            } else {
                setError('Room not found');
            }
        });

        return () => unsubscribe();
    }, [roomId]);

    const createRoom = async (name) => {
        const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const initialGameState = {
            status: 'waiting',
            deck: shuffleDeck(createDeck()),
            players: {
                [playerId]: {
                    name: name,
                    hand: [],
                    score: 0,
                    status: 'ready',
                    isHost: true
                }
            },
            turn: null
        };

        try {
            await set(ref(db, `rooms/${newRoomId}`), initialGameState);
            setPlayerName(name);
            setRoomId(newRoomId);
            return newRoomId;
        } catch (err) {
            console.error("Firebase Error:", err);
            setError("Failed to create room. Check your Firebase config.");
        }
    };

    const joinRoom = async (code, name) => {
        const roomRef = ref(db, `rooms/${code}`);
        try {
            const snapshot = await get(roomRef);
            if (snapshot.exists()) {
                if (snapshot.val().status !== 'waiting') {
                    setError("Game already in progress");
                    return;
                }
                await update(ref(db, `rooms/${code}/players/${playerId}`), {
                    name: name,
                    hand: [],
                    score: 0,
                    status: 'ready',
                    isHost: false
                });
                setPlayerName(name);
                setRoomId(code);
            } else {
                setError('Room does not exist');
            }
        } catch (err) {
            console.error("Firebase Error:", err);
            setError("Failed to join room. Check your Firebase config.");
        }
    };

    const dealCards = async () => {
        if (!roomId || !gameState) return;

        // Logic to deal 2 cards to each player
        // This needs to be robust to concurrency, but for this simple app, host drives it.
        let currentDeck = [...gameState.deck];
        const updates = {};
        const playerIds = Object.keys(gameState.players);

        // Reset players
        playerIds.forEach(pid => {
            updates[`rooms/${roomId}/players/${pid}/hand`] = [];
            updates[`rooms/${roomId}/players/${pid}/score`] = 0;
            updates[`rooms/${roomId}/players/${pid}/status`] = 'playing';
        });

        // Deal 2 cards each
        playerIds.forEach(pid => {
            const hand = [currentDeck.pop(), currentDeck.pop()];
            updates[`rooms/${roomId}/players/${pid}/hand`] = hand;
            updates[`rooms/${roomId}/players/${pid}/score`] = calculateScore(hand);
        });

        updates[`rooms/${roomId}/deck`] = currentDeck;
        updates[`rooms/${roomId}/status`] = 'playing';
        updates[`rooms/${roomId}/turn`] = playerIds[0]; // Simple turn logic: first player joined

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
            // Auto stand logic or turn pass could go here
            // For now, let's keep it simple, if busted, you are done.
            // We should verify if we need to pass turn automatically.
        }

        await update(ref(db), updates);
    };

    const stand = async () => {
        // Find next player
        const playerIds = Object.keys(gameState.players);
        const currentIndex = playerIds.indexOf(playerId);
        const nextIndex = currentIndex + 1;

        const updates = {};
        updates[`rooms/${roomId}/players/${playerId}/status`] = 'standing';

        if (nextIndex < playerIds.length) {
            updates[`rooms/${roomId}/turn`] = playerIds[nextIndex];
        } else {
            // Dealer turn triggers (end of round)
            updates[`rooms/${roomId}/turn`] = 'dealer';
            // In this simplified version, we might just end game or let Host click "Resolve"
            updates[`rooms/${roomId}/status`] = 'finished'; // Or dealer_turn
        }

        await update(ref(db), updates);
    };

    return {
        roomId,
        playerId,
        playerName,
        gameState,
        createRoom,
        joinRoom,
        dealCards,
        hit,
        stand,
        error
    };
};
