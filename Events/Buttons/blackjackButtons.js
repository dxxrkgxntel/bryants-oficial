const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const EconomyUser = require("../../Models/EconomyUser");
const CasinoStats = require("../../Models/CasinoStats");

const BANNER = "https://i.imgur.com/e8P0MAp.png";
const cards = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
function drawCard() { return cards[Math.floor(Math.random() * cards.length)]; }
function calculateHand(hand) {
    let total = 0, aces = 0;
    for (const card of hand) {
        if (["J","Q","K"].includes(card)) total += 10;
        else if (card === "A") { total += 11; aces++; }
        else total += parseInt(card);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}
function panel(text, row = null, accent = 0x8A2BE2) {
    const components = [
        { type: 12, items: [{ media: { url: BANNER } }] },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: text }
    ];
    if (row) components.push({ type: 14, divider: true, spacing: 1 }, row.toJSON());
    return { flags: MessageFlags.IsComponentsV2, components: [{ type: 17, accent_color: accent, components }] };
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        if (!interaction.isButton() || !interaction.customId.startsWith("blackjack_")) return;

        const parts = interaction.customId.split("_");
        const action = parts[1];
        const userId = parts[2];
        const amount = parseInt(parts[3]);
        let playerHand = parts[4].split("-");
        let dealerHand = parts[5].split("-");

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: "❌ Esta partida no es tuya.", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();

        const userData = await EconomyUser.findOne({ guildId: interaction.guild.id, userId });
        if (!userData) return interaction.editReply(panel("## ❌ Blackjack\nNo se encontraron tus datos económicos."));

        let stats = await CasinoStats.findOne({ guildId: interaction.guild.id, userId });
        if (!stats) stats = new CasinoStats({ guildId: interaction.guild.id, userId });

        if (action === "hit") {
            playerHand.push(drawCard());
            const total = calculateHand(playerHand);

            if (total > 21) {
                userData.wallet -= amount;
                stats.totalGames += 1;
                stats.totalLosses += 1;
                stats.moneyLost += amount;
                stats.currentStreak = 0;
                await Promise.all([userData.save(), stats.save()]);
                return interaction.editReply(panel(
                    `## 🃏 Blackjack — ❌ Te pasaste\n### 🎴 Dealer\n**${dealerHand.join("  •  ")}**\n💯 Total: **${calculateHand(dealerHand)}**\n\n### 👤 ${interaction.user.username}\n**${playerHand.join("  •  ")}**\n💯 Total: **${total}**\n\n💸 Perdiste **${amount.toLocaleString()} monedas**\n👛 Balance: **${userData.wallet.toLocaleString()} monedas**`,
                    null, 0xED4245
                ));
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`blackjack_hit_${userId}_${amount}_${playerHand.join("-")}_${dealerHand.join("-")}`).setLabel("Pedir").setEmoji("➕").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`blackjack_stand_${userId}_${amount}_${playerHand.join("-")}_${dealerHand.join("-")}`).setLabel("Plantarse").setEmoji("🛑").setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply(panel(
                `## 🃏 Blackjack\n### 🎴 Dealer\n❓  **${dealerHand[1]}**\n\n### 👤 ${interaction.user.username}\n**${playerHand.join("  •  ")}**\n💯 Total: **${total}**\n💰 Apuesta: **${amount.toLocaleString()} monedas**`,
                row
            ));
        }

        if (action === "stand") {
            while (calculateHand(dealerHand) < 17) dealerHand.push(drawCard());
            const playerTotal = calculateHand(playerHand);
            const dealerTotal = calculateHand(dealerHand);
            let result, accent = 0x8A2BE2;

            if (playerTotal === dealerTotal) {
                result = "🤝 **Empate**";
                stats.totalGames += 1;
            } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
                const winnings = amount * 2;
                userData.wallet += amount;
                stats.totalGames += 1;
                stats.totalWins += 1;
                stats.moneyWon += winnings;
                stats.currentStreak += 1;
                stats.blackjackWins += 1;
                if (winnings > stats.biggestWin) stats.biggestWin = winnings;
                result = `🎉 Ganaste **${winnings.toLocaleString()} monedas**`;
                accent = 0x57F287;
            } else {
                userData.wallet -= amount;
                stats.totalGames += 1;
                stats.totalLosses += 1;
                stats.moneyLost += amount;
                stats.currentStreak = 0;
                result = `💸 Perdiste **${amount.toLocaleString()} monedas**`;
                accent = 0xED4245;
            }

            await Promise.all([userData.save(), stats.save()]);
            return interaction.editReply(panel(
                `## 🃏 Blackjack — Resultado\n### 🎴 Dealer\n**${dealerHand.join("  •  ")}**\n💯 Total: **${dealerTotal}**\n\n### 👤 ${interaction.user.username}\n**${playerHand.join("  •  ")}**\n💯 Total: **${playerTotal}**\n\n${result}\n👛 Balance: **${userData.wallet.toLocaleString()} monedas**`,
                null, accent
            ));
        }
    }
};
