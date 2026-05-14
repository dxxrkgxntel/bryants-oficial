const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const CasinoStats =
    require("../../Models/CasinoStats");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("casino-stats")

            .setDescription(
                "Muestra tus estadísticas del casino"
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////

        const target =
            interaction.user;

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const data =

            await CasinoStats.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    target.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ No tienes estadísticas.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // FIX OLD DATA
        //////////////////////////////////////////////////

        data.totalGames ??= 0;

        data.totalWins ??= 0;

        data.totalLosses ??= 0;

        data.moneyWon ??= 0;

        data.moneyLost ??= 0;

        data.jackpots ??= 0;

        data.currentStreak ??= 0;

        data.biggestWin ??= 0;

        data.slotsWins ??= 0;

        data.rouletteWins ??= 0;

        data.gambleWins ??= 0;

        data.coinflipWins ??= 0;

        //////////////////////////////////////////////////
        // TOTAL GAMES
        //////////////////////////////////////////////////

        const totalGames =
            data.totalGames;

        //////////////////////////////////////////////////
        // WINRATE
        //////////////////////////////////////////////////

        const winrate =

            totalGames > 0

                ?

                (
                    (
                        data.totalWins /
                        totalGames
                    ) * 100
                ).toFixed(1)

                :

                0;

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🎰 Estadísticas del Casino"
                )

                .setDescription(

                    `## 👤 ${target.username}\n\n` +

                    `> 🎉 Victorias: **${data.totalWins.toLocaleString()}**\n` +

                    `> 💥 Derrotas: **${data.totalLosses.toLocaleString()}**\n` +

                    `> 📈 Winrate: **${winrate}%**\n\n` +

                    `> 💰 Dinero ganado: **${data.moneyWon.toLocaleString()}**\n` +

                    `> 💸 Dinero perdido: **${data.moneyLost.toLocaleString()}**\n\n` +

                    `> 🌟 Jackpots: **${data.jackpots.toLocaleString()}**\n` +

                    `> 🔥 Racha actual: **${data.currentStreak.toLocaleString()}**\n` +

                    `> 💎 Mayor victoria: **${data.biggestWin.toLocaleString()} monedas**\n\n` +

                    `> 🎲 Total partidas: **${data.totalGames.toLocaleString()}**\n\n` +

                    `### 🎮 Juegos\n\n` +

                    `🎰 Slots ganados: **${data.slotsWins.toLocaleString()}**\n` +

                    `🎡 Ruletas ganadas: **${data.rouletteWins.toLocaleString()}**\n` +

                    `🎲 Apuestas ganadas: **${data.gambleWins.toLocaleString()}**\n` +

                    `🪙 Coinflip ganados: **${data.coinflipWins.toLocaleString()}**`
                )

                .setThumbnail(

                    target.displayAvatarURL({

                        dynamic: true,

                        size: 1024
                    })
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=6a0032f4&is=69fee174&hm=54a509859dcee24cd6a637b9e0373e1821b6ab3898eccd77a59591b6e6d55e3a&=&format=webp&quality=lossless&width=1288&height=515"
                )

                .setFooter({

                    text:
                        "Bryant's Casino"
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};