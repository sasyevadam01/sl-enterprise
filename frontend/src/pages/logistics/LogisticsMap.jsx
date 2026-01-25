/**
 * LogisticsMap.jsx
 * Mappa interattiva stabilimento SIERVOPLAST
 * Stile Premium: Dark Mode, Neon Glow, Animazioni Pulse
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './LogisticsStyles.css';

const LogisticsMap = ({ requests = [], operators = [], onBanchinaClick }) => {
    const navigate = useNavigate();

    // Configurazione Layout Banchine (Visualizzazione)
    // Usiamo 'code' come chiave primaria per il matching visivo.
    const banchineLayout = [
        // --- VEGA 5 (Alto) ---
        { code: 'B1', name: 'Taglio / Incoll.', x: 50, y: 50, w: 100, h: 140, color: '#3b82f6' },
        { code: 'B2', name: 'Mag. Blocchi', x: 180, y: 50, w: 100, h: 140, color: '#64748b' },
        { code: 'B3', name: 'Mag. Blocchi', x: 310, y: 50, w: 100, h: 140, color: '#64748b' },
        { code: 'B4', name: 'Mag. Clienti', x: 440, y: 50, w: 100, h: 140, color: '#64748b' },
        { code: 'B5', name: 'Bordatura MP', x: 570, y: 50, w: 100, h: 140, color: '#3b82f6' },
        { code: 'B6', name: 'Guanciali', x: 700, y: 50, w: 100, h: 140, color: '#3b82f6' },
        { code: 'B7', name: 'Spedizioni', x: 830, y: 50, w: 100, h: 140, color: '#10b981' },

        // --- VEGA 6 (Basso) ---
        { code: 'B11', name: 'Assemblaggio', x: 50, y: 300, w: 120, h: 150, color: '#8b5cf6' },
        { code: 'B12', name: 'Bugnatura', x: 200, y: 300, w: 90, h: 150, color: '#8b5cf6' },
        { code: 'B13', name: 'Prep. Lastre', x: 320, y: 300, w: 100, h: 150, color: '#64748b' },
        { code: 'B14', name: 'Bordatura Full', x: 450, y: 300, w: 220, h: 150, color: '#8b5cf6' }, // Grande
        { code: 'B15', name: 'Molle / Key', x: 700, y: 300, w: 100, h: 150, color: '#8b5cf6' },
        { code: 'B16', name: 'Magazzino', x: 830, y: 300, w: 100, h: 150, color: '#eab308' }
    ];

    // Helper per normalizzare i codici (es. "11" -> "B11")
    const normalizeCode = (code) => {
        if (!code) return '';
        const s = code.toString().toUpperCase();
        return s.startsWith('B') ? s : `B${s}`;
    };

    // Mappa richieste per banchina (Matching by CODE)
    const banchinaStatus = useMemo(() => {
        const statusMap = {};
        banchineLayout.forEach(b => {
            // Matching flessibile: ID DB potrebbe non corrispondere, usiamo il codice
            const activeReqs = requests.filter(r => {
                const reqCode = normalizeCode(r.banchina_code);
                return reqCode === b.code && ['pending', 'processing'].includes(r.status);
            });

            const urgent = activeReqs.some(r => r.is_urgent);
            const processing = activeReqs.some(r => r.status === 'processing');
            const pending = activeReqs.some(r => r.status === 'pending');
            const count = activeReqs.length;

            statusMap[b.code] = {
                hasRequest: count > 0,
                count,
                urgent,
                processing,
                pending,
                requests: activeReqs
            };
        });
        return statusMap;
    }, [requests]);

    // Funzione per disegnare un blocco 3D isometrico (SVG paths)
    const renderBlock = (b) => {
        const status = banchinaStatus[b.code] || {};
        const { x, y, w, h } = b;
        const depth = 20; // Profondità 3D

        // Colori dinamici basati sullo stato
        let baseColor = b.color;
        let topColor = '#1e293b'; // Default top (spento)
        let strokeColor = '#334155';

        if (status.hasRequest) {
            if (status.urgent) {
                baseColor = '#ef4444'; // Rosso
                topColor = '#7f1d1d';
                strokeColor = '#fca5a5';
            } else if (status.processing) {
                baseColor = '#3b82f6'; // Blu
                topColor = '#1e3a8a';
                strokeColor = '#93c5fd';
            } else {
                baseColor = '#fbbf24'; // Giallo
                topColor = '#78350f';
                strokeColor = '#fde68a';
            }
        }

        // Coordinate facce
        // Top Face (Parallelogram)
        const pathTop = `M ${x} ${y} L ${x + w} ${y} L ${x + w + depth} ${y - depth} L ${x + depth} ${y - depth} Z`;
        // Front Face (Rect)
        const pathFront = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
        // Side Face (Parallelogram)
        const pathSide = `M ${x + w} ${y} L ${x + w + depth} ${y - depth} L ${x + w + depth} ${y + h - depth} L ${x + w} ${y + h} Z`;

        return (
            <g
                key={b.code}
                className="banchina-3d-group"
                onClick={() => onBanchinaClick && onBanchinaClick(b, status)}
                style={{ cursor: 'pointer', opacity: status.hasRequest ? 1 : 0.7 }}
            >
                {/* 3D Faces */}
                <path d={pathTop} fill={status.hasRequest ? baseColor : '#334155'} stroke={strokeColor} strokeWidth="1" opacity="0.6" />
                <path d={pathSide} fill={status.hasRequest ? baseColor : '#1e293b'} stroke={strokeColor} strokeWidth="1" opacity="0.4" />
                <path d={pathFront} fill={status.hasRequest ? topColor : '#0f172a'} stroke={strokeColor} strokeWidth={status.hasRequest ? 2 : 1} />

                {/* Neon Effect sotto se attivo */}
                {status.hasRequest && (
                    <ellipse cx={x + w / 2} cy={y + h} rx={w / 1.5} ry={15} fill={baseColor} opacity="0.4" filter="url(#blurLocal)" />
                )}

                {/* Label */}
                <text x={x + w / 2} y={y + h / 2} fill="#fff" fontSize="20" fontWeight="bold" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    {b.code}
                </text>
                <text x={x + w / 2} y={y + h / 2 + 20} fill="#94a3b8" fontSize="10" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    {b.name.split(' ')[0]}
                </text>

                {/* Badge Attività 3D Floating */}
                {status.hasRequest && (
                    <g transform={`translate(${x + w - 10}, ${y - 10})`}>
                        <circle r="16" fill={baseColor} stroke="#fff" strokeWidth="2" className={status.urgent ? "animate-bounce" : ""} />
                        <text y="5" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle">
                            {status.urgent ? '!' : status.count}
                        </text>
                    </g>
                )}
            </g>
        );
    };

    return (
        <div className="logistics-map-container" style={{ background: '#020617', borderRadius: '16px', overflow: 'hidden', minHeight: '500px' }}>
            <svg viewBox="0 0 1000 600" className="logistics-map-svg" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <filter id="blurLocal" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="15" />
                    </filter>
                    <pattern id="grid3d" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#1e293b" strokeWidth="1" />
                    </pattern>
                </defs>

                {/* Background Image Texture */}
                <image href="/map_texture.png" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" opacity="0.6" />

                {/* Optional Grid Overlay (More subtle) */}
                <rect width="100%" height="100%" fill="url(#grid3d)" opacity="0.1" />

                {/* Floor Labels */}
                <text x="50" y="30" fill="#94a3b8" fontSize="14" fontWeight="bold" letterSpacing="4" opacity="0.8" style={{ textShadow: '0 2px 4px #000' }}>VEGA 5</text>
                <text x="50" y="270" fill="#94a3b8" fontSize="14" fontWeight="bold" letterSpacing="4" opacity="0.8" style={{ textShadow: '0 2px 4px #000' }}>VEGA 6</text>

                {/* Render Banchine */}
                {banchineLayout.map(renderBlock)}

                {/* --- UBER STYLE PATHS --- */}
                {Object.entries(banchinaStatus).map(([code, status]) => {
                    if (!status.processing) return null;
                    const target = banchineLayout.find(b => b.code === code);
                    if (!target) return null;
                    const startNode = banchineLayout.find(b => b.code === 'B16') || { x: 800, y: 300 };
                    const startX = startNode.x + startNode.w / 2;
                    const startY = startNode.y + startNode.h / 2;
                    const endX = target.x + target.w / 2;
                    const endY = target.y + target.h / 2;
                    const controlX = (startX + endX) / 2;
                    const controlY = 280;
                    const pathData = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

                    return (
                        <g key={`path-${code}`} style={{ pointerEvents: 'none' }}>
                            <path d={pathData} fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.2" />
                            {status.urgent && (
                                <path d={pathData} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" className="animate-dash" />
                            )}
                        </g>
                    );
                })}

                {/* --- REAL TIME GPS TRACKING --- */}
                {operators && operators.map(op => {
                    const pos = gpsToSvg(op.lat, op.lon);
                    return (
                        <g key={op.id} style={{ transition: 'all 1s linear' }} transform={`translate(${pos.x}, ${pos.y})`}>
                            {/* Ripple Effect */}
                            <circle r="20" fill="#22c55e" opacity="0.2" className="animate-ping-slow" />

                            {/* Forklift SVG Icon */}
                            <g transform="translate(-12, -12) scale(1)">
                                <circle cx="12" cy="12" r="14" fill="#0f172a" stroke="#22c55e" strokeWidth="2" />
                                <text x="12" y="16" fontSize="14" textAnchor="middle">🚜</text>
                            </g>

                            {/* Label Name */}
                            <g transform="translate(0, -25)">
                                <rect x="-30" y="-14" width="60" height="18" rx="4" fill="#0f172a" opacity="0.8" />
                                <text x="0" y="0" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">
                                    {op.fullName ? op.fullName.split(' ')[0] : op.username}
                                </text>
                            </g>
                        </g>
                    );
                })}

            </svg>
        </div>
    );
};

// CALIBRAZIONE GPS (DA CONFIGURARE SUL CAMPO)
// Inserire qui le coordinate reali degli angoli del capannone
const MAP_CONFIG = {
    // Angolo Alto-Sinistra (B1/Ingresso)
    topLeft: { lat: 45.0000, lon: 10.0000 },
    // Angolo Basso-Destra (B16/Magazzino)
    bottomRight: { lat: 44.9950, lon: 10.0080 },

    // Dimensioni SVG
    width: 1000,
    height: 600
};

const gpsToSvg = (lat, lon) => {
    // Normalizzazione semplice lineare
    // X = (lon - minLon) / (maxLon - minLon) * width
    // Y = (maxLat - lat) / (maxLat - minLat) * height (Lat cresce verso l'alto, Y verso il basso)

    const { topLeft, bottomRight, width, height } = MAP_CONFIG;

    const minLon = topLeft.lon;
    const maxLon = bottomRight.lon;
    const minLat = bottomRight.lat;
    const maxLat = topLeft.lat;

    let x = ((lon - minLon) / (maxLon - minLon)) * width;
    let y = ((maxLat - lat) / (maxLat - minLat)) * height;

    // Clamp to map boundaries
    x = Math.max(0, Math.min(x, width));
    y = Math.max(0, Math.min(y, height));

    return { x, y };
};

export default LogisticsMap;
