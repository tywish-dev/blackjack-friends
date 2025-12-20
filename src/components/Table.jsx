import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

const PlayerArea = ({ player, isCurrentTurn, isMe }) => {
    // Robust fallback for hands
    const hands = player.hands || (player.hand ? [{ cards: player.hand, score: player.score, status: player.status, bet: player.bet }] : []);

    return (
        <div className={`
      flex gap-2 p-3 rounded-xl transition-all duration-300 relative
      ${isMe ? 'bg-white/5 border border-white/10' : ''}
    `}>
            {/* Balance Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-emerald-500/50 text-emerald-400 px-3 py-1 rounded-full text-sm font-mono font-bold shadow-lg flex items-center gap-1 z-30">
                <span>$</span>
                <span>{player.balance}</span>
            </div>

            {hands.map((hand, idx) => {
                const isHandActive = isCurrentTurn && hand.status === 'playing';
                return (
                    <div key={idx} className={`relative flex flex-col items-center rounded-xl p-2 transition-all min-w-[120px]
                         ${isHandActive ? 'bg-yellow-500/10 ring-2 ring-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : ''}
                    `}>
                        {/* Hand Bet */}
                        <div className="absolute -top-3 right-0 bg-black/90 border border-yellow-500/50 text-yellow-400 px-1.5 py-0.5 rounded-lg text-xs font-mono font-bold shadow-sm z-40 transform rotate-6">
                            ${hand.bet}
                        </div>

                        <div className="relative mt-4">
                            <div className="flex -space-x-8 min-h-[120px] justify-center pt-2">
                                <AnimatePresence>
                                    {hand.cards && hand.cards.map((card, cIdx) => (
                                        <div key={`${card.suit}-${card.value}-${cIdx}`} className="transform scale-90 origin-top hover:-translate-y-4 transition-transform duration-300">
                                            <Card {...card} index={cIdx} />
                                        </div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Overlay Status */}
                            {hand.status === 'busted' && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <div className="bg-red-600/90 text-white font-bold py-1 px-3 rounded-full shadow-lg transform rotate-12 border-2 border-white animate-bounce-in text-xs">BUST</div>
                                </div>
                            )}
                            {hand.status === 'blackjack' && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <div className="bg-yellow-500/90 text-black font-black py-1 px-3 rounded-full shadow-lg transform -rotate-12 border-2 border-white animate-pulse text-xs">BJ</div>
                                </div>
                            )}
                        </div>

                        <div className="text-emerald-400 font-mono text-lg font-bold mt-1">
                            {hand.status !== 'betting' ? hand.score : '--'}
                        </div>
                    </div>
                );
            })}

            {/* Empty State Placeholder to prevent collapse */}
            {hands.length === 0 && (
                <div className="relative flex flex-col items-center rounded-xl p-2 transition-all min-w-[120px] opacity-30">
                    <div className="w-24 h-36 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/50">Ready</span>
                    </div>
                    <div className="mt-2 text-transparent font-mono text-lg font-bold">--</div>
                </div>
            )}

            <div className="absolute bottom-[-1.5rem] w-full text-center left-0">
                <div className="font-bold text-white text-sm flex items-center gap-2 justify-center truncate w-full">
                    {isMe ? <span className="text-emerald-400 font-extrabold tracking-wider">YOU</span> : player.name}
                    {isCurrentTurn && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-glow"></span>}
                </div>
            </div>
        </div>
    );
};

const Table = ({ roomId, gameState, playerId, onHit, onStand, onDeal, onReset, placeBet, startNextRound, onDouble, onSplit }) => {
    const { showNotification } = useNotification();
    const players = gameState.players || {};
    // Consistent Sorting
    const sortedPlayers = Object.keys(players)
        .sort((a, b) => {
            const timeA = players[a].joinedAt || 0;
            const timeB = players[b].joinedAt || 0;
            return timeA - timeB || a.localeCompare(b);
        })
        .map(key => ({ id: key, ...players[key] }));

    const me = players[playerId];
    const dealer = gameState.dealer || { hand: [], score: 0 };

    const isMyTurn = gameState.turn === playerId;
    const isHost = me?.isHost;
    const isPlaying = gameState.status === 'playing';
    const isFinished = gameState.status === 'finished';
    const isBetting = gameState.status === 'betting';

    // Local state for custom bet input
    const [customBet, setCustomBet] = useState(10);

    return (
        // Replaced fixed height absolute centering with flexible column layout
        <div className="w-full h-screen flex flex-col justify-between items-center py-4 bg-green-900/0 overflow-hidden relative">

            {/* 1. Dealer Area (Top) */}
            <div className="flex-none pt-4 pb-2 z-10 w-full flex justify-center">
                <div className="bg-black/30 px-6 py-4 rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col items-center gap-2 shadow-2xl transition-all hover:bg-black/40 relative">
                    <div className="text-white/30 text-[10px] font-bold tracking-[0.3em] uppercase">Computer Dealer</div>
                    <div className="flex -space-x-12 min-h-[120px]">
                        <AnimatePresence>
                            {dealer.hand && dealer.hand.map((card, idx) => {
                                // Face down logic: Index 1, not finished, and not dealer turn yet.
                                // Actually, if it's dealer turn, we might want to reveal immediately or wait for the delay.
                                // The requirement says "start of hand dealer draws card upside down... flip... others come from deck"
                                // If it's `dealer_turn`, we should flip it. 
                                // So face down if idx === 1 AND status != finished AND turn != dealer_turn
                                const isFaceDown = idx === 1 && !isFinished && gameState.turn !== 'dealer_turn';

                                return (
                                    <div key={`dealer-${idx}`} className="relative transform hover:-translate-y-2 transition-transform">
                                        <div className="transform scale-90 origin-top">
                                            <Card {...card} index={idx} isFaceDown={isFaceDown} textClass="text-sm" />
                                        </div>
                                    </div>
                                );
                            })}
                        </AnimatePresence>
                        {(!dealer.hand || dealer.hand.length === 0) && (
                            <div className="w-20 h-28 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-white/10 font-mono text-sm">
                                Waiting
                            </div>
                        )}
                    </div>
                    {(isFinished || gameState.turn === 'dealer_turn') && (
                        <div className="text-white font-mono text-xl font-black bg-black/50 px-4 py-0.5 rounded-full border border-white/10 shadow-lg animate-in fade-in zoom-in">{dealer.score}</div>
                    )}

                    {/* Visual Deck - Absolute relative to dealer */}
                    <div className="absolute right-[-100px] top-4 hidden md:block" style={{ transform: 'rotate(5deg)' }}>
                        <div className="relative w-20 h-28">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="absolute inset-0 bg-red-900 rounded-xl border border-white/20 shadow-xl" style={{ transform: `translate(-${i * 1}px, -${i * 1}px)` }}></div>
                            ))}
                            <div className="absolute inset-0 bg-red-900 rounded-xl border-2 border-white/20 shadow-2xl flex items-center justify-center">
                                <div className="w-16 h-24 border-2 border-white/10 border-dashed rounded-lg opacity-30 bg-red-950/20"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Decorative Text */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white/5 font-black text-8xl tracking-widest pointer-events-none select-none z-0">
                21
            </div>

            {/* 2. Middle Area (Controls & Overlays) */}
            <div className="flex-grow flex items-center justify-center w-full relative z-40">
                {/* Betting Overlay */}
                {isBetting && !me?.bet && (
                    <div className="bg-black/90 backdrop-blur p-6 rounded-2xl border border-yellow-500/30 flex flex-col items-center gap-4 shadow-2xl animate-in fade-in zoom-in w-full max-w-sm">
                        <h2 className="text-xl font-bold text-yellow-400 font-mono">PLACE BET</h2>
                        <div className="w-full">
                            <div className="flex justify-between text-gray-400 text-xs mb-1 uppercase font-bold tracking-wider">
                                <span>Balance</span>
                                <span className="text-white">${me.balance}</span>
                            </div>
                            <input
                                type="number"
                                min="1"
                                max={me.balance}
                                value={customBet}
                                onChange={(e) => setCustomBet(Number(e.target.value))}
                                className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl py-3 px-4 text-2xl font-mono text-white text-center focus:border-yellow-500 focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="flex gap-2 justify-center w-full">
                            {[10, 50, 100].map(amt => (
                                <button key={amt} onClick={() => setCustomBet(prev => Math.min(prev + amt, me.balance))}
                                    className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-3 py-2 text-xs font-bold transition-colors flex-1 border border-white/5">
                                    +{amt}
                                </button>
                            ))}
                            <button onClick={() => setCustomBet(0)} className="bg-red-900/50 hover:bg-red-900 text-white rounded-lg px-3 py-2 text-xs font-bold transition-colors border border-red-500/30">Clear</button>
                        </div>
                        <button
                            onClick={() => {
                                if (customBet > 0 && customBet <= me.balance) placeBet(customBet);
                                else showNotification("Invalid bet amount", "error");
                            }}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black text-lg py-3 rounded-xl shadow-lg shadow-yellow-500/20 transition-all hover:scale-105"
                        >
                            CONFIRM
                        </button>
                    </div>
                )}

                {/* Waiting for bets / Host Deal */}
                {isHost && isBetting && me?.bet > 0 && (
                    <button
                        onClick={onDeal}
                        disabled={Object.values(players).some(p => p.bet === 0)}
                        className="bg-emerald-500 disabled:bg-gray-800/80 disabled:opacity-80 disabled:cursor-not-allowed text-white font-bold text-lg py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-3 backdrop-blur-sm border border-white/10"
                    >
                        {Object.values(players).some(p => p.bet === 0) ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                <span className="text-white/50">Waiting for bets...</span>
                            </>
                        ) : (
                            <>
                                <span>DEAL CARDS</span>
                                <span className="bg-white/20 px-2 rounded text-sm">Space</span>
                            </>
                        )}
                    </button>
                )}
                {/* Non-host waiting message */}
                {!isHost && isBetting && me?.bet > 0 && (
                    <div className="bg-black/50 backdrop-blur px-6 py-3 rounded-full border border-white/10 text-white animate-pulse">
                        Waiting for start...
                    </div>
                )}

                {/* Playing Controls */}
                {isPlaying && isMyTurn && (
                    <div className="flex gap-4 items-end">
                        <div className="flex flex-col gap-2">
                            <button onClick={onSplit} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg text-xs font-mono border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed">SPLIT</button>
                            <button onClick={onDouble} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg text-xs font-mono border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed">DOUBLE</button>
                        </div>
                        <button
                            onClick={onHit}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white font-black text-2xl py-4 px-10 rounded-2xl shadow-[0_6px_0_rgb(6,95,70)] hover:shadow-[0_3px_0_rgb(6,95,70)] hover:translate-y-[3px] active:translate-y-[6px] active:shadow-none transition-all border-b-4 border-emerald-700"
                        >
                            HIT
                        </button>
                        <button
                            onClick={onStand}
                            className="bg-red-500 hover:bg-red-400 text-white font-black text-2xl py-4 px-10 rounded-2xl shadow-[0_6px_0_rgb(153,27,27)] hover:shadow-[0_3px_0_rgb(153,27,27)] hover:translate-y-[3px] active:translate-y-[6px] active:shadow-none transition-all border-b-4 border-red-700"
                        >
                            STAND
                        </button>
                    </div>
                )}

                {/* Round Result Overlay */}
                {isFinished && (() => {
                    // Personal Result Logic
                    const myHands = me?.hands || [];
                    const dealerScore = dealer.score;
                    let resultText = "ROUND OVER";
                    let resultColor = "text-gray-400";

                    let hasWin = false;
                    let hasPush = false;
                    let allLost = true;

                    myHands.forEach(h => {
                        if (h.status === 'blackjack') {
                            if (dealerScore !== 21) { hasWin = true; allLost = false; }
                            else { hasPush = true; allLost = false; }
                        } else if (h.status === 'busted') {
                            // Lost
                        } else {
                            if (dealerScore > 21) { hasWin = true; allLost = false; }
                            else if (h.score > dealerScore) { hasWin = true; allLost = false; }
                            else if (h.score === dealerScore) { hasPush = true; allLost = false; }
                        }
                    });

                    if (hasWin) {
                        resultText = "YOU WON!";
                        resultColor = "from-emerald-400 to-green-500";
                    } else if (hasPush && !hasWin) {
                        resultText = "PUSH";
                        resultColor = "from-yellow-400 to-orange-500";
                    } else if (allLost) {
                        resultText = "YOU LOST";
                        resultColor = "from-red-500 to-pink-600";
                    }

                    return (
                        <div className="bg-black/90 backdrop-blur-xl text-white px-10 py-8 rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300 z-50">
                            <h2 className={`text-5xl font-black italic bg-gradient-to-br ${resultColor} bg-clip-text text-transparent drop-shadow-2xl`}>{resultText}</h2>
                            <div className="flex flex-col items-center gap-2 bg-white/5 p-4 rounded-2xl w-full border border-white/5">
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Dealer Total</span>
                                <span className="text-4xl font-mono font-bold text-white">{dealer.score}</span>
                                <span className="text-red-400 text-sm font-bold uppercase">{dealer.score > 21 ? 'BUSTED' : ''}</span>
                            </div>
                            {isHost && (
                                <button onClick={startNextRound} className="bg-white hover:bg-gray-100 text-black px-8 py-3 rounded-full font-black text-lg shadow-xl hover:scale-105 transition-all">
                                    START NEXT ROUND
                                </button>
                            )}
                            {!isHost && <div className="text-sm text-gray-500 animate-pulse font-mono">Waiting for host...</div>}
                        </div>
                    );
                })()}
            </div>

            {/* 3. Players Row (Bottom) */}
            <div className="flex-none flex items-end justify-center gap-4 px-4 pb-8 pt-16 w-full overflow-x-auto z-10 no-scrollbar min-h-[260px]">
                {sortedPlayers.map((p) => (
                    <div key={p.id} className="transform scale-90 sm:scale-100 transition-transform">
                        <PlayerArea
                            player={p}
                            isCurrentTurn={gameState.turn === p.id}
                            isMe={p.id === playerId}
                        />
                    </div>
                ))}
            </div>

            {/* Room Info (Top Left) */}
            <div className="absolute top-4 left-4 z-50">
                <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-xl p-2 flex items-center gap-2 hover:bg-black/40 transition-colors cursor-pointer group"
                    onClick={() => {
                        navigator.clipboard.writeText(roomId);
                        showNotification("Room ID copied!");
                    }}>
                    <div className="bg-emerald-500/10 p-1.5 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest hidden sm:block">Room Code</span>
                        <span className="text-sm font-mono font-bold text-emerald-400 tracking-wider group-hover:scale-105 transition-transform origin-left">{roomId || '---'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Table;
