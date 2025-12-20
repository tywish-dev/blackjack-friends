import { useGame } from './hooks/useGame';
import Lobby from './components/Lobby';
import Table from './components/Table';

function App() {
  const {
    roomId,
    playerId,
    gameState,
    createRoom,
    joinRoom,
    dealCards,
    hit,
    stand,
    error,
    activeRooms, // Get activeRooms from hook
    placeBet,
    startNextRound,
    doubleDown,
    splitPair
  } = useGame();

  return (
    <div className="min-h-screen bg-green-900 overflow-hidden relative font-sans select-none">

      {/* Felt Texture Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>

      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-xl z-50 font-bold animate-bounce">
          {error}
        </div>
      )}

      {!roomId || !gameState ? (
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <Lobby onCreateRoom={createRoom} onJoinRoom={joinRoom} activeRooms={activeRooms} />
        </div>
      ) : (
        <div className="relative z-10 h-screen">
          <Table
            roomId={roomId}
            gameState={gameState}
            playerId={playerId}
            onHit={hit}
            onStand={stand}
            onDeal={dealCards}
            onReset={() => window.location.reload()} // Quick reset hack
            placeBet={placeBet}
            startNextRound={startNextRound}
            onDouble={doubleDown}
            onSplit={splitPair}
          />
        </div>
      )}
    </div>
  );
}

export default App;
