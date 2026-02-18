/**
 * MaterialIcon.jsx
 * Maps database-stored emoji strings to premium lucide-react SVG icons.
 * Centralised lookup — add new emoji→icon mappings here.
 */
import {
    Package, Cylinder, Target, Truck, Recycle, Link2, Plus,
    ArrowRight, Clock, XCircle, RefreshCw, Timer,
    HelpCircle
} from 'lucide-react';

const EMOJI_MAP = {
    // ── Material Types ──
    '📦': Package,
    '🧵': Cylinder,
    '🎯': Target,
    '🚛': Truck,
    '♻️': Recycle,
    '🔗': Link2,
    '➕': Plus,

    // ── Preset Messages ──
    '🏃': ArrowRight,
    '⏳': Clock,
    '❌': XCircle,
    '🔄': RefreshCw,
    '⏱️': Timer,
};

/**
 * Renders an SVG icon for a given emoji string.
 * Falls back to a generic icon if no mapping exists.
 *
 * @param {string}  emoji      - The emoji string from the DB
 * @param {number}  [size=24]  - Icon size in px
 * @param {string}  [className] - Additional CSS classes
 */
export default function MaterialIcon({ emoji, size = 24, className = '' }) {
    const IconComponent = EMOJI_MAP[emoji] || HelpCircle;
    return <IconComponent size={size} className={className} />;
}
