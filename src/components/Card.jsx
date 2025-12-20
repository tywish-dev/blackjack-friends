import { motion } from "framer-motion";

const Card = ({ suit, value, index, isFaceDown = false }) => {
    const isRed = suit === '♥' || suit === '♦';

    return (
        <div style={{ perspective: '1000px' }}>
            <motion.div
                initial={{
                    x: 100,
                    y: -100,
                    opacity: 0,
                    scale: 0.5,
                    rotateY: isFaceDown ? 180 : 0
                }}
                animate={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    rotateY: isFaceDown ? 180 : 0
                }}
                transition={{
                    rotateY: { duration: 0.6, type: "spring", stiffness: 260, damping: 20 },
                    default: { delay: index * 0.1, duration: 0.5, type: "spring" }
                }}
                whileHover={{ scale: 1.1, translateY: -10, zIndex: 50 }}
                style={{ transformStyle: 'preserve-3d' }}
                className={`
                    relative w-24 h-36 rounded-xl shadow-xl transition-all duration-500 select-none
                `}
            >
                {/* Front */}
                <div
                    style={{ backfaceVisibility: 'hidden' }}
                    className={`
                    absolute inset-0 w-full h-full rounded-xl flex flex-col items-center justify-between p-2 border
                    ${isFaceDown ? 'bg-red-900 border-white/20' : 'bg-white border-gray-200'}
                    ${isRed ? 'text-red-500' : 'text-black'}
                `}>
                    {!isFaceDown && (
                        <>
                            <div className="w-full text-left font-bold text-lg leading-none">
                                {value}
                                <div className="text-sm">{suit}</div>
                            </div>
                            <div className="text-4xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                {suit}
                            </div>
                            <div className="w-full text-right font-bold text-lg leading-none transform rotate-180">
                                {value}
                                <div className="text-sm">{suit}</div>
                            </div>
                        </>
                    )}
                </div>

                {/* Back */}
                <div
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    className="absolute inset-0 w-full h-full bg-red-900 rounded-xl border-2 border-white/20 shadow-inner flex items-center justify-center">
                    <div className="w-20 h-32 border-2 border-white/10 border-dashed rounded-lg opacity-50 bg-red-950/30"></div>
                </div>
            </motion.div>
        </div>
    );
};

export default Card;
