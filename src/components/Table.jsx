import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';

const PlayerArea = ({ player, isCurrentTurn, isMe }) => {
    return (
        <div className={`
      flex flex-col items-center gap-4 p-4 rounded-xl transition-all duration-300
      ${isCurrentTurn ? 'bg-yellow-500/10 ring-2 ring-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : ''}
      ${isMe ? 'mb-4' : 'opacity-80 scale-90'}
    `}>
            <div className="relative">
                {/* Overlapping Cards */}
                <div className="flex -space-x-12">
                    <AnimatePresence>
                        {player.hand && player.hand.map((card, idx) => (
                            <Card key={`${card.suit}-${card.value}-${idx}`} {...card} index={idx} />
                        ))}
                    </AnimatePresence>
                    {(!player.hand || player.hand.length === 0) && (
                        <div className="w-24 h-36 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center text-white/20">
                            Empty
                        </div>
                    )}
                </div>

                {player.status === 'busted' && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-red-600/90 text-white font-bold py-1 px-3 rounded-full shadow-lg transform rotate-12 border-2 border-white">
                            BUSTED
                        </div>
                    </div>
                )}
                {player.status === 'standing' && isCurrentTurn && (
                    // Should not happen if turn logic works, but visual indicator just in case
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-blue-600/90 text-white font-bold py-1 px-3 rounded-full shadow-lg border-2 border-white">
                            STAND
                        </div>
                    </div>
                )}
            </div>

            <div className="text-center">
                <div className="font-bold text-white text-lg flex items-center gap-2 justify-center">
                    {player.name} {isMe && '(You)'}
                    {isCurrentTurn && <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-glow"></span>}
                </div>
                <div className="text-emerald-400 font-mono text-xl">Score: {player.score}</div>
            </div>
        </div>
    );
};

const Table = ({ gameState, playerId, onHit, onStand, onDeal, onReset }) => {
    const players = gameState.players || {};
    const playerIds = Object.keys(players);
    const me = players[playerId];
    const others = playerIds.filter(id => id !== playerId).map(id => players[id]);

    const isMyTurn = gameState.turn === playerId;
    const isHost = me?.isHost;
    const isPlaying = gameState.status === 'playing';
    const isFinished = gameState.status === 'finished';

    return (
        <div className="relative w-full h-full flex flex-col justify-between items-center py-8">

            {/* Table Center / Dealer Area (Simplified for now) */}
            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white/10 font-black text-6xl tracking-widest pointer-events-none select-none">
                BLACKJACK
                <div className="text-2xl tracking-normal font-normal mt-2">PAYS 3 TO 2</div>
            </div>

            {/* Other Players */}
            <div className="flex flex-wrap justify-center gap-12 z-10 w-full px-8">
                {others.map((p, idx) => (
                    <PlayerArea
                        key={idx}
                        player={p}
                        isCurrentTurn={gameState.turn === Object.keys(players).find(key => players[key] === p)}
                        isMe={false}
                    />
                ))}
            </div>

            {/* Game Status Message */}
            {isFinished && (
                <div className="z-50 bg-black/80 backdrop-blur text-white px-8 py-4 rounded-2xl shadow-2xl border border-white/20 animate-bounce">
                    <h2 className="text-2xl font-bold text-center">Round Over</h2>
                    <button onClick={onDeal} className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-full font-bold transition-colors">
                        Play Again
                    </button>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col items-center gap-8 z-10 mb-8 w-full max-w-4xl">
                {me && (
                    <PlayerArea player={me} isCurrentTurn={isMyTurn} isMe={true} />
                )}

                <div className="flex gap-4">
                    {/* Host Controls */}
                    {isHost && !isPlaying && !isFinished && (
                        <button
                            onClick={onDeal}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl py-4 px-12 rounded-full shadow-[0_4px_0_rgb(161,98,7)] hover:shadow-[0_2px_0_rgb(161,98,7)] hover:translate-y-[2px] transition-all"
                        >
                            DEAL
                        </button>
                    )}

                    {/* Player Controls */}
                    {isPlaying && isMyTurn && (
                        <>
                            <button
                                onClick={onHit}
                                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xl py-3 px-8 rounded-xl shadow-lg hover:scale-105 transition-transform"
                            >
                                HIT
                            </button>
                            <button
                                onClick={onStand}
                                className="bg-red-500 hover:bg-red-400 text-white font-bold text-xl py-3 px-8 rounded-xl shadow-lg hover:scale-105 transition-transform"
                            >
                                STAND
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Room Info */}
            <div className="absolute bottom-4 right-4 text-white/30 text-sm font-mono">
                Room Code: <span className="text-white select-all">{window.location.hash.split('/')[1] || '---'}</span>
            </div>
        </div>
    );
};

export default Table;
