import { useState } from 'react';

const Lobby = ({ onCreateRoom, onJoinRoom }) => {
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
        <div className="flex flex-col gap-6 items-center p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-md w-full">
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
            </div>
        </div>
    );
};

export default Lobby;
