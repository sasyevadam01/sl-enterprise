import React, { useState, useEffect } from 'react';

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

    if (loading) return <div className="h-full master-card animate-pulse"></div>;

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

    const getCondition = (code) => {
        if (code === 0) return 'Sereno';
        if (code >= 1 && code <= 3) return 'Nuvoloso';
        if (code >= 45 && code <= 48) return 'Nebbia';
        if (code >= 51 && code <= 67) return 'Pioggia';
        if (code >= 71 && code <= 77) return 'Neve';
        if (code >= 95) return 'Temporale';
        return 'Variabile';
    };

    return (
        <div className="master-card h-full p-6 flex flex-col justify-between relative overflow-hidden">
            {/* Giant Background Icon */}
            <div className="absolute -right-6 -bottom-6 text-[10rem] opacity-[0.08] select-none pointer-events-none">
                {getIcon(weather.weathercode)}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">📍 Napoli</span>
                </div>
                <span className="text-zinc-600 text-xs">{getCondition(weather.weathercode)}</span>
            </div>

            {/* Main Content */}
            <div className="flex items-end justify-between relative z-10">
                {/* Temperature */}
                <div>
                    <div className="flex items-start">
                        <span className="text-6xl font-black neon-cyan">{Math.round(weather.temperature)}</span>
                        <span className="text-2xl text-zinc-500 font-light ml-1">°C</span>
                    </div>
                    <p className="text-zinc-500 text-sm mt-2 flex items-center gap-2">
                        <span className="text-cyan-400">🍃</span>
                        <span>Vento: <span className="text-zinc-300 font-medium">{weather.windspeed} km/h</span></span>
                    </p>
                </div>

                {/* Animated Weather Icon */}
                <div className="text-7xl animate-float icon-glow">
                    {getIcon(weather.weathercode)}
                </div>
            </div>
        </div>
    );
}
