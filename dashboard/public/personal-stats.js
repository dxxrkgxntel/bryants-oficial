(() => {
    const host = document.querySelector("#personal-stats-content");
    const status = document.querySelector("#personal-stats-status");
    if (!host || !status) return;

    const labels = {
        messages: { title: "Mensajes", description: "Mensajes enviados y evolución reciente.", metric: "Mensajes enviados" },
        voice: { title: "Voz", description: "Tiempo acumulado en canales de voz.", metric: "Tiempo en voz" },
        reactions: { title: "Reacciones", description: "Reacciones que has dado y recibido.", metric: "Reacciones dadas" },
        activity: { title: "Actividad", description: "Tiempo registrado según tu estado de Discord.", metric: "Tiempo registrado" },
        gaming: { title: "Juegos", description: "Tiempo detectado en actividades de juego visibles en Discord.", metric: "Tiempo jugando" },
        channels: { title: "Canales", description: "Canales donde más mensajes has enviado.", metric: "Mensajes enviados" }
    };
    let data = null;
    let activeTab = "messages";

    function number(value) {
        return (Number(value) || 0).toLocaleString("es");
    }

    function duration(value) {
        const seconds = Math.max(0, Math.floor(Number(value) || 0));
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days) return `${days} d ${hours} h`;
        if (hours) return `${hours} h ${minutes} min`;
        return `${minutes} min`;
    }

    function escapeText(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
    }

    function entries(object) {
        if (object instanceof Map) return [...object.entries()];
        if (Array.isArray(object)) return object;
        return Object.entries(object || {});
    }

    function makeMetric(label, value, note = "") {
        return `<article class="personal-stats-metric"><span>${escapeText(label)}</span><strong>${escapeText(value)}</strong>${note ? `<small>${escapeText(note)}</small>` : ""}</article>`;
    }

    function makeBars(items, formatter = number) {
        if (!items.length) return '<div class="personal-stats-empty">Todavía no hay datos para mostrar en este apartado.</div>';
        const max = Math.max(1, ...items.map(item => Number(item.value) || 0));
        return `<div class="personal-stats-bars">${items.map(item => {
            const value = Math.max(0, Number(item.value) || 0);
            const width = Math.max(value > 0 ? 3 : 0, Math.min(100, value / max * 100));
            return `<div class="personal-stats-bar-row"><div class="personal-stats-bar-label"><span>${escapeText(item.label)}</span><strong>${escapeText(formatter(value))}</strong></div><div class="personal-stats-bar-track"><span style="width:${width}%"></span></div></div>`;
        }).join("")}</div>`;
    }

    function dailyItems(field) {
        return (data.daily || []).slice(-7).map(day => ({
            label: new Date(`${day.day}T00:00:00`).toLocaleDateString("es", { day: "2-digit", month: "short" }),
            value: day[field] || 0
        }));
    }

    function render() {
        if (!data) return;
        const totals = data.totals || {};
        const title = labels[activeTab];
        let html = `<div class="personal-stats-intro"><div><h3>${title.title}</h3><p>${title.description}</p></div><span class="personal-stats-period">Últimos 30 días</span></div>`;

        if (activeTab === "messages") {
            html += `<div class="personal-stats-metrics">${makeMetric("Mensajes enviados", number(totals.messages))}${makeMetric("Canales utilizados", number(entries(totals.channelMessages).length))}</div><h4>Mensajes por día · últimos 7 días</h4>${makeBars(dailyItems("messages"))}`;
        } else if (activeTab === "voice") {
            html += `<div class="personal-stats-metrics">${makeMetric("Tiempo total en voz", duration(totals.voiceSeconds), "Se registra al salir del canal")}${makeMetric("Minutos acumulados", number(Math.floor((totals.voiceSeconds || 0) / 60)))}</div><h4>Tiempo en voz por día · últimos 7 días</h4>${makeBars(dailyItems("voiceSeconds"), duration)}`;
        } else if (activeTab === "reactions") {
            html += `<div class="personal-stats-metrics">${makeMetric("Reacciones dadas", number(totals.reactionsGiven))}${makeMetric("Reacciones recibidas", number(totals.reactionsReceived))}</div><h4>Reacciones dadas por día · últimos 7 días</h4>${makeBars(dailyItems("reactionsGiven"))}`;
        } else if (activeTab === "activity") {
            const activities = entries(totals.activitySeconds).map(([name, value]) => ({ label: ({ online: "En línea", idle: "Ausente", dnd: "No molestar", offline: "Desconectado" })[name] || name, value })).sort((a, b) => b.value - a.value);
            html += `<div class="personal-stats-metrics">${makeMetric("Tiempo registrado", duration(activities.reduce((sum, item) => sum + Number(item.value || 0), 0)))}${makeMetric("Estados detectados", number(activities.length))}</div><h4>Tiempo por estado</h4>${makeBars(activities, duration)}`;
        } else if (activeTab === "gaming") {
            const games = entries(totals.gamingSeconds).map(([name, value]) => ({ label: name.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()), value })).sort((a, b) => b.value - a.value).slice(0, 10);
            html += `<div class="personal-stats-metrics">${makeMetric("Tiempo jugando", duration(games.reduce((sum, item) => sum + Number(item.value || 0), 0)))}${makeMetric("Juegos detectados", number(games.length))}</div><h4>Juegos con más tiempo</h4>${makeBars(games, duration)}`;
        } else if (activeTab === "channels") {
            const channels = entries(totals.channelMessages).map(([name, value]) => ({ label: name.startsWith("canal-") ? name : `#${name.replace(/-/g, "-")}`, value })).sort((a, b) => b.value - a.value).slice(0, 12);
            html += `<div class="personal-stats-metrics">${makeMetric("Canales utilizados", number(channels.length))}${makeMetric("Mensajes registrados", number(totals.messages))}</div><h4>Canales más activos</h4>${makeBars(channels)}`;
        }

        host.innerHTML = html;
        status.textContent = data.trackingStarted
            ? "Datos agregados de los servidores donde está Bryvex Bot."
            : "Aún no hay actividad registrada. Los datos aparecerán cuando uses el bot en un servidor.";
    }

    async function load() {
        const button = document.querySelector("#personal-stats-refresh");
        if (button) button.disabled = true;
        status.textContent = "Cargando tus estadísticas…";
        try {
            const response = await fetch("/api/account/personal-stats", { credentials: "same-origin", cache: "no-store" });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "No se pudieron cargar las estadísticas.");
            data = result;
            render();
        } catch (error) {
            status.textContent = error.message;
            host.innerHTML = "";
        } finally {
            if (button) button.disabled = false;
        }
    }

    document.querySelectorAll("[data-stats-tab]").forEach(button => {
        button.addEventListener("click", () => {
            activeTab = button.dataset.statsTab;
            document.querySelectorAll("[data-stats-tab]").forEach(tab => {
                const selected = tab === button;
                tab.classList.toggle("active", selected);
                tab.setAttribute("aria-selected", String(selected));
            });
            render();
        });
    });
    document.querySelector("#personal-stats-refresh")?.addEventListener("click", load);
    load();
})();
