import { useMemo } from 'react';
import { Truck } from 'lucide-react';
import './LogisticsStyles.css';

const LogisticsMap = ({ requests = [], operators = [], onBanchinaClick }) => {
    // Configurazione Layout Banchine (2D Blueprint Style)
    const banchineLayout = useMemo(() => [
        // --- VEGA 5 (Alto) ---
        { code: 'B1', name: 'Taglio / Incoll.', x: 50, y: 70, w: 100, h: 120, color: '#3b82f6' },
        { code: 'B2', name: 'Mag. Blocchi', x: 180, y: 70, w: 100, h: 120, color: '#64748b' },
        { code: 'B3', name: 'Mag. Blocchi', x: 310, y: 70, w: 100, h: 120, color: '#64748b' },
        { code: 'B4', name: 'Mag. Clienti', x: 440, y: 70, w: 100, h: 120, color: '#64748b' },
        { code: 'B5', name: 'Bordatura MP', x: 570, y: 70, w: 100, h: 120, color: '#3b82f6' },
        { code: 'B6', name: 'Guanciali', x: 700, y: 70, w: 100, h: 120, color: '#3b82f6' },
        { code: 'B7', name: 'Spedizioni', x: 830, y: 70, w: 100, h: 120, color: '#10b981' },

        // --- VEGA 6 (Basso) ---
        { code: 'B11', name: 'Assemblaggio', x: 50, y: 320, w: 120, h: 130, color: '#8b5cf6' },
        { code: 'B12', name: 'Bugnatura', x: 200, y: 320, w: 90, h: 130, color: '#8b5cf6' },
        { code: 'B13', name: 'Prep. Lastre', x: 320, y: 320, w: 100, h: 130, color: '#64748b' },
        { code: 'B14', name: 'Bordatura Full', x: 450, y: 320, w: 220, h: 130, color: '#8b5cf6' },
        { code: 'B15', name: 'Molle / Key', x: 700, y: 320, w: 100, h: 130, color: '#8b5cf6' },
        { code: 'B16', name: 'Magazzino', x: 830, y: 320, w: 100, h: 130, color: '#eab308' }
    ], []);

    const normalizeCode = (code) => {
        if (!code) return '';
        const s = code.toString().toUpperCase();
        return s.startsWith('B') ? s : `B${s}`;
    };

    const banchinaStatus = useMemo(() => {
        const statusMap = {};
        banchineLayout.forEach(b => {
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
    }, [requests, banchineLayout]);

    const renderBlock = (b) => {
        const status = banchinaStatus[b.code] || {};
        const { x, y, w, h } = b;

        // Blueprint colors
        let backgroundColor = '#ffffff';
        let borderColor = '#e2e8f0';
        let shadowColor = 'rgba(0,0,0,0.05)';

        if (status.hasRequest) {
            if (status.urgent) {
                backgroundColor = '#fef2f2';
                borderColor = '#ef4444';
                shadowColor = 'rgba(239, 68, 68, 0.1)';
            } else if (status.processing) {
                backgroundColor = '#eff6ff';
                borderColor = '#3b82f6';
                shadowColor = 'rgba(59, 130, 246, 0.1)';
            } else {
                backgroundColor = '#fffbeb';
                borderColor = '#f59e0b';
                shadowColor = 'rgba(245, 158, 11, 0.1)';
            }
        }

        return (
            <g
                key={b.code}
                className="banchina-2d-group"
                onClick={() => onBanchinaClick && onBanchinaClick(b, status)}
                style={{ cursor: 'pointer' }}
            >
                {/* Simplified rectangle with rounded corners */}
                <rect
                    x={x} y={y} width={w} height={h}
                    rx="12"
                    fill={backgroundColor}
                    stroke={borderColor}
                    strokeWidth={status.hasRequest ? "2.5" : "1"}
                    style={{ transition: 'all 0.3s ease', filter: `drop-shadow(0 4px 6px ${shadowColor})` }}
                />

                {/* Internal ID Text */}
                <text x={x + w / 2} y={y + h / 2 - 5} fill="#1e293b" fontSize="24" fontWeight="800" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    {b.code}
                </text>

                {/* Sub-label Name */}
                <text x={x + w / 2} y={y + h / 2 + 20} fill="#64748b" fontSize="11" fontWeight="500" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    {b.name}
                </text>

                {/* Status Indicator Badge */}
                {status.hasRequest && (
                    <g transform={`translate(${x + w - 5}, ${y + 5})`}>
                        <circle r="12" fill={borderColor} />
                        <text y="4" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">
                            {status.urgent ? '!' : status.count}
                        </text>
                        {status.urgent && <circle r="12" fill="none" stroke={borderColor} strokeWidth="2"><animate attributeName="r" from="12" to="20" dur="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" /></circle>}
                    </g>
                )}
            </g>
        );
    };

    return (
        <div className="logistics-map-container" style={{ background: '#f8fafc', borderRadius: '24px', overflow: 'hidden', minHeight: '520px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
            <svg viewBox="0 0 1000 520" className="logistics-map-svg" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                    </pattern>
                    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                        <rect width="100" height="100" fill="url(#smallGrid)" />
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                    </pattern>
                </defs>

                {/* Clean Grid Background */}
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Section Labels */}
                <g opacity="0.4">
                    <text x="50" y="45" fill="#475569" fontSize="12" fontWeight="800" letterSpacing="6">VEGA 5 SECTION</text>
                    <text x="50" y="295" fill="#475569" fontSize="12" fontWeight="800" letterSpacing="6">VEGA 6 SECTION</text>
                </g>

                {/* Smooth Connection Lines for processing tasks */}
                {Object.entries(banchinaStatus).map(([code, status]) => {
                    if (!status.processing) return null;
                    const target = banchineLayout.find(b => b.code === code);
                    if (!target) return null;
                    const startNode = banchineLayout.find(b => b.code === 'B16') || { x: 830, y: 320, w: 100, h: 130 };

                    const startX = startNode.x + startNode.w / 2;
                    const startY = startNode.y + startNode.h / 2;
                    const endX = target.x + target.w / 2;
                    const endY = target.y + target.h / 2;

                    return (
                        <line
                            key={`path-${code}`}
                            x1={startX} y1={startY} x2={endX} y2={endY}
                            stroke={status.urgent ? '#ef4444' : '#3b82f6'}
                            strokeWidth="2"
                            strokeDasharray="8,8"
                            opacity="0.2"
                            className="animate-dash"
                        />
                    );
                })}

                {/* Render Banchine */}
                {banchineLayout.map(renderBlock)}

                {/* Forklifts / Operators Tracking */}
                {operators && operators.map(op => {
                    const pos = gpsToSvg(op.lat, op.lon);
                    return (
                        <g key={op.id} style={{ transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} transform={`translate(${pos.x}, ${pos.y})`}>
                            {/* Operator Marker */}
                            <circle r="18" fill="white" stroke="#22c55e" strokeWidth="2" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                            <g transform="translate(-10, -10)">
                                <Truck size={20} className="text-green-600" />
                            </g>

                            {/* Info Label */}
                            <g transform="translate(0, -28)">
                                <rect x="-35" y="-14" width="70" height="18" rx="6" fill="#1e293b" />
                                <text x="0" y="-1" fill="white" fontSize="10" fontWeight="700" textAnchor="middle">
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

// CALIBRAZIONE GPS
const MAP_CONFIG = {
    topLeft: { lat: 45.0000, lon: 10.0000 },
    bottomRight: { lat: 44.9950, lon: 10.0080 },
    width: 1000,
    height: 600
};

const gpsToSvg = (lat, lon) => {
    const { topLeft, bottomRight, width, height } = MAP_CONFIG;

    const minLon = topLeft.lon;
    const maxLon = bottomRight.lon;
    const minLat = bottomRight.lat;
    const maxLat = topLeft.lat;

    let x = ((lon - minLon) / (maxLon - minLon)) * width;
    let y = ((maxLat - lat) / (maxLat - minLat)) * height;

    x = Math.max(0, Math.min(x, width));
    y = Math.max(0, Math.min(y, height));

    return { x, y };
};

export default LogisticsMap;
