import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * DecryptedText
 * 
 * Effetto testo "Matrix" che si decifra.
 * 
 * @param {string} text - Il testo finale da mostrare
 * @param {number} speed - Velocità in ms per carattere (default 50)
 * @param {number} maxIterations - Quante volte cambia un carattere prima di fissarsi (default 10)
 * @param {string} characters - Set di caratteri per l'effetto cifrato
 * @param {string} className - Classi CSS aggiuntive
 * @param {string} parentClassName - Classi per il contenitore
 * @param {boolean} animateOn - Se 'view', anima quando entra nella viewport
 * @param {boolean} revealDirection - 'start' (da sx) o 'end' (da dx) o 'center'
 * @param {boolean} sequential - Se true, rivela lettere una dopo l'altra. Se false, tutte insieme random.
 */
export default function DecryptedText({
    text = "",
    speed = 50,
    maxIterations = 10,
    characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+",
    className = "",
    parentClassName = "",
    animateOn = "view", // 'view' | 'hover' | 'mount'
    revealDirection = "start",
    sequential = true,
}) {
    const [displayText, setDisplayText] = useState(text);
    const [isHovering, setIsHovering] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const containerRef = useRef(null);

    // Stato interno per gestire l'animazione corrente
    const intervalRef = useRef(null);

    const startAnimation = () => {
        let iteration = 0;

        clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setDisplayText(prev =>
                text
                    .split("")
                    .map((letter, index) => {
                        // Se la lettera è uno spazio, lasciamola spazio
                        if (letter === " ") return " ";

                        // Logica "Matrix":
                        // Se siamo abbastanza avanti con le iterazioni globali
                        // OPPURE se è sequenziale e l'indice è coperto dall'iterazione
                        if (index < iteration) {
                            return text[index];
                        }

                        // Altrimenti mostra carattere random
                        return characters[Math.floor(Math.random() * characters.length)];
                    })
                    .join("")
            );

            // Se sequenziale, avanza di 1/3 di carattere per frame (per fluidità) o 1
            if (sequential) {
                iteration += 1 / 3;
            } else {
                iteration += 1 / 3; // Anche col random totale avanziamo verso la fine
            }

            // Condizione di stop
            if (iteration >= text.length) {
                clearInterval(intervalRef.current);
                setDisplayText(text); // Fix finale
            }

        }, speed);
    };

    useEffect(() => {
        if (animateOn === "mount") {
            startAnimation();
        } else if (animateOn === "view") {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting && !hasAnimated) {
                            startAnimation();
                            setHasAnimated(true);
                        }
                    });
                },
                { threshold: 0.1 }
            );

            if (containerRef.current) {
                observer.observe(containerRef.current);
            }

            return () => {
                if (containerRef.current) observer.unobserve(containerRef.current);
            };
        }
    }, [animateOn, hasAnimated, text]);

    const handleMouseEnter = () => {
        if (animateOn === "hover") {
            startAnimation();
        }
    };

    return (
        <span
            ref={containerRef}
            className={`${parentClassName} inline-block whitespace-pre-wrap`}
            onMouseEnter={handleMouseEnter}
        >
            <span className={className}>
                {displayText}
            </span>
        </span>
    );
}
