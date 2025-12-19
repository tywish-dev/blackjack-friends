import { motion } from "framer-motion";

const Card = ({ suit, value, index }) => {
    const isRed = suit === '♥' || suit === '♦';

    return (
        <motion.div
            initial={{ x: -100, y: -100, opacity: 0, rotate: -20 }}
            animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.1, translateY: -10 }}
            className={`
        relative w-24 h-36 bg-white rounded-xl shadow-xl border border-gray-200 
        flex flex-col items-center justify-between p-2 select-none
        ${isRed ? 'text-red-500' : 'text-black'}
      `}
        >
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
        </motion.div>
    );
};

export default Card;
