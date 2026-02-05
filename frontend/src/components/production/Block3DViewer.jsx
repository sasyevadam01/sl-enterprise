import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    PerspectiveCamera,
    Environment,
    ContactShadows,
    Float,
    Text3D,
    Center,
    RoundedBox
} from '@react-three/drei';
import { X, RotateCcw, ZoomIn, ZoomOut, Move3D } from 'lucide-react';
import * as THREE from 'three';

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

// Individual slab component with premium materials
function Slab({ position, size, color, index, isRemainder = false }) {
    const meshRef = useRef();

    // Subtle floating animation
    useFrame((state) => {
        if (meshRef.current && !isRemainder) {
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + index * 0.3) * 0.02;
        }
    });

    return (
        <mesh ref={meshRef} position={position} castShadow receiveShadow>
            <RoundedBox args={size} radius={0.02} smoothness={4}>
                <meshPhysicalMaterial
                    color={isRemainder ? '#fbbf24' : color}
                    metalness={0.1}
                    roughness={0.3}
                    clearcoat={0.3}
                    clearcoatRoughness={0.2}
                    transparent={isRemainder}
                    opacity={isRemainder ? 0.7 : 1}
                    envMapIntensity={1}
                />
            </RoundedBox>

            {/* Glowing edge for remainder */}
            {isRemainder && (
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[size[0] + 0.02, size[1] + 0.02, size[2] + 0.02]} />
                    <meshBasicMaterial
                        color="#fbbf24"
                        transparent
                        opacity={0.3}
                        side={THREE.BackSide}
                    />
                </mesh>
            )}
        </mesh>
    );
}

// Cut line indicator
function CutLine({ position, width, depth }) {
    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width + 0.1, depth + 0.1]} />
            <meshBasicMaterial
                color="#ef4444"
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// Main block visualization
function BlockVisualization({ blockHeight, sheetThickness, totalSheets, remainder }) {
    const groupRef = useRef();

    // Scale factor (1 unit = 10cm for better visualization)
    const scaleFactor = 0.1;
    const blockWidth = 200 * scaleFactor;  // 200cm standard
    const blockDepth = 100 * scaleFactor;  // 100cm standard
    const blockHeightScaled = blockHeight * scaleFactor;
    const sheetThicknessScaled = sheetThickness * scaleFactor;
    const remainderScaled = remainder * scaleFactor;

    // Generate slabs
    const slabs = useMemo(() => {
        const result = [];
        let currentY = 0;

        for (let i = 0; i < totalSheets; i++) {
            const color = SLAB_COLORS[i % SLAB_COLORS.length];
            result.push({
                position: [0, currentY + sheetThicknessScaled / 2, 0],
                size: [blockWidth, sheetThicknessScaled - 0.01, blockDepth],
                color,
                index: i
            });
            currentY += sheetThicknessScaled;
        }

        // Add remainder if exists
        if (remainder > 0) {
            result.push({
                position: [0, currentY + remainderScaled / 2, 0],
                size: [blockWidth, remainderScaled - 0.01, blockDepth],
                color: '#fbbf24',
                index: totalSheets,
                isRemainder: true
            });
        }

        return result;
    }, [totalSheets, sheetThicknessScaled, remainderScaled, blockWidth, blockDepth]);

    // Cut lines
    const cutLines = useMemo(() => {
        const lines = [];
        for (let i = 1; i < totalSheets; i++) {
            lines.push({
                position: [0, i * sheetThicknessScaled, 0],
                width: blockWidth,
                depth: blockDepth
            });
        }
        return lines;
    }, [totalSheets, sheetThicknessScaled, blockWidth, blockDepth]);

    // Slow rotation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
        }
    });

    return (
        <group ref={groupRef} position={[0, -blockHeightScaled / 2, 0]}>
            {/* Base platform */}
            <mesh position={[0, -0.15, 0]} receiveShadow>
                <cylinderGeometry args={[blockWidth * 0.8, blockWidth * 0.8, 0.1, 64]} />
                <meshPhysicalMaterial
                    color="#1e1e2e"
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {/* Slabs */}
            {slabs.map((slab, idx) => (
                <Slab key={idx} {...slab} />
            ))}

            {/* Cut lines */}
            {cutLines.map((line, idx) => (
                <CutLine key={`cut-${idx}`} {...line} />
            ))}
        </group>
    );
}

// Info panel overlay
function InfoPanel({ blockHeight, sheetThickness, totalSheets, remainder, materialName }) {
    return (
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Move3D className="w-5 h-5 text-violet-400" />
                Vista 3D Blocco
            </h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-8">
                    <span className="text-zinc-400">Materiale:</span>
                    <span className="text-white font-medium">{materialName}</span>
                </div>
                <div className="flex justify-between gap-8">
                    <span className="text-zinc-400">Altezza blocco:</span>
                    <span className="text-white font-medium">{blockHeight} cm</span>
                </div>
                <div className="flex justify-between gap-8">
                    <span className="text-zinc-400">Spessore lastra:</span>
                    <span className="text-white font-medium">{sheetThickness} cm</span>
                </div>
                <div className="flex justify-between gap-8">
                    <span className="text-zinc-400">Totale lastre:</span>
                    <span className="text-emerald-400 font-bold">{totalSheets}</span>
                </div>
                {remainder > 0 && (
                    <div className="flex justify-between gap-8 pt-2 border-t border-white/10">
                        <span className="text-amber-400">Rimanenza:</span>
                        <span className="text-amber-400 font-bold">{remainder} cm</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Legend
function Legend({ totalSheets, remainder }) {
    return (
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-xl rounded-xl p-3 border border-white/10">
            <p className="text-xs text-zinc-400 mb-2">Legenda</p>
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: Math.min(totalSheets, 5) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-1">
                        <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: SLAB_COLORS[i] }}
                        />
                        <span className="text-xs text-zinc-300">Lastra {i + 1}</span>
                    </div>
                ))}
                {totalSheets > 5 && (
                    <span className="text-xs text-zinc-500">+{totalSheets - 5} altre</span>
                )}
                {remainder > 0 && (
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
                        <div className="w-3 h-3 rounded bg-amber-400/70" />
                        <span className="text-xs text-amber-400">Rimanenza</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Controls hint
function ControlsHint() {
    return (
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-xl rounded-xl p-3 border border-white/10">
            <p className="text-xs text-zinc-400 mb-2">Controlli</p>
            <div className="space-y-1 text-xs text-zinc-500">
                <p>🖱️ Trascina per ruotare</p>
                <p>🔍 Scroll per zoom</p>
                <p>📱 Pizzica per zoom</p>
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
    if (!isOpen) return null;

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

            {/* 3D Canvas */}
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[25, 15, 25]} fov={45} />

                {/* Premium lighting setup */}
                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[10, 20, 10]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                />
                <directionalLight position={[-10, 10, -10]} intensity={0.5} color="#a855f7" />
                <pointLight position={[0, 10, 0]} intensity={0.5} color="#6366f1" />

                {/* Environment for reflections */}
                <Environment preset="city" />

                {/* Contact shadows for premium look */}
                <ContactShadows
                    position={[0, -blockHeight * 0.05 - 0.2, 0]}
                    opacity={0.5}
                    scale={40}
                    blur={2}
                    far={10}
                />

                {/* Main visualization */}
                <BlockVisualization
                    blockHeight={blockHeight}
                    sheetThickness={sheetThickness}
                    totalSheets={totalSheets}
                    remainder={remainder}
                />

                {/* Controls */}
                <OrbitControls
                    enablePan={false}
                    minDistance={10}
                    maxDistance={50}
                    minPolarAngle={Math.PI * 0.1}
                    maxPolarAngle={Math.PI * 0.5}
                    autoRotate
                    autoRotateSpeed={0.5}
                />
            </Canvas>

            {/* Overlays */}
            <InfoPanel
                blockHeight={blockHeight}
                sheetThickness={sheetThickness}
                totalSheets={totalSheets}
                remainder={remainder}
                materialName={materialName}
            />
            <Legend totalSheets={totalSheets} remainder={remainder} />
            <ControlsHint />

            {/* Gradient overlays for premium feel */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
        </div>
    );
}
