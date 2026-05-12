const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const EconomyUser =
    require("../../Models/EconomyUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("top-dinero")

            .setDescription(
                "Muestra el top de usuarios más ricos del servidor"
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // PAGE SYSTEM
        //////////////////////////////////////////////////

        const pageSize = 5;

        let currentPage = 0;

        //////////////////////////////////////////////////
        // LEADERBOARD
        //////////////////////////////////////////////////

        const leaderboard =

            await EconomyUser.aggregate([

                {

                    $match: {

                        guildId:
                            interaction.guild.id
                    }
                },

                {

                    $addFields: {

                        totalMoney: {

                            $add: [

                                "$wallet",

                                "$bank"
                            ]
                        }
                    }
                },

                {

                    $sort: {

                        totalMoney: -1
                    }
                }
            ]);

        //////////////////////////////////////////////////

        if (!leaderboard.length) {

            return interaction.reply({

                content:
                    "❌ No hay datos de economía aún.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // TOTAL PAGES
        //////////////////////////////////////////////////

        const totalPages =

            Math.ceil(

                leaderboard.length /
                pageSize
            );

        //////////////////////////////////////////////////
        // TOTAL SERVER MONEY
        //////////////////////////////////////////////////

        const totalMoney =

            leaderboard.reduce(

                (acc, u) =>

                    acc +
                    u.wallet +
                    u.bank,

                0
            );

        //////////////////////////////////////////////////
        // USER POSITION
        //////////////////////////////////////////////////

        const userPosition =

            leaderboard.findIndex(

                u =>
                    u.userId ===
                    interaction.user.id
            ) + 1;

        //////////////////////////////////////////////////
        // CREATE EMBED
        //////////////////////////////////////////////////

        const generateEmbed = (page) => {

            //////////////////////////////////////////////////
            // START / END
            //////////////////////////////////////////////////

            const start =
                page * pageSize;

            const end =
                start + pageSize;

            //////////////////////////////////////////////////
            // USERS PAGE
            //////////////////////////////////////////////////

            const users =
                leaderboard.slice(
                    start,
                    end
                );

            //////////////////////////////////////////////////
            // DESCRIPTION
            //////////////////////////////////////////////////

            const description =

                users.map((u, i) => {

                    //////////////////////////////////////////////////
                    // REAL POSITION
                    //////////////////////////////////////////////////

                    const position =
                        start + i + 1;

                    //////////////////////////////////////////////////
                    // TOTAL
                    //////////////////////////////////////////////////

                    const total =
                        u.wallet + u.bank;

                    //////////////////////////////////////////////////
                    // PERCENT
                    //////////////////////////////////////////////////

                    const percent =

                        (
                            (total / totalMoney) * 100
                        ).toFixed(1);

                    //////////////////////////////////////////////////
                    // MEDALS
                    //////////////////////////////////////////////////

                    let medal =
                        "💠";

                    if (position === 1)
                        medal = "🥇";

                    else if (position === 2)
                        medal = "🥈";

                    else if (position === 3)
                        medal = "🥉";

                    //////////////////////////////////////////////////

                    return (

                        `${medal} **#${position}** <@${u.userId}>\n` +

                        `> 👛 Wallet: **${u.wallet.toLocaleString()}**\n` +

                        `> 🏦 Banco: **${u.bank.toLocaleString()}**\n` +

                        `> 💎 Total: **${total.toLocaleString()}**\n` +

                        `> 📈 Riqueza global: **${percent}%**`
                    );

                }).join("\n\n━━━━━━━━━━━━━━\n\n");

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            return new EmbedBuilder()

                .setColor("#8A2BE2")

                .setAuthor({

                    name:
                        "🏦 Elite Financiera",

                    iconURL:
                        interaction.guild.iconURL({
                            dynamic: true
                        })
                })

                .setDescription(

                    `## 💰 Top usuarios más ricos\n\n` +

                    `${description}\n\n` +

                    `━━━━━━━━━━━━━━\n\n` +

                    `📍 Tu posición: **#${userPosition || "Sin ranking"}**`
                )

                .setThumbnail(

                    interaction.guild.iconURL({

                        dynamic: true,

                        size: 1024
                    })
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                .setFooter({

                    text:
                        `${interaction.guild.name} • Página ${page + 1}/${totalPages}`
                })

                .setTimestamp();
        };

        //////////////////////////////////////////////////
        // BUTTONS
        //////////////////////////////////////////////////

        const getButtons = () => {

            return new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            "leaderboard_previous"
                        )

                        .setEmoji("⬅️")

                        .setStyle(
                            ButtonStyle.Secondary
                        )

                        .setDisabled(
                            currentPage === 0
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            "leaderboard_next"
                        )

                        .setEmoji("➡️")

                        .setStyle(
                            ButtonStyle.Secondary
                        )

                        .setDisabled(
                            currentPage === totalPages - 1
                        )
                );
        };

        //////////////////////////////////////////////////
        // SEND MESSAGE
        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [

                generateEmbed(
                    currentPage
                )
            ],

            components: [

                getButtons()
            ]
        });

        //////////////////////////////////////////////////
        // MESSAGE
        //////////////////////////////////////////////////

        const message =
            await interaction.fetchReply();

        //////////////////////////////////////////////////
        // COLLECTOR
        //////////////////////////////////////////////////

        const collector =

            message.createMessageComponentCollector({

                time: 120000
            });

        //////////////////////////////////////////////////
        // COLLECT
        //////////////////////////////////////////////////

        collector.on("collect", async (btn) => {

            //////////////////////////////////////////////////
            // ONLY AUTHOR
            //////////////////////////////////////////////////

            if (

                btn.user.id !==
                interaction.user.id

            ) {

                return btn.reply({

                    content:
                        "❌ No puedes usar estos botones.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // DEFER
            //////////////////////////////////////////////////

            await btn.deferUpdate();

            //////////////////////////////////////////////////
            // PREVIOUS
            //////////////////////////////////////////////////

            if (

                btn.customId ===
                "leaderboard_previous"

            ) {

                currentPage--;
            }

            //////////////////////////////////////////////////
            // NEXT
            //////////////////////////////////////////////////

            else if (

                btn.customId ===
                "leaderboard_next"

            ) {

                currentPage++;
            }

            //////////////////////////////////////////////////
            // UPDATE
            //////////////////////////////////////////////////

            await interaction.editReply({

                embeds: [

                    generateEmbed(
                        currentPage
                    )
                ],

                components: [

                    getButtons()
                ]
            });
        });

        //////////////////////////////////////////////////
        // END
        //////////////////////////////////////////////////

        collector.on("end", async () => {

            //////////////////////////////////////////////////

            const disabledRow =

                new ActionRowBuilder()

                    .addComponents(

                        new ButtonBuilder()

                            .setCustomId(
                                "leaderboard_previous_disabled"
                            )

                            .setEmoji("⬅️")

                            .setStyle(
                                ButtonStyle.Secondary
                            )

                            .setDisabled(true),

                        new ButtonBuilder()

                            .setCustomId(
                                "leaderboard_next_disabled"
                            )

                            .setEmoji("➡️")

                            .setStyle(
                                ButtonStyle.Secondary
                            )

                            .setDisabled(true)
                    );

            //////////////////////////////////////////////////

            await interaction.editReply({

                components: [
                    disabledRow
                ]
            }).catch(() => {});
        });
    }
};