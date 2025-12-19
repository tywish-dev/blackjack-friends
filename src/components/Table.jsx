import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const PlayerArea = ({ player, isCurrentTurn, isMe }) => {
    return (
        <div className={`
      flex flex-col items-center gap-4 p-4 rounded-xl transition-all duration-300 relative
      ${isCurrentTurn ? 'bg-yellow-500/10 ring-2 ring-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : ''}
      ${isMe ? 'mb-4' : 'opacity-80 scale-90'}
    `}>
            {/* Balance Badge */}
            <div className="absolute -top-4 bg-gray-900 border border-emerald-500/50 text-emerald-400 px-3 py-1 rounded-full text-sm font-mono font-bold shadow-lg flex items-center gap-1">
                <span>$</span>
                <span>{player.balance}</span>
            </div>

            {/* Current Bet */}
            {player.bet > 0 && (
                <div className="absolute -right-4 top-10 bg-black/80 border border-yellow-500/50 text-yellow-400 px-2 py-1 rounded-lg text-xs font-mono font-bold shadow-lg rotate-12">
                    Bet: ${player.bet}
                </div>
            )}

            <div className="relative mt-2">
                {/* Overlapping Cards */}
                <div className="flex -space-x-12 min-h-[144px]">
                    <AnimatePresence>
                        {player.hand && player.hand.map((card, idx) => (
                            <Card key={`${card.suit}-${card.value}-${idx}`} {...card} index={idx} />
                        ))}
                    </AnimatePresence>
                    {(!player.hand || player.hand.length === 0) && (
                        <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-white/10 text-xs">
                            {player.status === 'betting' ? 'Betting...' : 'Empty'}
                        </div>
                    )}
                </div>

                {player.status === 'busted' && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-red-600/90 text-white font-bold py-1 px-3 rounded-full shadow-lg transform rotate-12 border-2 border-white animate-bounce-in">
                            BUSTED
                        </div>
                    </div>
                )}
                {player.status === 'blackjack' && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-yellow-500/90 text-black font-black py-1 px-3 rounded-full shadow-lg transform -rotate-12 border-2 border-white animate-pulse">
                            BLACKJACK
                        </div>
                    </div>
                )}
            </div>

            <div className="text-center">
                <div className="font-bold text-white text-lg flex items-center gap-2 justify-center">
                    {player.name} {isMe && '(You)'}
                    {isCurrentTurn && <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-glow"></span>}
                </div>
                <div className="text-emerald-400 font-mono text-xl">
                    {player.status !== 'betting' && `Score: ${player.score}`}
                </div>
            </div>
        </div>
    );
};

const Table = ({ roomId, gameState, playerId, onHit, onStand, onDeal, onReset, placeBet, startNextRound }) => {
    const players = gameState.players || {};
    const playerIds = Object.keys(players);
    const me = players[playerId];
    const others = playerIds.filter(id => id !== playerId).map(id => players[id]);
    const dealer = gameState.dealer || { hand: [], score: 0 };

    const isMyTurn = gameState.turn === playerId;
    const isHost = me?.isHost;
    const isPlaying = gameState.status === 'playing';
    const isFinished = gameState.status === 'finished';
    const isBetting = gameState.status === 'betting';

    return (
        <div className="relative w-full h-full flex flex-col justify-between items-center py-8">

            {/* Dealer Area */}
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                <div className="text-white/50 text-sm font-bold tracking-widest mb-2">DEALER</div>
                <div className="flex -space-x-12">
                    <AnimatePresence>
                        {dealer.hand && dealer.hand.map((card, idx) => (
                            <div key={`dealer-${idx}`} className="relative">
                                {/* Hide second card if game is playing */}
                                {idx === 1 && !isFinished ? (
                                    <div className="w-24 h-36 bg-red-800 rounded-xl shadow-xl border border-gray-200 
                                            flex items-center justify-center relative shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                        <div className="w-20 h-32 border-2 border-red-900 border-dashed rounded-lg opacity-50"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-4xl text-red-950">♦</span>
                                        </div>
                                    </div>
                                ) : (
                                    <Card {...card} index={idx} />
                                )}
                            </div>
                        ))}
                    </AnimatePresence>
                    {(!dealer.hand || dealer.hand.length === 0) && (
                        <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-xl"></div>
                    )}
                </div>
                {isFinished && (
                    <div className="mt-2 text-white font-mono text-xl">{dealer.score}</div>
                )}
            </div>

            {/* Decorative Center Text */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white/5 font-black text-6xl tracking-widest pointer-events-none select-none z-0">
                BLACKJACK
            </div>

            {/* Other Players */}
            <div className="flex flex-wrap justify-center gap-12 z-10 w-full px-8 mt-20">
                {others.map((p, idx) => (
                    <PlayerArea
                        key={idx}
                        player={p}
                        isCurrentTurn={gameState.turn === Object.keys(players).find(key => players[key] === p)}
                        isMe={false}
                    />
                ))}
            </div>

            {/* Betting Controls */}
            {isBetting && !me?.bet && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/90 backdrop-blur p-8 rounded-2xl border border-yellow-500/30 flex flex-col items-center gap-6 shadow-2xl animate-in fade-in zoom-in">
                    <h2 className="text-2xl font-bold text-yellow-400">Place Your Bet</h2>
                    <div className="flex gap-4">
                        {[10, 50, 100, 500].map(amount => (
                            <button
                                key={amount}
                                onClick={() => placeBet(amount)}
                                className="w-16 h-16 rounded-full border-4 border-dashed border-white/20 bg-gradient-to-br from-gray-800 to-black text-white font-bold hover:scale-110 hover:border-yellow-400 transition-all flex items-center justify-center shadow-lg"
                            >
                                ${amount}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Waiting for others to bet */}
            {isBetting && me?.bet > 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 bg-black/50 backdrop-blur px-6 py-3 rounded-full border border-white/10 text-white animate-pulse">
                    Waiting for other players...
                </div>
            )}

            {/* Round Over */}
            {isFinished && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 backdrop-blur text-white px-8 py-6 rounded-2xl shadow-2xl border border-white/20 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Round Over</h2>
                    {/* Dealer Result */}
                    <div className="text-gray-400">
                        Dealer: {dealer.score > 21 ? 'BUSTED' : dealer.score}
                    </div>

                    {isHost && (
                        <button onClick={startNextRound} className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105">
                            Start Next Round
                        </button>
                    )}
                    {!isHost && <div className="text-sm text-gray-500 animate-pulse">Waiting for host...</div>}
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col items-center gap-8 z-10 mb-8 w-full max-w-4xl">
                {me && (
                    <PlayerArea player={me} isCurrentTurn={isMyTurn} isMe={true} />
                )}

                <div className="flex gap-4 h-20 items-center">
                    {/* Host Controls */}
                    {isHost && isBetting && (
                        /* Host can force deal if everyone has bet, or just wait. Logic simplified for now */
                        <button
                            onClick={onDeal}
                            disabled={Object.values(players).some(p => p.bet === 0)}
                            className="bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-400 text-black font-black text-xl py-4 px-12 rounded-full shadow-[0_4px_0_rgb(161,98,7)] hover:shadow-[0_2px_0_rgb(161,98,7)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all"
                        >
                            DEAL
                        </button>
                    )}

                    {/* Player Controls */}
                    {isPlaying && isMyTurn && (
                        <>
                            <button
                                onClick={onHit}
                                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xl py-3 px-8 rounded-xl shadow-[0_4px_0_rgb(6,95,70)] hover:shadow-[0_2px_0_rgb(6,95,70)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all"
                            >
                                HIT
                            </button>
                            <button
                                onClick={onStand}
                                className="bg-red-500 hover:bg-red-400 text-white font-bold text-xl py-3 px-8 rounded-xl shadow-[0_4px_0_rgb(153,27,27)] hover:shadow-[0_2px_0_rgb(153,27,27)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all"
                            >
                                STAND
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Room Info */}
            <div className="absolute top-4 left-4 z-50">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl flex flex-col gap-1 hover:bg-black/60 transition-colors cursor-pointer group"
                    onClick={() => {
                        navigator.clipboard.writeText(roomId);
                        alert('Room Code copied!');
                    }}>
                    <span className="text-white/40 text-xs font-bold tracking-widest uppercase">Room Code</span>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-emerald-400 tracking-wider font-mono group-hover:text-emerald-300">{roomId || '---'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/20 group-hover:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-[10px] text-white/20 group-hover:text-white/40">Click to copy</span>
                </div>
            </div>
        </div>
    );
};

export default Table;
