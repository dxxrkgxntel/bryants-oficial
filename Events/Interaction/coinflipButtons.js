const {
    EmbedBuilder
} = require("discord.js");

const EconomyUser =
    require("../../Models/EconomyUser");

const CasinoStats =
    require("../../Models/CasinoStats");

module.exports = {

    name: "interactionCreate",

    async execute(interaction) {

        try {

            //////////////////////////////////////////////////
            // BUTTON
            //////////////////////////////////////////////////

            if (!interaction.isButton()) return;

            //////////////////////////////////////////////////
            // COINFLIP
            //////////////////////////////////////////////////

            if (
                !interaction.customId.startsWith(
                    "coinflip_"
                )
            ) return;

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const args =
                interaction.customId.split("_");

            //////////////////////////////////////////////////

            const authorId =
                args[1];

            //////////////////////////////////////////////////

            const targetId =
                args[2];

            //////////////////////////////////////////////////

            const amount =
                parseInt(args[3]);

            //////////////////////////////////////////////////
            // VALIDAR
            //////////////////////////////////////////////////

            if (
                !authorId ||
                !targetId ||
                isNaN(amount) ||
                amount <= 0
            ) {

                return interaction.reply({

                    content:
                        "❌ Datos inválidos.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // NO SELF BET
            //////////////////////////////////////////////////

            if (authorId === targetId) {

                return interaction.reply({

                    content:
                        "❌ No puedes apostar contigo mismo.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // SOLO TARGET
            //////////////////////////////////////////////////

            if (
                interaction.user.id !== targetId
            ) {

                return interaction.reply({

                    content:
                        "❌ No puedes aceptar esta apuesta.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // DESACTIVAR BOTONES
            //////////////////////////////////////////////////

            await interaction.update({

                content:

                    `🪙 Lanzando moneda...\n\n` +

                    `💰 Apuesta: **${amount.toLocaleString()} monedas**`,

                embeds: [],

                components: []
            });

            //////////////////////////////////////////////////
            // USERS
            //////////////////////////////////////////////////

            const authorData =
                await EconomyUser.findOne({

                    guildId:
                        interaction.guild.id,

                    userId:
                        authorId
                });

            //////////////////////////////////////////////////

            const targetData =
                await EconomyUser.findOne({

                    guildId:
                        interaction.guild.id,

                    userId:
                        targetId
                });

            //////////////////////////////////////////////////
            // VALIDAR CUENTAS
            //////////////////////////////////////////////////

            if (!authorData || !targetData) {

                return interaction.editReply({

                    content:
                        "❌ Uno de los usuarios no tiene cuenta de economía."
                });
            }

            //////////////////////////////////////////////////
            // DINERO
            //////////////////////////////////////////////////

            if (
                authorData.wallet < amount
            ) {

                return interaction.editReply({

                    content:
                        "❌ El creador ya no tiene suficiente dinero."
                });
            }

            //////////////////////////////////////////////////

            if (
                targetData.wallet < amount
            ) {

                return interaction.editReply({

                    content:
                        "❌ No tienes suficiente dinero."
                });
            }

            //////////////////////////////////////////////////
            // ANIMACION
            //////////////////////////////////////////////////

            await new Promise(resolve =>

                setTimeout(resolve, 3000)
            );

            //////////////////////////////////////////////////
            // WINNER
            //////////////////////////////////////////////////

            const winnerId =

                Math.random() < 0.5

                    ? authorId

                    : targetId;

            //////////////////////////////////////////////////

            const loserId =

                winnerId === authorId

                    ? targetId

                    : authorId;

            //////////////////////////////////////////////////

            const winnerData =

                winnerId === authorId

                    ? authorData

                    : targetData;

            //////////////////////////////////////////////////

            const loserData =

                loserId === authorId

                    ? authorData

                    : targetData;

            //////////////////////////////////////////////////
            // QUITAR DINERO
            //////////////////////////////////////////////////

            authorData.wallet -= amount;

            targetData.wallet -= amount;

            //////////////////////////////////////////////////
            // PREMIO
            //////////////////////////////////////////////////

            const totalPrize =
                amount * 2;

            //////////////////////////////////////////////////
            // DAR PREMIO
            //////////////////////////////////////////////////

            winnerData.wallet += totalPrize;

            //////////////////////////////////////////////////
            // SEGURIDAD
            //////////////////////////////////////////////////

            if (authorData.wallet < 0)
                authorData.wallet = 0;

            //////////////////////////////////////////////////

            if (targetData.wallet < 0)
                targetData.wallet = 0;

            //////////////////////////////////////////////////
            // CASINO STATS WINNER
            //////////////////////////////////////////////////

            let winnerStats =

                await CasinoStats.findOne({

                    guildId:
                        interaction.guild.id,

                    userId:
                        winnerId
                });

            //////////////////////////////////////////////////

            if (!winnerStats) {

                winnerStats =
                    await CasinoStats.create({

                        guildId:
                            interaction.guild.id,

                        userId:
                            winnerId
                    });
            }

            //////////////////////////////////////////////////
            // CASINO STATS LOSER
            //////////////////////////////////////////////////

            let loserStats =

                await CasinoStats.findOne({

                    guildId:
                        interaction.guild.id,

                    userId:
                        loserId
                });

            //////////////////////////////////////////////////

            if (!loserStats) {

                loserStats =
                    await CasinoStats.create({

                        guildId:
                            interaction.guild.id,

                        userId:
                            loserId
                    });
            }

            //////////////////////////////////////////////////
            // WINNER STATS
            //////////////////////////////////////////////////

            winnerStats.totalGames += 1;

            winnerStats.totalWins += 1;

            winnerStats.moneyWon += totalPrize;

            winnerStats.currentStreak += 1;

            winnerStats.coinflipWins += 1;

            //////////////////////////////////////////////////

            if (

                totalPrize >
                winnerStats.biggestWin

            ) {

                winnerStats.biggestWin =
                    totalPrize;
            }

            //////////////////////////////////////////////////
            // LOSER STATS
            //////////////////////////////////////////////////

            loserStats.totalGames += 1;

            loserStats.totalLosses += 1;

            loserStats.moneyLost += amount;

            loserStats.currentStreak = 0;

            //////////////////////////////////////////////////
            // SAVE
            //////////////////////////////////////////////////

            await authorData.save();

            await targetData.save();

            //////////////////////////////////////////////////
            // SAVE STATS
            //////////////////////////////////////////////////

            await winnerStats.save();

            await loserStats.save();

            //////////////////////////////////////////////////
            // USER
            //////////////////////////////////////////////////

            const winnerUser =
                await interaction.client.users.fetch(
                    winnerId
                );

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🪙 Resultado Coinflip"
                    )

                    .setDescription(

                        `🎉 ${winnerUser} ganó la apuesta.\n\n` +

                        `💰 Premio: **${totalPrize.toLocaleString()} monedas**\n` +

                        `📉 Perdedor: <@${loserId}>`
                    )

                    .setThumbnail(

                        winnerUser.displayAvatarURL({

                            dynamic: true
                        })
                    )

                    .setFooter({

                        text:
                            `${interaction.guild.name} • Casino`
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////

            await interaction.editReply({

                content: null,

                embeds: [embed]
            });

        } catch (error) {

            console.log(
                "❌ Error en coinflipButtons:",
                error
            );
        }
    }
};