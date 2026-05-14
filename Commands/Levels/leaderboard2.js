const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const Level = require("../../Models/Level");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("top-nivel")

        .setDescription(
            "Top de niveles del servidor"
        ),

    //////////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////////

        const data =
            await Level.find({

                guildId:
                    interaction.guild.id
            })

                .sort({
                    level: -1,
                    xp: -1
                });

        //////////////////////////////////////////////////////

        if (!data.length) {

            return interaction.reply({

                content:
                    "❌ No hay datos de niveles aún.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // PAGINAS
        //////////////////////////////////////////////////////

        const itemsPerPage = 5;

        let currentPage = 0;

        const totalPages =
            Math.ceil(
                data.length / itemsPerPage
            );

        //////////////////////////////////////////////////////
        // GENERADOR EMBED
        //////////////////////////////////////////////////////

        const generateEmbed = async (page) => {

            const start =
                page * itemsPerPage;

            const end =
                start + itemsPerPage;

            const currentData =
                data.slice(start, end);

            //////////////////////////////////////////////////

            let leaderboard = "";

            //////////////////////////////////////////////////

            for (
                let i = 0;
                i < currentData.length;
                i++
            ) {

                const user =
                    currentData[i];

                const position =
                    start + i + 1;

                //////////////////////////////////////////////

                let medal = "🏅";

                if (position === 1)
                    medal = "👑";

                else if (position === 2)
                    medal = "🥈";

                else if (position === 3)
                    medal = "🥉";

                //////////////////////////////////////////////////
// BADGES
//////////////////////////////////////////////////

let member =
   interaction.guild.members.cache.get(user.userId);

if (!member) {

   member =
      await interaction.guild.members
         .fetch(user.userId)
         .catch(() => null);
}

let badges = "";

//////////////////////////////////////////////////
// OWNER SERVER
//////////////////////////////////////////////////

if (
    interaction.guild.ownerId ===
    user.userId
) {
    badges += " 👑";
}

//////////////////////////////////////////////////
// ADMIN
//////////////////////////////////////////////////

if (
    member?.permissions.has("Administrator")
) {
    badges += " 🛠";
}

//////////////////////////////////////////////////
// BOOSTER
//////////////////////////////////////////////////

if (
    member?.premiumSince
) {
    badges += " 🚀";
}

                //////////////////////////////////////////////

                const xpNeeded =
                    (user.level + 1) * 100;

                const progress =
                    Math.floor(
                        (user.xp / xpNeeded) * 100
                    );

                //////////////////////////////////////////////////
                // BARRA XP
                //////////////////////////////////////////////////

                const filled =
                    Math.floor(progress / 10);

                const empty =
                    10 - filled;

                const progressBar =

                    "🟪".repeat(filled) +
                    "⬛".repeat(empty);

                //////////////////////////////////////////////

                leaderboard +=

                    `${medal} **#${position}** • <@${user.userId}> ${badges}\n` +

                    `> ⭐ Nivel: **${user.level}**\n` +

                    `> ✨ XP: **${user.xp}/${xpNeeded}**\n` +

                    `> 📈 ${progressBar} **${progress}%**\n\n`;
            }

            //////////////////////////////////////////////////

            const topUser =
                await interaction.guild.members
                    .fetch(data[0].userId)
                    .catch(() => null);

            //////////////////////////////////////////////////

            return new EmbedBuilder()

                .setTitle(
                    "🏆 Leaderboard de Niveles"
                )

                .setDescription(leaderboard)

                .setColor("#8A2BE2")

                .setThumbnail(

                    topUser?.user
                        .displayAvatarURL({

                            size: 1024
                        })
                )

                .setFooter({

                    text:
                        `Página ${page + 1}/${totalPages}`
                })

                .setTimestamp();
        };

        //////////////////////////////////////////////////////
        // BOTONES
        //////////////////////////////////////////////////////

        const row =
            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            "leaderboard_back"
                        )

                        .setEmoji("⬅️")

                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            "leaderboard_next"
                        )

                        .setEmoji("➡️")

                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        //////////////////////////////////////////////////////
        // MENSAJE
        //////////////////////////////////////////////////////

        await interaction.reply({

    embeds: [
        await generateEmbed(
            currentPage
        )
    ],

    components: [row]
});

const msg =
    await interaction.fetchReply();

        //////////////////////////////////////////////////////
        // COLLECTOR
        //////////////////////////////////////////////////////

        const collector =
   msg.createMessageComponentCollector({

      componentType: 2,

      filter: i =>
         i.user.id === interaction.user.id,

      time: 120000
   });

        //////////////////////////////////////////////////////

        collector.on(
            "collect",
            async (button) => {

                //////////////////////////////////////////////////
                // SOLO QUIEN EJECUTÓ
                //////////////////////////////////////////////////

                if (
                    button.user.id !==
                    interaction.user.id
                ) {

                    return button.reply({

                        content:
                            "❌ No puedes usar estos botones.",

                        flags: 64
                    });
                }

                //////////////////////////////////////////////////

                if (
                    button.customId ===
                    "leaderboard_back"
                ) {

                    currentPage--;

                    if (currentPage < 0)
                        currentPage =
                            totalPages - 1;
                }

                //////////////////////////////////////////////////

                if (
                    button.customId ===
                    "leaderboard_next"
                ) {

                    currentPage++;

                    if (
                        currentPage >=
                        totalPages
                    )
                        currentPage = 0;
                }

                //////////////////////////////////////////////////

                await button.update({

                    embeds: [
                        await generateEmbed(
                            currentPage
                        )
                    ],

                    components: [row]
                });
            }
        );

        //////////////////////////////////////////////////////
        // FINALIZAR
        //////////////////////////////////////////////////////

        collector.on(
            "end",
            async () => {

                const disabledRow =
                    new ActionRowBuilder()

                        .addComponents(

                            new ButtonBuilder()

                                .setCustomId(
                                    "leaderboard_back_disabled"
                                )

                                .setEmoji("⬅️")

                                .setDisabled(true)

                                .setStyle(
                                    ButtonStyle.Secondary
                                ),

                            new ButtonBuilder()

                                .setCustomId(
                                    "leaderboard_next_disabled"
                                )

                                .setEmoji("➡️")

                                .setDisabled(true)

                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                        );

                //////////////////////////////////////////////////

                await msg.edit({

                    components: [
                        disabledRow
                    ]
                }).catch(() => {});
            }
        );
    }
};