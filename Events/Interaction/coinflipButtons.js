const { MessageFlags } = require("discord.js");
const EconomyUser = require("../../Models/EconomyUser");
const CasinoStats = require("../../Models/CasinoStats");

const BANNER = "https://i.imgur.com/e8P0MAp.png";
function panel(text, accent = 0x8A2BE2) {
    return {
        flags: MessageFlags.IsComponentsV2,
        components: [{ type: 17, accent_color: accent, components: [
            { type: 12, items: [{ media: { url: BANNER } }] },
            { type: 14, divider: true, spacing: 1 },
            { type: 10, content: text }
        ]}]
    };
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        try {
            if (!interaction.isButton() || !interaction.customId.startsWith("coinflip_")) return;

            const args = interaction.customId.split("_");
            const authorId = args[1];
            const targetId = args[2];
            const amount = parseInt(args[3]);

            if (!authorId || !targetId || isNaN(amount) || amount <= 0)
                return interaction.reply({ content: "❌ Datos inválidos.", flags: MessageFlags.Ephemeral });
            if (authorId === targetId)
                return interaction.reply({ content: "❌ No puedes apostar contigo mismo.", flags: MessageFlags.Ephemeral });
            if (interaction.user.id !== targetId)
                return interaction.reply({ content: "❌ Solo el usuario desafiado puede aceptar esta apuesta.", flags: MessageFlags.Ephemeral });

            await interaction.deferUpdate();

            const [authorData, targetData] = await Promise.all([
                EconomyUser.findOne({ guildId: interaction.guild.id, userId: authorId }),
                EconomyUser.findOne({ guildId: interaction.guild.id, userId: targetId })
            ]);

            if (!authorData || !targetData)
                return interaction.editReply(panel("## 🪙 Coinflip\n❌ Uno de los usuarios ya no tiene cuenta de economía."));
            if (authorData.wallet < amount)
                return interaction.editReply(panel("## 🪙 Coinflip\n❌ El creador ya no tiene suficiente dinero para esta apuesta."));
            if (targetData.wallet < amount)
                return interaction.editReply(panel("## 🪙 Coinflip\n❌ El usuario desafiado ya no tiene suficiente dinero para esta apuesta."));

            await interaction.editReply(panel(`## 🪙 Coinflip\n### La moneda está en el aire...\n💰 Apuesta por jugador: **${amount.toLocaleString()} monedas**\n🏆 Premio: **${(amount * 2).toLocaleString()} monedas**`));
            await new Promise(resolve => setTimeout(resolve, 3000));

            const winnerId = Math.random() < 0.5 ? authorId : targetId;
            const loserId = winnerId === authorId ? targetId : authorId;
            const winnerData = winnerId === authorId ? authorData : targetData;

            authorData.wallet -= amount;
            targetData.wallet -= amount;
            const totalPrize = amount * 2;
            winnerData.wallet += totalPrize;

            let [winnerStats, loserStats] = await Promise.all([
                CasinoStats.findOne({ guildId: interaction.guild.id, userId: winnerId }),
                CasinoStats.findOne({ guildId: interaction.guild.id, userId: loserId })
            ]);
            if (!winnerStats) winnerStats = new CasinoStats({ guildId: interaction.guild.id, userId: winnerId });
            if (!loserStats) loserStats = new CasinoStats({ guildId: interaction.guild.id, userId: loserId });

            winnerStats.totalGames += 1;
            winnerStats.totalWins += 1;
            winnerStats.moneyWon += totalPrize;
            winnerStats.currentStreak += 1;
            winnerStats.coinflipWins += 1;
            if (totalPrize > winnerStats.biggestWin) winnerStats.biggestWin = totalPrize;

            loserStats.totalGames += 1;
            loserStats.totalLosses += 1;
            loserStats.moneyLost += amount;
            loserStats.currentStreak = 0;

            await Promise.all([authorData.save(), targetData.save(), winnerStats.save(), loserStats.save()]);

            return interaction.editReply(panel(
                `## 🪙 Resultado Coinflip\n🎉 <@${winnerId}> ganó la apuesta.\n\n🏆 Premio: **${totalPrize.toLocaleString()} monedas**\n📉 Perdedor: <@${loserId}>\n\n💰 Ganancia neta del ganador: **${amount.toLocaleString()} monedas**`,
                0x57F287
            ));
        } catch (error) {
            console.log("❌ Error en coinflipButtons:", error);
        }
    }
};
