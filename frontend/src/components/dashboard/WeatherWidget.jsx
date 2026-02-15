/**
 * WeatherWidget — Compact with sky-tinted background
 * v5.1 Color Accent Version
 */
import { useState, useEffect } from 'react';
import { Cloud, Wind, Sun, CloudRain, Snowflake, CloudLightning, CloudFog, CloudSun, MapPin } from 'lucide-react';

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('https://api.open-meteo.com/v1/forecast?latitude=40.85&longitude=14.26&current_weather=true&timezone=auto')
            .then(res => res.json())
            .then(data => { setWeather(data.current_weather); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full animate-pulse min-h-[200px]" />;
    }
    if (!weather) return null;

    const getWeatherInfo = (code) => {
        if (code === 0) return { icon: Sun, label: 'Sereno', color: 'text-amber-500', gradient: 'from-amber-50 to-sky-50' };
        if (code >= 1 && code <= 3) return { icon: CloudSun, label: 'Nuvoloso', color: 'text-slate-500', gradient: 'from-slate-50 to-blue-50' };
        if (code >= 45 && code <= 48) return { icon: CloudFog, label: 'Nebbia', color: 'text-slate-400', gradient: 'from-gray-50 to-slate-100' };
        if (code >= 51 && code <= 67) return { icon: CloudRain, label: 'Pioggia', color: 'text-blue-500', gradient: 'from-blue-50 to-indigo-50' };
        if (code >= 71 && code <= 77) return { icon: Snowflake, label: 'Neve', color: 'text-cyan-500', gradient: 'from-cyan-50 to-white' };
        if (code >= 95) return { icon: CloudLightning, label: 'Temporale', color: 'text-purple-500', gradient: 'from-purple-50 to-slate-100' };
        return { icon: Cloud, label: 'Variabile', color: 'text-slate-500', gradient: 'from-slate-50 to-blue-50' };
    };

    const info = getWeatherInfo(weather.weathercode);
    const WeatherIcon = info.icon;

    return (
        <div className={`dashboard-card bg-gradient-to-br ${info.gradient} rounded-2xl border border-slate-200 shadow-sm p-6 h-full flex flex-col justify-between relative overflow-hidden`}>
            {/* Decorative large icon */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.06]">
                <WeatherIcon className="w-32 h-32" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Napoli</span>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-white/60 ${info.color}`}>{info.label}</span>
            </div>

            {/* Main */}
            <div className="flex items-end justify-between mt-6 relative z-10">
                <div>
                    <div className="flex items-start">
                        <span className="text-5xl font-bold text-slate-900 tabular-nums">{Math.round(weather.temperature)}</span>
                        <span className="text-xl text-slate-400 font-light ml-1 mt-1">°C</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3">
                        <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                            <Wind className="w-3 h-3 text-blue-500" />
                        </div>
                        <span className="text-xs text-slate-600">
                            <span className="font-medium text-slate-800">{weather.windspeed}</span> km/h
                        </span>
                    </div>
                </div>
                <WeatherIcon className={`w-16 h-16 ${info.color} opacity-70`} />
            </div>
        </div>
    );
}
