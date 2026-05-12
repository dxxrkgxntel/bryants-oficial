const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Level =
    require("../../Models/Level");

const EconomyUser =
    require("../../Models/EconomyUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("perfil-ranking")

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
            ) ||

            interaction.user;

        //////////////////////////////////////////////////////
        // MEMBER
        //////////////////////////////////////////////////////

        const member =

            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        //////////////////////////////////////////////////////
        // LEVEL DATA
        //////////////////////////////////////////////////////

        const data =

            await Level.findOne({

                userId:
                    user.id,

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
        // ECONOMY
        //////////////////////////////////////////////////////

        let economy =

            await EconomyUser.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    user.id
            });

        //////////////////////////////////////////////////////

        if (!economy) {

            economy = {

                wallet: 0,

                bank: 0
            };
        }

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
        // XP
        //////////////////////////////////////////////////////

        const xpNeeded =

            (data.level + 1) * 100;

        //////////////////////////////////////////////////////

        const progress =

            Math.floor(

                (data.xp / xpNeeded) * 100
            );

        //////////////////////////////////////////////////////
        // XP BAR
        //////////////////////////////////////////////////////

        const filled =

            Math.floor(progress / 10);

        //////////////////////////////////////////////////////

        const empty =
            10 - filled;

        //////////////////////////////////////////////////////

        const progressBar =

            "🟪".repeat(filled) +
            "⬛".repeat(empty);

        //////////////////////////////////////////////////////
        // BADGES
        //////////////////////////////////////////////////////

        let badges = "";

        //////////////////////////////////////////////////////
        // OWNER
        //////////////////////////////////////////////////////

        if (

            interaction.guild.ownerId ===
            user.id

        ) {

            badges += "👑 ";
        }

        //////////////////////////////////////////////////////
        // ADMIN
        //////////////////////////////////////////////////////

        if (

            member?.permissions.has(
                "Administrator"
            )

        ) {

            badges += "🛠️ ";
        }

        //////////////////////////////////////////////////////
        // BOOSTER
        //////////////////////////////////////////////////////

        if (

            member?.premiumSince

        ) {

            badges += "🚀 ";
        }

        //////////////////////////////////////////////////////
        // TOPS
        //////////////////////////////////////////////////////

        if (position === 1)

            badges += "🥇 ";

        else if (position === 2)

            badges += "🥈 ";

        else if (position === 3)

            badges += "🥉 ";

        //////////////////////////////////////////////////////
        // RICH
        //////////////////////////////////////////////////////

        if (

            economy.wallet >= 100000

        ) {

            badges += "💰 ";
        }

        //////////////////////////////////////////////////////
        // HIGH LEVEL
        //////////////////////////////////////////////////////

        if (

            data.level >= 25

        ) {

            badges += "🔥 ";
        }

        //////////////////////////////////////////////////////
        // OLD ACCOUNT
        //////////////////////////////////////////////////////

        const oldAccount =

            Date.now() -
            user.createdTimestamp;

        //////////////////////////////////////////////////////

        const oneYear =

            365 * 24 * 60 * 60 * 1000;

        //////////////////////////////////////////////////////

        if (

            oldAccount >= oneYear

        ) {

            badges += "📜 ";
        }

        //////////////////////////////////////////////////////
        // ACCOUNT DATE
        //////////////////////////////////////////////////////

        const created =

            `<t:${parseInt(

                user.createdTimestamp / 1000

            )}:R>`;

        //////////////////////////////////////////////////////
        // JOIN DATE
        //////////////////////////////////////////////////////

        const joined =

            member?.joinedTimestamp

                ?

                `<t:${parseInt(

                    member.joinedTimestamp / 1000

                )}:R>`

                :

                "Desconocido";

        //////////////////////////////////////////////////////
        // STATUS
        //////////////////////////////////////////////////////

        let status =
            "🌙 Ausente";

        //////////////////////////////////////////////////////

        if (
            member?.presence?.status ===
            "online"
        ) {

            status =
                "🟢 En línea";
        }

        //////////////////////////////////////////////////////

        else if (

            member?.presence?.status ===
            "idle"

        ) {

            status =
                "🌙 Ausente";
        }

        //////////////////////////////////////////////////////

        else if (

            member?.presence?.status ===
            "dnd"

        ) {

            status =
                "⛔ No molestar";
        }

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

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=6a0032f4&is=69fee174&hm=54a509859dcee24cd6a637b9e0373e1821b6ab3898eccd77a59591b6e6d55e3a&=&format=webp&quality=lossless&width=1288&height=515"
                )

                .setDescription(

                    `## 👤 ${member?.displayName || user.username}\n` +

                    `> **Insignias:** ${badges || "Sin badges"}\n\n` +

                    `> 🌐 Estado: **${status}**\n` +

                    `> 🏆 Rank Global: **#${position}**\n` +

                    `> ⭐ Nivel: **${data.level}**\n` +

                    `> ✨ XP: **${data.xp}/${xpNeeded}**\n` +

                    `> 📈 Progreso: **${progress}%**\n` +

                    `${progressBar}\n\n`
                )

                .addFields(

                    {

                        name:
                            "💰 Economía",

                        value:

                            `> 👛 Wallet: **${economy.wallet.toLocaleString()}**\n` +

                            `> 🏦 Banco: **${economy.bank.toLocaleString()}**`,

                        inline: true
                    },

                    {

                        name:
                            "📅 Información",

                        value:

                            `> 🗓️ Cuenta creada: ${created}\n` +

                            `> 🚪 Entró al servidor: ${joined}`,

                        inline: true
                    }
                )

                .setFooter({

                    text:
                        "Bryant's Oficial • Sistema de perfiles avanzado"
                })

                .setTimestamp();

        //////////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};