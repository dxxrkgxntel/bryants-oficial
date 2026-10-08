const { MessageFlags } = require("discord.js");
const getUser = require("../../Utils/getUser");
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
    id: ["dados_cancel", "dados_confirm_"],

    async execute(interaction) {
        if (interaction.customId === "dados_cancel") {
            await interaction.deferUpdate();
            return interaction.editReply(panel("## 🎲 Dados\n❌ Apuesta cancelada correctamente.", 0xED4245));
        }

        if (!interaction.customId.startsWith("dados_confirm_")) return;

        const bet = Number(interaction.customId.split("_")[2]);
        await interaction.deferUpdate();

        const userData = await getUser(interaction.guild.id, interaction.user.id);
        if (userData.wallet < bet) {
            return interaction.editReply(panel(
                `## 🎲 Dados — Dinero insuficiente\n❌ Ya no tienes las **${bet.toLocaleString()} monedas** necesarias.\n👛 Wallet: **${userData.wallet.toLocaleString()} monedas**`,
                0xED4245
            ));
        }

        const userDice = Math.floor(Math.random() * 6) + 1;
        const botDice = Math.floor(Math.random() * 6) + 1;
        let result, accent = 0x8A2BE2;

        if (userDice > botDice) {
            const winnings = bet * 2;
            userData.wallet += winnings - bet;
            userData.diceWins += 1;
            result = `🎉 Ganaste **${winnings.toLocaleString()} monedas**`;
            accent = 0x57F287;
        } else if (botDice > userDice) {
            userData.wallet -= bet;
            userData.diceLosses += 1;
            result = `💸 Perdiste **${bet.toLocaleString()} monedas**`;
            accent = 0xED4245;
        } else {
            result = "🤝 **Empate** — No ganas ni pierdes monedas.";
            accent = 0xFEE75C;
        }

        await userData.save();

        return interaction.editReply(panel(
            `## 🎲 Resultado — Dados\n### 👤 Tú\n🎲 Resultado: **${userDice}**\n\n### 🤖 BF Casino\n🎲 Resultado: **${botDice}**\n\n${result}\n👛 Wallet actual: **${userData.wallet.toLocaleString()} monedas**`,
            accent
        ));
    }
};
