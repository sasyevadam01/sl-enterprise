import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Default: Naples, Italy (40.85, 14.26) - Adjust if needed
        fetch('https://api.open-meteo.com/v1/forecast?latitude=40.85&longitude=14.26&current_weather=true&timezone=auto')
            .then(res => res.json())
            .then(data => {
                setWeather(data.current_weather);
                setLoading(false);
            })
            .catch(err => {
                console.error("Weather fetch failed", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="h-full bg-slate-800/40 rounded-2xl animate-pulse"></div>;

    if (!weather) return null;

    // Easy icon mapping based on WMO code
    const getIcon = (code) => {
        if (code === 0) return '☀️'; // Clear sky
        if (code >= 1 && code <= 3) return '⛅'; // Partly cloudy
        if (code >= 45 && code <= 48) return '🌫️'; // Fog
        if (code >= 51 && code <= 67) return '🌧️'; // Drizzle/Rain
        if (code >= 71 && code <= 77) return '❄️'; // Snow
        if (code >= 95) return '⚡'; // Thunderstorm
        return '🌥️';
    };

    const isDay = weather.is_day === 1;

    return (
        <div className={`relative h-full overflow-hidden rounded-2xl border border-white/10 p-6 flex items-center justify-between shadow-lg ${isDay ? 'bg-gradient-to-br from-blue-600/20 to-cyan-500/20' : 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40'}`}>
            {/* Background Decor */}
            <div className="absolute -right-8 -top-8 text-9xl opacity-10 select-none">
                {getIcon(weather.weathercode)}
            </div>

            <div className="z-10">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                    📍 Meteo (Napoli)
                </h3>
                <div className="text-4xl font-bold text-white flex items-start gap-2">
                    {Math.round(weather.temperature)}
                    <span className="text-lg text-gray-400 font-normal">°C</span>
                </div>
                <p className="text-xs text-blue-200 mt-1 flex items-center gap-1">
                    🍃 Vento: {weather.windspeed} km/h
                </p>
            </div>

            <div className="z-10 text-center">
                <div className="text-6xl filter drop-shadow-lg animate-float">
                    {getIcon(weather.weathercode)}
                </div>
            </div>
        </div>
    );
}
