function buildGiveawayMessage(giveaway, { ended = false } = {}) {
    const entrants = Array.isArray(giveaway.entrants) ? giveaway.entrants : [];
    const winners = Array.isArray(giveaway.winnerIds) ? giveaway.winnerIds : [];
    const description = [
        giveaway.description,
        "",
        `🎁 **Premio:** ${giveaway.prize}`,
        `🏆 **Ganadores:** ${giveaway.winnerCount}`,
        `👥 **Participantes:** ${entrants.length}`,
        ended ? (winners.length ? `🎉 **Ganador(es):** ${winners.map(id => `<@${id}>`).join(", ")}` : "No hubo participantes suficientes para seleccionar ganadores.") : `⏰ **Finaliza:** <t:${Math.floor(new Date(giveaway.endAt).getTime() / 1000)}:R>`
    ].filter(Boolean);
    return {
        embeds: [{
            color: 0x8A2BE2,
            title: ended ? "🎉 Giveaway finalizado" : "🎁 GIVEAWAY",
            description: description.join("\n"),
            footer: { text: ended ? "Bryvex Bot · Sorteo finalizado" : "Pulsa Participar para entrar en el sorteo" },
            timestamp: new Date().toISOString()
        }],
        components: ended ? [] : [{
            type: 1,
            components: [
                { type: 2, style: 3, custom_id: `giveaway_enter:${giveaway._id}`, label: "Participar", emoji: { name: "🎉" } },
                { type: 2, style: 2, custom_id: `giveaway_leave:${giveaway._id}`, label: "Salir", emoji: { name: "↩️" } }
            ]
        }],
        allowed_mentions: { parse: [], users: winners }
    };
}

module.exports = { buildGiveawayMessage };
