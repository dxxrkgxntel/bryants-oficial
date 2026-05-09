const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Level =
    require("../../Models/Level");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("perfil")

            .setDescription(
                "Muestra el perfil del usuario"
            )

            .addUserOption(option =>

                option

                    .setName("usuario")

                    .setDescription(
                        "Usuario a consultar"
                    )

                    .setRequired(false)
            ),

    //////////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////////

        const user =
            interaction.options.getUser(
                "usuario"
            ) || interaction.user;

        //////////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////////

        const data =
            await Level.findOne({

                userId: user.id,

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ Este usuario no tiene datos de nivel.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // LEADERBOARD POSITION
        //////////////////////////////////////////////////////

        const leaderboard =
            await Level.find({

                guildId:
                    interaction.guild.id
            })

                .sort({
                    level: -1,
                    xp: -1
                });

        //////////////////////////////////////////////////////

        const position =
            leaderboard.findIndex(

                u => u.userId === user.id
            ) + 1;

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
        // XP BAR
        //////////////////////////////////////////////////////

        const filled =
            Math.floor(progress / 10);

        const empty =
            10 - filled;

        const progressBar =

            "🟪".repeat(filled) +
            "⬛".repeat(empty);

        //////////////////////////////////////////////////////
        // MEMBER
        //////////////////////////////////////////////////////

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        //////////////////////////////////////////////////////
        // BADGES
        //////////////////////////////////////////////////////

        let badges = "";

        ////////////////////////////////////////////
        // OWNER
        ////////////////////////////////////////////

        if (
            interaction.guild.ownerId ===
            user.id
        ) {

            badges += "👑 ";
        }

        ////////////////////////////////////////////
        // ADMIN
        ////////////////////////////////////////////

        if (
            member?.permissions.has(
                "Administrator"
            )
        ) {

            badges += "🛠 ";
        }

        ////////////////////////////////////////////
        // BOOSTER
        ////////////////////////////////////////////

        if (
            member?.premiumSince
        ) {

            badges += "🚀 ";
        }

        ////////////////////////////////////////////
        // TOPS
        ////////////////////////////////////////////

        if (position === 1)
            badges += "🥇 ";

        else if (position === 2)
            badges += "🥈 ";

        else if (position === 3)
            badges += "🥉 ";

        //////////////////////////////////////////////////////
        // ACCOUNT DATE
        //////////////////////////////////////////////////////

        const created =
            `<t:${parseInt(
                user.createdTimestamp / 1000
            )}:R>`;

        //////////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setAuthor({

    name:
        `${member?.displayName || user.username} | Perfil Premium`,

    iconURL:
        user.displayAvatarURL({
            dynamic: true
        })
})

                .setThumbnail(
                    user.displayAvatarURL({
                        dynamic: true,
                        size: 1024
                    })
                )

                .setDescription(

                    `## 👤 ${member?.displayName || user.username}\n` +
                    
                    `${badges || "Sin badges"}\n\n` +

                    `🏆 **Rank:** #${position}\n` +

                    `⭐ **Nivel:** ${data.level}\n` +

                    `✨ **XP:** ${data.xp}/${xpNeeded}\n` +

                    `📈 ${progressBar} **${progress}%**\n\n` +

                    `📅 **Cuenta creada:** ${created}`
                )

                .setFooter({

                    text:
                        "Sistema de perfiles avanzado"
                })

                .setTimestamp();

        //////////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};