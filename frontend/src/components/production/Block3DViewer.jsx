import React, { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import { X, Move3D } from 'lucide-react';

// Premium color palette for slabs
const SLAB_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet  
    '#a855f7', // Purple
    '#d946ef', // Fuchsia
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
];

// Simple slab component
function Slab({ position, size, color, isRemainder = false }) {
    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial
                color={isRemainder ? '#fbbf24' : color}
                metalness={0.2}
                roughness={0.4}
                transparent={isRemainder}
                opacity={isRemainder ? 0.8 : 1}
            />
        </mesh>
    );
}

// Main block visualization - STATIC, no auto-rotation
function BlockVisualization({ blockHeight, sheetThickness, totalSheets, remainder }) {
    // Validate inputs - blockHeight is the ACTUAL height from user input
    const safeBlockHeight = Math.max(10, Math.min(300, blockHeight || 100));
    const safeSheetThickness = Math.max(1, Math.min(50, sheetThickness || 4));
    const safeTotalSheets = Math.max(1, Math.min(100, totalSheets || 1));
    const safeRemainder = Math.max(0, Math.min(50, remainder || 0));

    // Use the ACTUAL blockHeight for visualization scale
    // Normalize to fit in view (~6 units visual height)
    const normalizedScale = 6 / safeBlockHeight;

    // Visual dimensions (we don't have width/depth from user, so use sensible defaults)
    // Assuming typical foam block ~160x190 ratio
    const blockWidth = 160 * normalizedScale * 0.5;  // Visual width
    const blockDepth = 190 * normalizedScale * 0.5;  // Visual depth  
    const sheetThicknessScaled = safeSheetThickness * normalizedScale * 0.5;
    const remainderScaled = safeRemainder * normalizedScale * 0.5;

    // Generate slabs - ALL SAME COLOR (same cut)
    const slabs = useMemo(() => {
        const result = [];
        let currentY = 0;

        // All slabs use SAME color - they are identical cuts
        const slabColor = '#6366f1'; // Violet for all slabs

        for (let i = 0; i < safeTotalSheets; i++) {
            const thickness = Math.max(0.02, sheetThicknessScaled - 0.01);
            result.push({
                position: [0, currentY + thickness / 2, 0],
                size: [blockWidth, thickness, blockDepth],
                color: slabColor,
                key: `slab-${i}`
            });
            currentY += sheetThicknessScaled;
        }

        // Add remainder
        if (safeRemainder > 0.3) {
            const remThickness = Math.max(0.02, remainderScaled - 0.01);
            result.push({
                position: [0, currentY + remThickness / 2, 0],
                size: [blockWidth, remThickness, blockDepth],
                color: '#fbbf24',
                key: 'remainder',
                isRemainder: true
            });
        }

        return result;
    }, [safeTotalSheets, sheetThicknessScaled, remainderScaled, blockWidth, blockDepth, safeRemainder]);

    // Calculate total height for centering
    const totalVisualHeight = (safeTotalSheets * sheetThicknessScaled) + remainderScaled;

    // Use the ACTUAL blockHeight from props for labels (not recalculated!)
    const realHeightCm = safeBlockHeight;

    return (
        <group position={[0, -totalVisualHeight / 2, 0]}>
            {/* Base platform */}
            <mesh position={[0, -0.15, 0]} receiveShadow>
                <cylinderGeometry args={[blockWidth * 0.55, blockWidth * 0.6, 0.08, 32]} />
                <meshStandardMaterial color="#18181b" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Slabs */}
            {slabs.map((slab) => (
                <Slab
                    key={slab.key}
                    position={slab.position}
                    size={slab.size}
                    color={slab.color}
                    isRemainder={slab.isRemainder}
                />
            ))}

            {/* HEIGHT LABEL - left side */}
            <Html position={[-blockWidth / 2 - 0.8, totalVisualHeight / 2, 0]} center>
                <div className="flex flex-col items-center text-white whitespace-nowrap">
                    <div className="w-0.5 bg-white h-4" />
                    <div className="bg-black/80 px-2 py-1 rounded text-sm font-bold border border-white/30">
                        ↕ {realHeightCm} cm
                    </div>
                    <div className="w-0.5 bg-white h-4" />
                </div>
            </Html>

            {/* SHEET THICKNESS LABEL - right side, point to first slab */}
            <Html position={[blockWidth / 2 + 0.8, sheetThicknessScaled / 2, 0]} center>
                <div className="bg-indigo-600/90 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap border border-indigo-400">
                    ← Lastra: {safeSheetThickness} cm
                </div>
            </Html>

            {/* REMAINDER LABEL - right side, top */}
            {safeRemainder > 0.3 && (
                <Html position={[blockWidth / 2 + 0.8, totalVisualHeight - remainderScaled / 2, 0]} center>
                    <div className="bg-amber-500/90 px-2 py-1 rounded text-xs font-bold text-black whitespace-nowrap border border-amber-300">
                        ← Scarto: {safeRemainder} cm
                    </div>
                </Html>
            )}
        </group>
    );
}

// Info panel overlay
function InfoPanel({ blockHeight, sheetThickness, totalSheets, remainder, materialName }) {
    return (
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-xl rounded-xl p-4 border border-white/20 max-w-xs">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Move3D className="w-5 h-5 text-violet-400" />
                Vista 3D Blocco
            </h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                    <span className="text-zinc-400">Materiale:</span>
                    <span className="text-white font-medium truncate">{materialName}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-zinc-400">Altezza:</span>
                    <span className="text-white font-medium">{blockHeight} cm</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-zinc-400">Spessore lastra:</span>
                    <span className="text-white font-medium">{sheetThickness} cm</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-zinc-400">Totale lastre:</span>
                    <span className="text-emerald-400 font-bold text-lg">{totalSheets}</span>
                </div>
                {remainder > 0 && (
                    <div className="flex justify-between gap-4 pt-2 border-t border-white/20 mt-2">
                        <span className="text-amber-400">⚠️ Rimanenza:</span>
                        <span className="text-amber-400 font-bold">{remainder} cm</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Legend - simplified
function Legend({ totalSheets, remainder }) {
    return (
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-xl rounded-xl p-3 border border-white/20">
            <p className="text-xs text-zinc-400 mb-2 font-medium">Legenda</p>
            <div className="flex gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-indigo-500" />
                    <span className="text-sm text-zinc-300">Lastre ({totalSheets})</span>
                </div>
                {remainder > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-amber-400" />
                        <span className="text-sm text-amber-400">Scarto ({remainder} cm)</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Controls hint
function ControlsHint() {
    return (
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-xl rounded-xl p-3 border border-white/20">
            <p className="text-xs text-zinc-400 mb-1 font-medium">Controlli</p>
            <div className="text-xs text-zinc-500">
                <p>👆 Trascina = Ruota</p>
                <p>🔍 Scroll/Pinch = Zoom</p>
            </div>
        </div>
    );
}

// Main component - Full screen modal
export default function Block3DViewer({
    isOpen,
    onClose,
    blockHeight = 100,
    sheetThickness = 4,
    totalSheets = 6,
    remainder = 4,
    materialName = "D30 Rosa"
}) {
    const [hasError, setHasError] = useState(false);

    // Reset error when reopening
    useEffect(() => {
        if (isOpen) setHasError(false);
    }, [isOpen]);

    if (!isOpen) return null;

    if (hasError) {
        return (
            <div className="fixed inset-0 z-50 bg-zinc-900 flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl text-white mb-2">Errore nel caricamento 3D</h2>
                    <p className="text-zinc-400 mb-4">Prova a ricaricare la pagina</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        );
    }

    // Validate props
    const safeProps = {
        blockHeight: Number(blockHeight) || 100,
        sheetThickness: Number(sheetThickness) || 4,
        totalSheets: Math.max(1, Number(totalSheets) || 1),
        remainder: Math.max(0, Number(remainder) || 0),
        materialName: materialName || 'Materiale'
    };

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-3 bg-white/10 backdrop-blur-xl rounded-full
                    hover:bg-white/20 transition-all border border-white/10"
            >
                <X className="w-6 h-6 text-white" />
            </button>

            {/* 3D Canvas - MANUAL CONTROL ONLY */}
            <Canvas
                shadows
                dpr={[1, 1.5]}
                onCreated={(state) => {
                    state.gl.setClearColor('#09090b');
                }}
                onError={() => setHasError(true)}
            >
                <PerspectiveCamera makeDefault position={[8, 5, 8]} fov={50} />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[10, 15, 10]}
                    intensity={1.2}
                    castShadow
                />
                <directionalLight position={[-5, 10, -5]} intensity={0.4} color="#a855f7" />
                <pointLight position={[0, 8, 0]} intensity={0.4} color="#6366f1" />

                {/* Main visualization - STATIC */}
                <BlockVisualization
                    blockHeight={safeProps.blockHeight}
                    sheetThickness={safeProps.sheetThickness}
                    totalSheets={safeProps.totalSheets}
                    remainder={safeProps.remainder}
                />

                {/* MANUAL Controls only - NO autoRotate */}
                <OrbitControls
                    enablePan={false}
                    minDistance={4}
                    maxDistance={20}
                    minPolarAngle={Math.PI * 0.1}
                    maxPolarAngle={Math.PI * 0.6}
                    enableDamping={true}
                    dampingFactor={0.05}
                />
            </Canvas>

            {/* Overlays */}
            <InfoPanel {...safeProps} />
            <Legend totalSheets={safeProps.totalSheets} remainder={safeProps.remainder} />
            <ControlsHint />

            {/* Gradient overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
        </div>
    );
}
