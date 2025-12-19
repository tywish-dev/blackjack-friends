import { useState } from 'react';

const Lobby = ({ onCreateRoom, onJoinRoom, activeRooms = [] }) => {
    const [username, setUsername] = useState(localStorage.getItem('bj_playerName') || '');
    const [roomCode, setRoomCode] = useState('');

    const handleCreate = () => {
        if (!username) return alert('Please enter a username');
        onCreateRoom(username);
    };

    const handleJoin = () => {
        if (!username) return alert('Please enter a username');
        if (!roomCode) return alert('Please enter a room code');
        onJoinRoom(roomCode, username);
    };

    return (
        <div className="flex flex-col gap-6 items-center p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-md w-full scrollbar-thin">
            <h2 className="text-3xl font-bold text-emerald-400 mb-2">Blackjack Friends</h2>

            <div className="w-full">
                <label className="block text-gray-400 text-sm mb-1">Username</label>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
            </div>

            <div className="w-full flex flex-col gap-3">
                <button
                    onClick={handleCreate}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                >
                    Create New Room
                </button>

                <div className="flex items-center gap-2 my-2">
                    <div className="h-px bg-gray-700 flex-1"></div>
                    <span className="text-gray-500 text-sm">OR</span>
                    <div className="h-px bg-gray-700 flex-1"></div>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="ROOM CODE"
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 text-white text-center tracking-widest uppercase focus:outline-none focus:border-emerald-500 transition-colors"
                        maxLength={4}
                    />
                    <button
                        onClick={handleJoin}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                    >
                        Join
                    </button>
                </div>

                {/* Room List */}
                <div className="mt-8 w-full border-t border-white/10 pt-6">
                    <h3 className="text-white/50 text-sm font-bold uppercase tracking-widest mb-4">Open Tables</h3>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                        {activeRooms.length === 0 ? (
                            <div className="text-white/20 text-center text-sm py-4 italic">No open tables found. Create one!</div>
                        ) : (
                            activeRooms.map(room => (
                                <button
                                    key={room.id}
                                    onClick={() => {
                                        if (!username) {
                                            alert("Please enter a username first");
                                            return;
                                        }
                                        onJoinRoom(room.id, username);
                                    }}
                                    className="bg-gray-800/50 hover:bg-emerald-900/40 border border-white/5 hover:border-emerald-500/30 p-3 rounded-lg flex items-center justify-between group transition-all w-full text-left"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-white font-mono font-bold tracking-wider group-hover:text-emerald-400 transition-colors">{room.id}</span>
                                        <span className="text-xs text-emerald-600 group-hover:text-emerald-400">Waiting for players...</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/40 text-sm">
                                        <span>{room.playerCount}/4</span>
                                        <span className="text-emerald-500 text-lg">›</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Lobby;
