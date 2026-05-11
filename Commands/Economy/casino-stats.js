const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const EconomyUser =
    require("../../Models/EconomyUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("casino-stats")

            .setDescription(
                "Muestra tus estadísticas del casino"
            )

            .addUserOption(option =>

                option

                    .setName("usuario")

                    .setDescription(
                        "Usuario a consultar"
                    )

                    .setRequired(false)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////

        const target =

            interaction.options.getUser(
                "usuario"
            ) ||

            interaction.user;

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const data =

            await EconomyUser.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    target.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ Este usuario no tiene estadísticas.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // TOTAL GAMES
        //////////////////////////////////////////////////

        const totalGames =

            data.gamblesWon +
            data.gamblesLost;

        //////////////////////////////////////////////////
        // WINRATE
        //////////////////////////////////////////////////

        const winrate =

            totalGames > 0

                ?

                (
                    (data.gamblesWon / totalGames) * 100
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

                    `> 🎉 Ganadas: **${data.gamblesWon.toLocaleString()}**\n` +

                    `> 💥 Perdidas: **${data.gamblesLost.toLocaleString()}**\n` +

                    `> 📈 Winrate: **${winrate}%**\n\n` +

                    `> 🌟 Jackpots: **${data.jackpots.toLocaleString()}**\n` +

                    `> 🔥 Racha actual: **${data.gambleStreak.toLocaleString()}**\n` +

                    `> 💎 Mayor victoria: **${data.biggestWin.toLocaleString()} monedas**\n\n` +

                    `> 🎲 Total apuestas: **${totalGames.toLocaleString()}**`
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