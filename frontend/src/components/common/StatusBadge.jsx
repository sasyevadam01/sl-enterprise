/**
 * SL Enterprise - Status Badge Component
 * Etichetta stato colorata (pillola).
 */
export default function StatusBadge({ status, text, type = "neutral" }) {

    // Logica automatica se non viene passato 'type' ma solo 'status'
    let badgeType = type;
    let badgeText = text || status;

    if (!text && status) {
        // Mappatura automatica stati comuni
        const s = status.toLowerCase();
        if (s === 'active' || s === 'attivo' || s === 'in servizio') {
            badgeType = 'active';
            badgeText = 'Attivo';
        } else if (s === 'terminated' || s === 'terminato' || s === 'licenziato') {
            badgeType = 'terminated';
            badgeText = 'Terminato';
        } else if (s === 'leave' || s === 'ferie' || s === 'assente') {
            badgeType = 'warning';
        } else if (s.includes('scadenza')) {
            badgeType = 'warning';
        }
    }

    const variants = {
        active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",

        error: "bg-red-500/10 text-red-400 border-red-500/20",
        danger: "bg-red-500/10 text-red-400 border-red-500/20",
        terminated: "bg-red-500/10 text-red-400 border-red-500/20",

        info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",

        neutral: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };

    const style = variants[badgeType] || variants.neutral;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badgeType === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-current opacity-60'}`}></span>
            {badgeText}
        </span>
    );
}
