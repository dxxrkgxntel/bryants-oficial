const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Level = require("../../Models/Level");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("rank")

        .setDescription(
            "Mira tu nivel y XP"
        )

        .addUserOption(option =>

            option

                .setName("usuario")

                .setDescription(
                    "Usuario"
                )

                .setRequired(false)
        ),

    //////////////////////////////////////////////////////

    async execute(interaction) {

        const user =
            interaction.options.getUser("usuario") ||
            interaction.user;

        //////////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////////

        const data =
            await Level.findOne({

                userId: user.id,

                guildId:
                    interaction.guild.id
            });

        if (!data) {

            return interaction.reply({

                content:
                    "❌ Ese usuario no tiene nivel.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // XP
        //////////////////////////////////////////////////////

        const xpNeeded =
            (data.level + 1) * 100;

        const progress =
            Math.floor(
                (data.xp / xpNeeded) * 100
            );

        //////////////////////////////////////////////////////
// POSITION (OPTIMIZADO)
//////////////////////////////////////////////////////

const position =

    await Level.countDocuments({

        guildId:
            interaction.guild.id,

        $or: [

            {
                level: {
                    $gt: data.level
                }
            },

            {
                level: data.level,

                xp: {
                    $gt: data.xp
                }
            }
        ]
    }) + 1;

        //////////////////////////////////////////////////////
        // BADGES
        //////////////////////////////////////////////////////

        let badge = "🎖️";

        if (position === 1)
            badge = "👑";

        else if (position === 2)
            badge = "🥈";

        else if (position === 3)
            badge = "🥉";

        //////////////////////////////////////////////////////
        // COLOR
        //////////////////////////////////////////////////////

        let color = "7d5eff";

        if (position === 1)
            color = "ffd700";

        else if (position === 2)
            color = "c0c0c0";

        else if (position === 3)
            color = "cd7f32";

        //////////////////////////////////////////////////////
        // RANK CARD URL
        //////////////////////////////////////////////////////

        const avatar =
            user.displayAvatarURL({
                extension: "png",
                size: 1024
            });

        const imageUrl =
            `https://api.discordarts.com/rankcard` +
            `?avatar=${avatar}` +
            `&username=${encodeURIComponent(user.username)}` +
            `&discriminator=${user.discriminator || "0000"}` +
            `&level=${data.level}` +
            `&currentxp=${data.xp}` +
            `&nextlevelxp=${xpNeeded}` +
            `&rank=${position}` +
            `&barcolor=${color}`;

        //////////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor(`#${color}`)

                .setAuthor({

                    name:
                        `${user.username} • Sistema de Nivel`,

                    iconURL: avatar
                })

                .setDescription(

                    `## ${badge} Rank de ${user.username}\n\n` +

                    `🏆 **Posición:** #${position}\n` +

                    `⭐ **Nivel:** ${data.level}\n` +

                    `✨ **XP:** ${data.xp}/${xpNeeded}\n` +

                    `📈 **Progreso:** ${progress}%`
                )

                .setImage(imageUrl)

                .setFooter({

                    text:
                        "Bryant's Oficial • Level System"
                })

                .setTimestamp();

        //////////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};