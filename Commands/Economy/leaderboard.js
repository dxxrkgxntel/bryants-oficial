const {
    SlashCommandBuilder,
    EmbedBuilder
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
        // USERS
        //////////////////////////////////////////////////

        const users =

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
        },

        {

            $limit: 10
        }
    ]);

        //////////////////////////////////////////////////

        if (!users.length) {

            return interaction.reply({

                content:
                    "❌ No hay datos de economía aún.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // TOTAL SERVER MONEY
        //////////////////////////////////////////////////

        const allUsers =

            await EconomyUser.find({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        const totalMoney =

            allUsers.reduce(

                (acc, u) =>

                    acc +
                    u.wallet +
                    u.bank,

                0
            );

        //////////////////////////////////////////////////
        // DESCRIPTION
        //////////////////////////////////////////////////

        const description =

            users.map((u, i) => {

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

                if (i === 0)
                    medal = "🥇";

                else if (i === 1)
                    medal = "🥈";

                else if (i === 2)
                    medal = "🥉";

                //////////////////////////////////////////////////

                return (

                    `${medal} <@${u.userId}>\n` +

                    `> 👛 Wallet: **${u.wallet.toLocaleString()}**\n` +

                    `> 🏦 Banco: **${u.bank.toLocaleString()}**\n` +

                    `> 💎 Total: **${total.toLocaleString()}**\n` +

                    `> 📈 Riqueza global: **${percent}%**`
                );

            }).join("\n\n━━━━━━━━━━━━━━\n\n");

        //////////////////////////////////////////////////
        // USER POSITION
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

        const userPosition =

            leaderboard.findIndex(

                u =>
                    u.userId ===
                    interaction.user.id
            ) + 1;

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

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
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=6a0032f4&is=69fee174&hm=54a509859dcee24cd6a637b9e0373e1821b6ab3898eccd77a59591b6e6d55e3a&=&format=webp&quality=lossless&width=1288&height=515"
                )

                .setFooter({

                    text:
                        `${interaction.guild.name} • Sistema de economía`
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};