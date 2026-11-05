const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const EconomyUser = require("../../Models/EconomyUser");
const CasinoStats = require("../../Models/CasinoStats");
const { releaseBlackjackBet, settleBlackjackBet } = require("../../Functions/blackjackEconomy");

const BANNER = "https://i.imgur.com/joAe57D.png";
const activeGames = new Set();
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
function blackjackRow(userId, amount, playerHand, dealerHand) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`blackjack_hit_${userId}_${amount}_${playerHand.join("-")}_${dealerHand.join("-")}`)
            .setLabel("Pedir").setEmoji("➕").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`blackjack_stand_${userId}_${amount}_${playerHand.join("-")}_${dealerHand.join("-")}`)
            .setLabel("Plantarse").setEmoji("🛑").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`blackjack_cancel_${userId}_${amount}_${playerHand.join("-")}_${dealerHand.join("-")}`)
            .setLabel("Cancelar").setEmoji("↩️").setStyle(ButtonStyle.Danger)
    );
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        if (!interaction.isButton() || !interaction.customId.startsWith("blackjack_")) return;

        const parts = interaction.customId.split("_");
        const action = parts[1];
        const userId = parts[2];
        const amount = Number(parts[3]);
        const playerHand = parts[4]?.split("-") || [];
        const dealerHand = parts[5]?.split("-") || [];

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: "❌ Esta partida no es tuya.", flags: MessageFlags.Ephemeral });
        }
        if (!Number.isSafeInteger(amount) || amount <= 0 || !playerHand.length || !dealerHand.length) {
            return interaction.reply({ content: "❌ Esta partida tiene datos inválidos.", flags: MessageFlags.Ephemeral });
        }

        const gameKey = `${interaction.guild.id}:${interaction.message.id}`;
        if (activeGames.has(gameKey)) {
            return interaction.reply({ content: "⏳ Esta partida ya se está procesando.", flags: MessageFlags.Ephemeral });
        }
        activeGames.add(gameKey);

        try {
            await interaction.deferUpdate();
            const userData = await EconomyUser.findOne({ guildId: interaction.guild.id, userId });
            if (!userData) return interaction.editReply(panel("## ❌ Blackjack\nNo se encontraron tus datos económicos."));

            if (action === "cancel") {
                const refundedUser = await releaseBlackjackBet({ guildId: interaction.guild.id, userId, amount });
                return interaction.editReply(panel(
                    `## 🃏 Blackjack — Partida cancelada\n↩️ Se devolvieron **${amount.toLocaleString()} monedas**.\n👛 Wallet: **${(refundedUser?.wallet ?? userData.wallet).toLocaleString()} monedas**`,
                    null, 0xED4245
                ));
            }

            let stats = await CasinoStats.findOne({ guildId: interaction.guild.id, userId });
            if (!stats) stats = new CasinoStats({ guildId: interaction.guild.id, userId });

            if (action === "hit") {
                playerHand.push(drawCard());
                const total = calculateHand(playerHand);

                if (total > 21) {
                    stats.totalGames += 1;
                    stats.totalLosses += 1;
                    stats.moneyLost += amount;
                    stats.currentStreak = 0;
                    await stats.save();
                    return interaction.editReply(panel(
                        `## 🃏 Blackjack — ❌ Te pasaste\n### 🎴 Dealer\n**${dealerHand.join("  •  ")}**\n💯 Total: **${calculateHand(dealerHand)}**\n\n### 👤 ${interaction.user.username}\n**${playerHand.join("  •  ")}**\n💯 Total: **${total}**\n\n💸 Perdiste **${amount.toLocaleString()} monedas**\n👛 Balance: **${userData.wallet.toLocaleString()} monedas**`,
                        null, 0xED4245
                    ));
                }

                return interaction.editReply(panel(
                    `## 🃏 Blackjack\n### 🎴 Dealer\n❓  **${dealerHand[1]}**\n\n### 👤 ${interaction.user.username}\n**${playerHand.join("  •  ")}**\n💯 Total: **${total}**\n💰 Apuesta reservada: **${amount.toLocaleString()} monedas**\n👛 Wallet: **${userData.wallet.toLocaleString()} monedas**`,
                    blackjackRow(userId, amount, playerHand, dealerHand)
                ));
            }

            if (action === "stand") {
                while (calculateHand(dealerHand) < 17) dealerHand.push(drawCard());
                const playerTotal = calculateHand(playerHand);
                const dealerTotal = calculateHand(dealerHand);
                let result, accent = 0x8A2BE2, outcome;

                if (playerTotal === dealerTotal) {
                    outcome = "draw";
                    result = "🤝 **Empate**";
                    stats.totalGames += 1;
                } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
                    outcome = "win";
                    const winnings = amount * 2;
                    stats.totalGames += 1;
                    stats.totalWins += 1;
                    stats.moneyWon += winnings;
                    stats.currentStreak += 1;
                    stats.blackjackWins += 1;
                    if (winnings > stats.biggestWin) stats.biggestWin = winnings;
                    result = `🎉 Ganaste **${winnings.toLocaleString()} monedas**`;
                    accent = 0x57F287;
                } else {
                    outcome = "loss";
                    stats.totalGames += 1;
                    stats.totalLosses += 1;
                    stats.moneyLost += amount;
                    stats.currentStreak = 0;
                    result = `💸 Perdiste **${amount.toLocaleString()} monedas**`;
                    accent = 0xED4245;
                }

                const settledUser = await settleBlackjackBet({
                    guildId: interaction.guild.id, userId, amount, result: outcome
                });
                await stats.save();
                return interaction.editReply(panel(
                    `## 🃏 Blackjack — Resultado\n### 🎴 Dealer\n**${dealerHand.join("  •  ")}**\n💯 Total: **${dealerTotal}**\n\n### 👤 ${interaction.user.username}\n**${playerHand.join("  •  ")}**\n💯 Total: **${playerTotal}**\n\n${result}\n👛 Balance: **${(settledUser?.wallet ?? userData.wallet).toLocaleString()} monedas**`,
                    null, accent
                ));
            }
        } catch (error) {
            console.error("[Blackjack] Error procesando partida:", error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(panel("## ❌ Blackjack\nOcurrió un error al procesar la partida. Si tu apuesta quedó reservada, pulsa **Cancelar** para recuperarla.")).catch(() => null);
            }
        } finally {
            activeGames.delete(gameKey);
        }
    }
};
