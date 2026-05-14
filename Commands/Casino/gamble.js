const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

const getConfig =
    require("../../utils/getConfig");

const CasinoStats =
    require("../../Models/CasinoStats");

//////////////////////////////////////////////////
// ANTI SPAM
//////////////////////////////////////////////////

const activeGambles =
    new Set();

//////////////////////////////////////////////////

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("apostar")

            .setDescription(
                "Apuesta una cantidad de dinero"
            )

            .addIntegerOption(o =>

                o.setName("cantidad")

                    .setDescription(
                        "Cantidad a apostar"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // EVITAR MULTIPLES APUESTAS
        //////////////////////////////////////////////////

        if (

            activeGambles.has(
                interaction.user.id
            )

        ) {

            return interaction.reply({

                content:
                    "❌ Ya tienes una apuesta en progreso.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        activeGambles.add(
            interaction.user.id
        );

        try {

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

                return interaction.reply({

                    content:
                        "❌ La economía no está configurada en este servidor.",

                    flags: 64
                });
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

                return interaction.reply({

                    content:
                        `⏳ Espera **${remaining}s** antes de volver a apostar.`,

                    flags: 64
                });
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

                return interaction.reply({

                    content:
                        "❌ No tienes suficiente dinero.",

                    flags: 64
                });
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

                return interaction.reply({

                    content:
                        `❌ La apuesta debe estar entre **${config.gambleMin}** y **${config.gambleMax}**.`,

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // EMBED CONFIRMACION
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
                        `> **${user.wallet.toLocaleString()} monedas**\n\n` +

                        `❓ ¿Realmente quieres continuar?`
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
            // BOTONES
            //////////////////////////////////////////////////

            const row =

                new ActionRowBuilder()

                    .addComponents(

                        new ButtonBuilder()

                            .setCustomId(
                                "gamble_confirm"
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
                                "gamble_cancel"
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

                return interaction.editReply({

                    content:
                        "⌛ La apuesta expiró.",

                    embeds: [],

                    components: []
                });
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

                return response.update({

                    content:
                        "❌ Apuesta cancelada.",

                    embeds: [],

                    components: []
                });
            }

            //////////////////////////////////////////////////
            // RESPONDER BOTON RAPIDO
            //////////////////////////////////////////////////

            await response.deferUpdate();

            //////////////////////////////////////////////////
            // GIRANDO
            //////////////////////////////////////////////////

            const loadingEmbed =

                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🎰 Bryant's Casino"
                    )

                    .setDescription(

                        `## 🎲 Girando tragamonedas...\n\n` +

                        `💸 Apostando **${amount.toLocaleString()} monedas**\n\n` +

                        `🍀 La suerte está siendo decidida...`
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

            await interaction.editReply({

                content: null,

                embeds: [loadingEmbed],

                components: []
            });

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

                return interaction.editReply({

                    content:
                        "❌ Ya no tienes suficiente dinero para completar la apuesta."
                });
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

                const embed =

                    new EmbedBuilder()

                        .setColor(

                            jackpot

                                ?

                                "#FFD700"

                                :

                                "#8A2BE2"
                        )

                        .setTitle(

                            jackpot

                                ?

                                "🌟 JACKPOT"

                                :

                                "🎰 Apuesta Ganada"
                        )

                        .setDescription(

                            `💸 Apostaste **${amount.toLocaleString()} monedas**\n\n` +

                            `🎉 ¡Ganaste la apuesta!\n\n` +

                            `💎 Multiplicador: **x${jackpotMultiplier}**\n` +

                            `💰 Ganancia: **${winnings.toLocaleString()} monedas**\n\n` +

                            `👛 Balance actual: **${freshUser.wallet.toLocaleString()}**`
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

                activeGambles.delete(
                    interaction.user.id
                );

                //////////////////////////////////////////////////

                return interaction.editReply({

                    content:

                        jackpot

                            ?

                            "🌟 ¡JACKPOT ACTIVADO!"

                            :

                            null,

                    embeds: [embed],

                    components: []
                });
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

                const embed =

                    new EmbedBuilder()

                        .setColor("#ff0000")

                        .setTitle(
                            "💥 Apuesta Perdida"
                        )

                        .setDescription(

                            `💸 Apostaste **${amount.toLocaleString()} monedas**\n\n` +

                            `😢 La suerte no estuvo de tu lado.\n\n` +

                            `📉 Dinero perdido: **${amount.toLocaleString()} monedas**\n\n` +

                            `👛 Balance actual: **${freshUser.wallet.toLocaleString()}**`
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

                activeGambles.delete(
                    interaction.user.id
                );

                //////////////////////////////////////////////////

                return interaction.editReply({

                    content: null,

                    embeds: [embed],

                    components: []
                });
            }

        } catch (err) {

            console.log(err);

            activeGambles.delete(
                interaction.user.id
            );

            return interaction.reply({

                content:
                    "❌ Ocurrió un error en el sistema de apuestas.",

                flags: 64
            }).catch(() => {});
        }
    }
};