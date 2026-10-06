const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const EconomyUser = require("../../Models/EconomyUser");
const CasinoStats = require("../../Models/CasinoStats");
const getUser = require("../../Utils/getUser");
const getConfig = require("../../Utils/getConfig");

const activeBets = new Set();
const activeGambles = new Set();

const cards = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const slots = ["🍒","🍋","🍉","💎","👑","⭐"];
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

async function run_blackjack(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger("cantidad");
    const userData = await EconomyUser.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id
    });

    if (!userData) {
        return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [{
                type: 17,
                accent_color: 0x8A2BE2,
                components: [
                    { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
                    { type: 10, content: "## ❌ Blackjack\nNo tienes datos económicos." }
                ]
            }]
        });
    }

    if (userData.wallet < amount) {
        return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [{
                type: 17,
                accent_color: 0x8A2BE2,
                components: [
                    { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
                    { type: 10, content: `## ❌ Dinero insuficiente\nNecesitas **${amount.toLocaleString()} monedas** y tienes **${userData.wallet.toLocaleString()}** en tu wallet.` }
                ]
            }]
        });
    }

    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];
    const playerTotal = calculateHand(playerHand);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`blackjack_hit_${interaction.user.id}_${amount}_${playerHand.join("-")}_${dealerHand.join("-")}`)
            .setLabel("Pedir")
            .setEmoji("➕")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`blackjack_stand_${interaction.user.id}_${amount}_${playerHand.join("-")}_${dealerHand.join("-")}`)
            .setLabel("Plantarse")
            .setEmoji("🛑")
            .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: 0x8A2BE2,
            components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
                { type: 10, content: `## 🃏 Blackjack\n### 🎴 Dealer\n❓  **${dealerHand[1]}**\n\n### 👤 ${interaction.user.username}\n**${playerHand.join("  •  ")}**\n\n💯 Total: **${playerTotal}**\n💰 Apuesta: **${amount.toLocaleString()} monedas**\n👛 Wallet: **${userData.wallet.toLocaleString()} monedas**` },
                { type: 14, divider: true, spacing: 1 },
                row.toJSON()
            ]
        }]
    });
}

async function run_stats(interaction) {
    await interaction.deferReply();
    const target = interaction.user;
    const data = await CasinoStats.findOne({ guildId: interaction.guild.id, userId: target.id });

    if (!data) {
        return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [{ type: 17, accent_color: 0x8A2BE2, components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
                { type: 10, content: "## 🎰 Estadísticas del Casino\n❌ Todavía no tienes estadísticas registradas en BF Casino." }
            ]}]
        });
    }

    for (const key of ["totalGames","totalWins","totalLosses","moneyWon","moneyLost","jackpots","currentStreak","biggestWin","slotsWins","rouletteWins","gambleWins","coinflipWins","blackjackWins"]) data[key] ??= 0;
    const winrate = data.totalGames > 0 ? ((data.totalWins / data.totalGames) * 100).toFixed(1) : "0.0";

    return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [{ type: 17, accent_color: 0x8A2BE2, components: [
            { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
            { type: 10, content: `## 🎰 Estadísticas de BF Casino\n### 👤 ${target.username}\n\n🎉 Victorias: **${data.totalWins.toLocaleString()}**\n💥 Derrotas: **${data.totalLosses.toLocaleString()}**\n📈 Winrate: **${winrate}%**\n🎲 Partidas: **${data.totalGames.toLocaleString()}**` },
            { type: 14, divider: true, spacing: 1 },
            { type: 10, content: `### 💰 Rendimiento\n💵 Dinero ganado: **${data.moneyWon.toLocaleString()}**\n💸 Dinero perdido: **${data.moneyLost.toLocaleString()}**\n💎 Mayor victoria: **${data.biggestWin.toLocaleString()} monedas**\n🌟 Jackpots: **${data.jackpots.toLocaleString()}**\n🔥 Racha actual: **${data.currentStreak.toLocaleString()}**` },
            { type: 14, divider: true, spacing: 1 },
            { type: 10, content: `### 🎮 Victorias por juego\n🎰 Slots: **${data.slotsWins.toLocaleString()}**\n🎡 Ruleta: **${data.rouletteWins.toLocaleString()}**\n🎲 Gamble: **${data.gambleWins.toLocaleString()}**\n🪙 Coinflip: **${data.coinflipWins.toLocaleString()}**\n🃏 Blackjack: **${data.blackjackWins.toLocaleString()}**` }
        ]}]
    });
}

async function run_coinflip(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("usuario");
    const amount = interaction.options.getInteger("cantidad");

    const errorPanel = (message) => ({
        flags: MessageFlags.IsComponentsV2,
        components: [{ type: 17, accent_color: 0x8A2BE2, components: [
            { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
            { type: 10, content: `## 🪙 Coinflip\n❌ ${message}` }
        ]}]
    });

    if (target.bot || target.id === interaction.user.id)
        return interaction.editReply(errorPanel("Debes desafiar a otro usuario que no sea un bot."));

    const [authorData, targetData] = await Promise.all([
        EconomyUser.findOne({ guildId: interaction.guild.id, userId: interaction.user.id }),
        EconomyUser.findOne({ guildId: interaction.guild.id, userId: target.id })
    ]);

    if (!authorData || authorData.wallet < amount)
        return interaction.editReply(errorPanel("No tienes suficiente dinero para realizar esta apuesta."));

    if (!targetData || targetData.wallet < amount)
        return interaction.editReply(errorPanel("El usuario desafiado no tiene suficiente dinero para aceptar la apuesta."));

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`coinflip_${interaction.user.id}_${target.id}_${amount}`)
            .setLabel("Aceptar apuesta")
            .setEmoji("🪙")
            .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [{ type: 17, accent_color: 0x8A2BE2, components: [
            { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
            { type: 10, content: `## 🪙 Desafío Coinflip\n🎰 <@${interaction.user.id}> desafió a <@${target.id}>.\n\n💰 Apuesta por jugador: **${amount.toLocaleString()} monedas**\n🏆 Premio total: **${(amount * 2).toLocaleString()} monedas**\n\n<@${target.id}>, pulsa **Aceptar apuesta** para jugar.` },
            { type: 14, divider: true, spacing: 1 },
            row.toJSON()
        ]}]
    });
}

async function run_dados(interaction) {
    await interaction.deferReply();
    const bet = interaction.options.getInteger("apuesta");
    const userData = await getUser(interaction.guild.id, interaction.user.id);

    if (userData.wallet < bet) {
        return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [{ type: 17, accent_color: 0xED4245, components: [
                { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
                { type: 10, content: `## 🎲 Dados — Dinero insuficiente\n❌ Necesitas **${bet.toLocaleString()} monedas** y tienes **${userData.wallet.toLocaleString()}** en tu wallet.` }
            ]}]
        });
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`dados_confirm_${bet}`).setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("dados_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [{ type: 17, accent_color: 0x8A2BE2, components: [
            { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
            { type: 10, content: `## 🎲 Confirmar apuesta\n💰 Apuesta: **${bet.toLocaleString()} monedas**\n👛 Wallet actual: **${userData.wallet.toLocaleString()} monedas**\n\n❓ ¿Quieres lanzar los dados?` },
            { type: 14, divider: true, spacing: 1 },
            row.toJSON()
        ]}]
    });
}

function gamblePanel(text, row = null, accent = 0x8A2BE2) {
    const components = [
        { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
        { type: 10, content: text }
    ];
    if (row) components.push({ type: 14, divider: true, spacing: 1 }, row.toJSON());
    return { flags: MessageFlags.IsComponentsV2, components: [{ type: 17, accent_color: accent, components }] };
}

async function run_gamble(interaction) {

        //////////////////////////////////////////////////
        // EVITAR MULTIPLES APUESTAS
        //////////////////////////////////////////////////

        if (

            activeGambles.has(
                interaction.user.id
            )

        ) {

            return interaction.reply({ content: "❌ Ya tienes una apuesta en progreso.", flags: MessageFlags.Ephemeral });
        }

        //////////////////////////////////////////////////

        activeGambles.add(interaction.user.id);

        try {
            await interaction.deferReply();

            //////////////////////////////////////////////////
            // AMOUNT
            //////////////////////////////////////////////////

            const amount =
                interaction.options.getInteger(
                    "cantidad"
                );

            //////////////////////////////////////////////////
            // USER
            //////////////////////////////////////////////////

            const user =
                await getUser(

                    interaction.guild.id,
                    interaction.user.id
                );

            //////////////////////////////////////////////////
            // CONFIG
            //////////////////////////////////////////////////

            const config =
                await getConfig(
                    interaction.guild.id
                );

            if (!config) {

                activeGambles.delete(
                    interaction.user.id
                );

                return interaction.editReply(gamblePanel("## 🎰 Gamble\n❌ La economía no está configurada en este servidor."));
            }

            //////////////////////////////////////////////////
            // TIME
            //////////////////////////////////////////////////

            const now =
                Date.now();

            //////////////////////////////////////////////////
            // COOLDOWN
            //////////////////////////////////////////////////

            const cooldown =
                30000;

            //////////////////////////////////////////////////

            if (
                now - user.lastGamble < cooldown
            ) {

                const remaining =

                    Math.ceil(

                        (
                            cooldown -
                            (
                                now -
                                user.lastGamble
                            )
                        ) / 1000
                    );

                activeGambles.delete(
                    interaction.user.id
                );

                return interaction.editReply(gamblePanel(`## 🎰 Gamble — Cooldown\n⏳ Espera **${remaining}s** antes de volver a apostar.`));
            }

            //////////////////////////////////////////////////
            // VALIDAR DINERO
            //////////////////////////////////////////////////

            if (
                amount > user.wallet
            ) {

                activeGambles.delete(
                    interaction.user.id
                );

                return interaction.editReply(gamblePanel("## 🎰 Gamble\n❌ No tienes suficiente dinero."));
            }

            //////////////////////////////////////////////////
            // VALIDAR LIMITES
            //////////////////////////////////////////////////

            if (

                amount < config.gambleMin ||

                amount > config.gambleMax

            ) {

                activeGambles.delete(
                    interaction.user.id
                );

                return interaction.editReply(gamblePanel(`## 🎰 Gamble — Límites\n❌ La apuesta debe estar entre **${config.gambleMin.toLocaleString()}** y **${config.gambleMax.toLocaleString()} monedas**.`));
            }

            //////////////////////////////////////////////////
            // EMBED CONFIRMACION
            //////////////////////////////////////////////////

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("gamble_confirm").setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("gamble_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
            );

            //////////////////////////////////////////////////

            await interaction.editReply(gamblePanel(`## 🎰 Confirmar apuesta\n💸 Vas a apostar: **${amount.toLocaleString()} monedas**\n👛 Wallet actual: **${user.wallet.toLocaleString()} monedas**\n\n❓ ¿Quieres continuar?`, row));

            //////////////////////////////////////////////////
            // ESPERAR BOTON
            //////////////////////////////////////////////////

            const message =
                await interaction.fetchReply();

            const response =

                await message.awaitMessageComponent({

                    filter: i =>

                        i.user.id === interaction.user.id,

                    time: 30000
                }).catch(() => null);

            //////////////////////////////////////////////////
            // TIMEOUT
            //////////////////////////////////////////////////

            if (!response) {

                activeGambles.delete(
                    interaction.user.id
                );

                return interaction.editReply(gamblePanel("## 🎰 Gamble\n⌛ La apuesta expiró. No se descontaron monedas."));
            }

            //////////////////////////////////////////////////
            // CANCELAR
            //////////////////////////////////////////////////

            if (

                response.customId ===
                "gamble_cancel"

            ) {

                activeGambles.delete(
                    interaction.user.id
                );

                await response.deferUpdate();
                return interaction.editReply(gamblePanel("## 🎰 Gamble\n❌ Apuesta cancelada.", null, 0xED4245));
            }

            //////////////////////////////////////////////////
            // RESPONDER BOTON RAPIDO
            //////////////////////////////////////////////////

            await response.deferUpdate();

            //////////////////////////////////////////////////
            // GIRANDO
            //////////////////////////////////////////////////

            await interaction.editReply(gamblePanel(`## 🎰 BF Casino\n### 🎲 Decidiendo tu suerte...\n💸 Apostando **${amount.toLocaleString()} monedas**\n🍀 La suerte está siendo decidida...`));

            //////////////////////////////////////////////////
            // DELAY
            //////////////////////////////////////////////////

            await new Promise(resolve =>

                setTimeout(resolve, 2500)
            );

            //////////////////////////////////////////////////
            // USER FRESCO
            //////////////////////////////////////////////////

            const freshUser =
                await getUser(

                    interaction.guild.id,
                    interaction.user.id
                );

            //////////////////////////////////////////////////
            // CASINO STATS
            //////////////////////////////////////////////////

            let stats =

                await CasinoStats.findOne({

                    guildId:
                        interaction.guild.id,

                    userId:
                        interaction.user.id
                });

            //////////////////////////////////////////////////

            if (!stats) {

                stats =
                    await CasinoStats.create({

                        guildId:
                            interaction.guild.id,

                        userId:
                            interaction.user.id
                    });
            }

            //////////////////////////////////////////////////
            // VALIDAR OTRA VEZ
            //////////////////////////////////////////////////

            if (
                freshUser.wallet < amount
            ) {

                activeGambles.delete(
                    interaction.user.id
                );

                return interaction.editReply(gamblePanel("## 🎰 Gamble\n❌ Ya no tienes suficiente dinero para completar la apuesta.", null, 0xED4245));
            }

            //////////////////////////////////////////////////
            // RESULTADO
            //////////////////////////////////////////////////

            const win =
                Math.random() < 0.5;

            //////////////////////////////////////////////////

            freshUser.lastGamble =
                now;

            //////////////////////////////////////////////////
            // GANAR
            //////////////////////////////////////////////////

            if (win) {

                //////////////////////////////////////////////////
                // MULTIPLIERS
                //////////////////////////////////////////////////

                const rewards = [

                    {
                        multiplier: 1.2,
                        chance: 40
                    },

                    {
                        multiplier: 1.5,
                        chance: 30
                    },

                    {
                        multiplier: 1.8,
                        chance: 18
                    },

                    {
                        multiplier: 2,
                        chance: 10
                    },

                    {
                        multiplier: 3,
                        chance: 2
                    }
                ];

                //////////////////////////////////////////////////

                const random =
                    Math.random() * 100;

                //////////////////////////////////////////////////

                let cumulative =
                    0;

                //////////////////////////////////////////////////

                let multiplier =
                    1.2;

                //////////////////////////////////////////////////

                for (const reward of rewards) {

                    cumulative +=
                        reward.chance;

                    if (
                        random <= cumulative
                    ) {

                        multiplier =
                            reward.multiplier;

                        break;
                    }
                }

                //////////////////////////////////////////////////
                // JACKPOT
                //////////////////////////////////////////////////

                let jackpot =
                    false;

                //////////////////////////////////////////////////

                let jackpotMultiplier =
                    multiplier;

                //////////////////////////////////////////////////

                const jackpotChance =
                    Math.random() * 100;

                //////////////////////////////////////////////////

                if (
                    jackpotChance <= 0.2
                ) {

                    jackpot = true;

                    jackpotMultiplier = 20;

                } else if (
                    jackpotChance <= 1
                ) {

                    jackpot = true;

                    jackpotMultiplier = 10;
                }

                //////////////////////////////////////////////////
                // GANANCIA
                //////////////////////////////////////////////////

                const winnings =

                    Math.floor(
                        amount *
                        jackpotMultiplier
                    );

                //////////////////////////////////////////////////

                freshUser.wallet +=
                    winnings;

                //////////////////////////////////////////////////
                // STATS USER
                //////////////////////////////////////////////////

                freshUser.gamblesWon += 1;

                freshUser.gambleStreak += 1;

                //////////////////////////////////////////////////
                // GLOBAL STATS
                //////////////////////////////////////////////////

                stats.totalGames += 1;

                stats.totalWins += 1;

                stats.moneyWon += winnings;

                stats.currentStreak += 1;

                stats.gambleWins += 1;

                //////////////////////////////////////////////////

                if (

                    winnings >
                    freshUser.biggestWin

                ) {

                    freshUser.biggestWin =
                        winnings;
                }

                //////////////////////////////////////////////////

                if (

                    winnings >
                    stats.biggestWin

                ) {

                    stats.biggestWin =
                        winnings;
                }

                //////////////////////////////////////////////////

                if (jackpot) {

                    freshUser.jackpots += 1;

                    stats.jackpots += 1;
                }

                //////////////////////////////////////////////////

                await freshUser.save();

                await stats.save();

                //////////////////////////////////////////////////
                // EMBED
                //////////////////////////////////////////////////

                return interaction.editReply(gamblePanel(
                    jackpot
                        ? `## 🌟 JACKPOT — BF Casino\n💸 Apostaste **${amount.toLocaleString()} monedas**\n💎 Multiplicador: **x${jackpotMultiplier}**\n💰 Ganaste **${winnings.toLocaleString()} monedas**\n👛 Balance actual: **${freshUser.wallet.toLocaleString()} monedas**`
                        : `## 🎰 Apuesta ganada\n💸 Apostaste **${amount.toLocaleString()} monedas**\n💎 Multiplicador: **x${jackpotMultiplier}**\n💰 Ganaste **${winnings.toLocaleString()} monedas**\n👛 Balance actual: **${freshUser.wallet.toLocaleString()} monedas**`,
                    null, jackpot ? 0xFEE75C : 0x57F287
                ));
            }

            //////////////////////////////////////////////////
            // PERDER
            //////////////////////////////////////////////////

            else {

                //////////////////////////////////////////////////

                freshUser.wallet -=
                    amount;

                //////////////////////////////////////////////////

                freshUser.gamblesLost += 1;

                freshUser.gambleStreak = 0;

                //////////////////////////////////////////////////
                // GLOBAL STATS
                //////////////////////////////////////////////////

                stats.totalGames += 1;

                stats.totalLosses += 1;

                stats.moneyLost += amount;

                stats.currentStreak = 0;

                //////////////////////////////////////////////////

                await freshUser.save();

                await stats.save();

                //////////////////////////////////////////////////

                return interaction.editReply(gamblePanel(`## 💥 Apuesta perdida\n💸 Apostaste **${amount.toLocaleString()} monedas**\n📉 Perdiste **${amount.toLocaleString()} monedas**\n👛 Balance actual: **${freshUser.wallet.toLocaleString()} monedas**`, null, 0xED4245));
            }

        } catch (err) {

            console.log(err);

            activeGambles.delete(
                interaction.user.id
            );

            return interaction.editReply(gamblePanel("## 🎰 Gamble\n❌ Ocurrió un error en el sistema de apuestas.", null, 0xED4245)).catch(() => {});
        }
    
}

async function run_ruleta(interaction) {
    await interaction.deferReply();

    const type = interaction.options.getString("tipo");
    const bet = interaction.options.getString("apuesta").toLowerCase().trim();
    const amount = interaction.options.getInteger("cantidad");

    const panel = (text, row = null, accent = 0x8A2BE2) => {
        const components = [
            { type: 12, items: [{ media: { url: "https://i.imgur.com/e8P0MAp.png" } }] },
            { type: 10, content: text }
        ];
        if (row) components.push({ type: 14, divider: true, spacing: 1 }, row.toJSON());
        return { flags: MessageFlags.IsComponentsV2, components: [{ type: 17, accent_color: accent, components }] };
    };

    if (type === "color" && !["rojo", "negro", "verde"].includes(bet))
        return interaction.editReply(panel("## 🎡 Ruleta\n❌ Para una apuesta de color utiliza **rojo**, **negro** o **verde**.", null, 0xED4245));

    if (type === "numero" && (!/^\d+$/.test(bet) || Number(bet) < 0 || Number(bet) > 36))
        return interaction.editReply(panel("## 🎡 Ruleta\n❌ El número debe estar entre **0 y 36**.", null, 0xED4245));

    const [userData, foundStats] = await Promise.all([
        EconomyUser.findOne({ guildId: interaction.guild.id, userId: interaction.user.id }),
        CasinoStats.findOne({ guildId: interaction.guild.id, userId: interaction.user.id })
    ]);

    if (!userData)
        return interaction.editReply(panel("## 🎡 Ruleta\n❌ No tienes datos económicos.", null, 0xED4245));
    if (userData.wallet < amount)
        return interaction.editReply(panel(`## 🎡 Ruleta — Dinero insuficiente\n❌ Necesitas **${amount.toLocaleString()} monedas** y tienes **${userData.wallet.toLocaleString()}**.`, null, 0xED4245));

    const stats = foundStats || new CasinoStats({ guildId: interaction.guild.id, userId: interaction.user.id });
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("roulette_confirm").setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("roulette_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply(panel(
        `## 🎡 Confirmar apuesta\n🎲 Tipo: **${type === "numero" ? "Número" : "Color"}**\n📌 Apuesta: **${bet}**\n💰 Cantidad: **${amount.toLocaleString()} monedas**\n👛 Wallet: **${userData.wallet.toLocaleString()} monedas**\n\n❓ ¿Deseas girar la ruleta?`,
        row
    ));

    const message = await interaction.fetchReply();
    const response = await message.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 30000
    }).catch(() => null);

    if (!response)
        return interaction.editReply(panel("## 🎡 Ruleta\n⌛ La apuesta expiró. No se descontaron monedas."));

    if (response.customId === "roulette_cancel") {
        await response.deferUpdate();
        return interaction.editReply(panel("## 🎡 Ruleta\n❌ Apuesta cancelada.", null, 0xED4245));
    }

    await response.deferUpdate();
    await interaction.editReply(panel(`## 🎡 BF Roulette\n### 🎲 Girando la ruleta...\n💰 Apostando **${amount.toLocaleString()} monedas**\n🍀 Buena suerte.`));
    await new Promise(resolve => setTimeout(resolve, 3000));

    const freshUser = await EconomyUser.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
    if (!freshUser || freshUser.wallet < amount)
        return interaction.editReply(panel("## 🎡 Ruleta\n❌ Ya no tienes suficiente dinero para completar esta apuesta.", null, 0xED4245));

    const rolledNumber = Math.floor(Math.random() * 37);
    let rolledColor = "negro";
    if (rolledNumber === 0) rolledColor = "verde";
    else if (redNumbers.includes(rolledNumber)) rolledColor = "rojo";

    let won = false, multiplier = 0;
    if (type === "color" && bet === rolledColor) {
        won = true;
        multiplier = bet === "verde" ? 14 : 2;
    } else if (type === "numero" && Number(bet) === rolledNumber) {
        won = true;
        multiplier = 35;
    }

    let winnings = 0;
    if (won) {
        winnings = amount * multiplier;
        freshUser.wallet += winnings - amount;
        stats.totalGames += 1;
        stats.totalWins += 1;
        stats.moneyWon += winnings;
        stats.currentStreak += 1;
        stats.rouletteWins += 1;
        if (winnings > stats.biggestWin) stats.biggestWin = winnings;
        if (multiplier >= 14) stats.jackpots += 1;
    } else {
        freshUser.wallet -= amount;
        stats.totalGames += 1;
        stats.totalLosses += 1;
        stats.moneyLost += amount;
        stats.currentStreak = 0;
    }

    await Promise.all([freshUser.save(), stats.save()]);
    const colorEmoji = rolledColor === "rojo" ? "🔴" : rolledColor === "negro" ? "⚫" : "🟢";

    return interaction.editReply(panel(
        `## 🎡 Resultado — BF Roulette\n# ${colorEmoji} ${rolledColor.toUpperCase()} ${rolledNumber}\n\n🎯 Tu apuesta: **${bet}**\n💰 Cantidad: **${amount.toLocaleString()} monedas**\n\n${won ? `🎉 Ganaste **${winnings.toLocaleString()} monedas** — multiplicador **x${multiplier}**` : `💸 Perdiste **${amount.toLocaleString()} monedas**`}\n👛 Balance actual: **${freshUser.wallet.toLocaleString()} monedas**`,
        null,
        won ? 0x57F287 : 0xED4245
    ));
}

async function run_slots(interaction) {

        //////////////////////////////////////////////////
        // AMOUNT
        //////////////////////////////////////////////////

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

        //////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////

        const userData =

            await EconomyUser.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    interaction.user.id
            });

        //////////////////////////////////////////////////

        if (!userData) {

            return interaction.reply({

                content:
                    "❌ No tienes datos económicos.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // CASINO STATS
        //////////////////////////////////////////////////

        let stats =

            await CasinoStats.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    interaction.user.id
            });

        //////////////////////////////////////////////////

        if (!stats) {

            stats =
                await CasinoStats.create({

                    guildId:
                        interaction.guild.id,

                    userId:
                        interaction.user.id
                });
        }

        //////////////////////////////////////////////////
        // DINERO
        //////////////////////////////////////////////////

        if (
            userData.wallet < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // CONFIRM EMBED
        //////////////////////////////////////////////////

        const confirmEmbed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🎰 Confirmar apuesta"
                )

                .setDescription(

                    `💸 Vas a apostar:\n` +
                    `> **${amount.toLocaleString()} monedas**\n\n` +

                    `👛 Tu wallet actual es:\n` +
                    `> **${userData.wallet.toLocaleString()} monedas**\n\n` +

                    `❓ ¿Deseas girar las tragamonedas?`
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        "Bryant's Casino"
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // BUTTONS
        //////////////////////////////////////////////////

        const row =

            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            "slots_confirm"
                        )

                        .setLabel(
                            "Confirmar"
                        )

                        .setEmoji("✅")

                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            "slots_cancel"
                        )

                        .setLabel(
                            "Cancelar"
                        )

                        .setEmoji("❌")

                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [confirmEmbed],

            components: [row]
        });

        //////////////////////////////////////////////////
        // MESSAGE
        //////////////////////////////////////////////////

        const message =
            await interaction.fetchReply();

        //////////////////////////////////////////////////
        // BUTTON RESPONSE
        //////////////////////////////////////////////////

        const response =

            await message.awaitMessageComponent({

                filter: i =>

                    i.user.id === interaction.user.id,

                time: 30000
            }).catch(() => null);

        //////////////////////////////////////////////////
        // TIMEOUT
        //////////////////////////////////////////////////

        if (!response) {

            return interaction.editReply({

                content:
                    "⌛ La apuesta expiró.",

                embeds: [],

                components: []
            });
        }

        //////////////////////////////////////////////////
        // CANCEL
        //////////////////////////////////////////////////

        if (

            response.customId ===
            "slots_cancel"

        ) {

            return response.update({

                content:
                    "❌ Apuesta cancelada.",

                embeds: [],

                components: []
            });
        }

        //////////////////////////////////////////////////
        // DEFER BUTTON
        //////////////////////////////////////////////////

        await response.deferUpdate();

        //////////////////////////////////////////////////
        // GRID 3x3
        //////////////////////////////////////////////////

        const grid = [];

        for (let row = 0; row < 3; row++) {

            const currentRow = [];

            for (let col = 0; col < 3; col++) {

                currentRow.push(

                    slots[
                        Math.floor(
                            Math.random() * slots.length
                        )
                    ]
                );
            }

            grid.push(currentRow);
        }

        //////////////////////////////////////////////////
        // DISPLAY
        //////////////////////////////////////////////////

        const generateDisplay = (data) => {

            return data.map((row, index) => {

                if (index === 1) {

                    return `${row.join(" │ ")} <`;
                }

                return `${row.join(" │ ")}`;

            }).join("\n");
        };

        //////////////////////////////////////////////////
        // ANIMACION
        //////////////////////////////////////////////////

        await interaction.editReply({

            embeds: [

                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🎰 Bryant's Casino"
                    )

                    .setDescription(

                        `## 🎲 Girando tragamonedas...\n\n` +

                        `❔ │ ❔ │ ❔\n` +
                        `❔ │ ❔ │ ❔ <\n` +
                        `❔ │ ❔ │ ❔`
                    )
            ],

            components: []
        });

        //////////////////////////////////////////////////
        // DELAY
        //////////////////////////////////////////////////

        await new Promise(resolve =>

            setTimeout(resolve, 2500)
        );

        //////////////////////////////////////////////////
        // LINEA VALIDA
        //////////////////////////////////////////////////

        const middleLine = grid[1];

        //////////////////////////////////////////////////
        // RESULTADO
        //////////////////////////////////////////////////

        let multiplier = 0;

        let resultText =
            "💸 Has perdido.";

        //////////////////////////////////////////////////
        // JACKPOT
        //////////////////////////////////////////////////

        if (

            middleLine[0] === "👑" &&
            middleLine[1] === "👑" &&
            middleLine[2] === "👑"

        ) {

            multiplier = 15;

            resultText =
                "👑 JACKPOT x15";

            stats.jackpots += 1;
        }

        //////////////////////////////////////////////////
        // TRIPLE
        //////////////////////////////////////////////////

        else if (

            middleLine[0] === middleLine[1] &&
            middleLine[1] === middleLine[2]

        ) {

            multiplier = 5;

            resultText =
                "💎 Triple combinación x5";
        }

        //////////////////////////////////////////////////
        // DOBLE
        //////////////////////////////////////////////////

        else if (

            middleLine[0] === middleLine[1] ||

            middleLine[1] === middleLine[2] ||

            middleLine[0] === middleLine[2]

        ) {

            multiplier = 2;

            resultText =
                "✨ Doble combinación x2";
        }

        //////////////////////////////////////////////////
        // CALCULAR
        //////////////////////////////////////////////////

        let winnings = 0;

        if (multiplier > 0) {

            winnings =
                amount * multiplier;

            const profit =
                winnings - amount;

            userData.wallet +=
                profit;

            //////////////////////////////////////////////////
            // STATS
            //////////////////////////////////////////////////

            stats.totalGames += 1;

            stats.totalWins += 1;

            stats.moneyWon += winnings;

            stats.currentStreak += 1;

            stats.slotsWins += 1;

            //////////////////////////////////////////////////

            if (winnings > stats.biggestWin) {

                stats.biggestWin =
                    winnings;
            }

        } else {

            userData.wallet -=
                amount;

            //////////////////////////////////////////////////
            // STATS
            //////////////////////////////////////////////////

            stats.totalGames += 1;

            stats.totalLosses += 1;

            stats.moneyLost += amount;

            stats.currentStreak = 0;
        }

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        await userData.save();

        await stats.save();

        //////////////////////////////////////////////////
        // EMBED FINAL
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor(

                    multiplier > 0

                        ?

                        "#00ff99"

                        :

                        "#ff0000"
                )

                .setTitle(
                    "🎰 Bryant's Casino"
                )

                .setDescription(

                    `## 🎰 Resultado\n\n` +

                    `${generateDisplay(grid)}\n\n` +

                    `🎯 Línea válida: **Fila central**\n\n` +

                    `${resultText}\n\n` +

                    (

                        multiplier > 0

                            ?

                            `💰 Ganaste **${winnings.toLocaleString()} monedas**`

                            :

                            `💸 Perdiste **${amount.toLocaleString()} monedas**`
                    ) +

                    `\n\n👛 Balance actual: **${userData.wallet.toLocaleString()} monedas**`
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true
                    })
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                .setFooter({

                    text:
                        "Bryant's Casino"
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.editReply({

            embeds: [embed],

            components: []
        });
    
}

module.exports = {
 data: new SlashCommandBuilder()
    .setName("casino")
    .setDescription("Juegos y estadísticas de Bryant's Casino")
    .addSubcommand(s => s.setName("blackjack").setDescription("Juega Blackjack").addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad a apostar").setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName("stats").setDescription("Muestra tus estadísticas del casino"))
    .addSubcommand(s => s.setName("coinflip").setDescription("Desafía a un usuario a una apuesta").addUserOption(o => o.setName("usuario").setDescription("Usuario a desafiar").setRequired(true)).addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad a apostar").setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName("dados").setDescription("Lanza los dados en el casino").addIntegerOption(o => o.setName("apuesta").setDescription("Cantidad a apostar").setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName("gamble").setDescription("Apuesta una cantidad de dinero").addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad a apostar").setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName("ruleta").setDescription("Apuesta en la ruleta").addStringOption(o => o.setName("tipo").setDescription("Tipo de apuesta").setRequired(true).addChoices({name:"Color",value:"color"},{name:"Número",value:"numero"})).addStringOption(o => o.setName("apuesta").setDescription("rojo, negro, verde o número").setRequired(true)).addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad a apostar").setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName("slots").setDescription("Juega a las tragamonedas").addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad a apostar").setRequired(true).setMinValue(1))),
 async execute(interaction) {
   const sub = interaction.options.getSubcommand();
   const handlers = { blackjack: run_blackjack, stats: run_stats, coinflip: run_coinflip, dados: run_dados, gamble: run_gamble, ruleta: run_ruleta, slots: run_slots };
   return handlers[sub](interaction);
 }
};
