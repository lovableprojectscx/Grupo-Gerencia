import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface WhatsAppBubbleProps {
    phoneNumber?: string;
    message?: string;
}

export const WhatsAppBubble = ({
    phoneNumber = "51900000000",
    message = "Hola! Quisiera más información sobre los cursos."
}: WhatsAppBubbleProps) => {
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
                duration: 0.5,
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 1
            }}
            className="fixed bottom-6 right-6 z-50"
        >
            <div className="relative group">
                {/* Pulse effect */}
                <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />

                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-4 px-4 py-2 bg-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    <p className="text-sm font-medium text-gray-800">¿Tienes dudas? ¡Escríbenos!</p>
                    <div className="absolute -bottom-1 right-5 w-2 h-2 bg-white rotate-45" />
                </div>

                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 text-white"
                    aria-label="Contactar por WhatsApp"
                >
                    <MessageCircle className="w-7 h-7 md:w-8 md:h-8 fill-current" />
                </a>
            </div>
        </motion.div>
    );
};
