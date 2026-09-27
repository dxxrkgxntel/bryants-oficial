const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const ShopItem =
    require("../../Models/ShopItem");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("shop-add")

            .setDescription(
                "Agrega un rol a la tienda"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////
            // ROLE
            //////////////////////////////////////////////////

            .addRoleOption(o =>

                o.setName("rol")

                    .setDescription(
                        "Rol que se añadirá"
                    )

                    .setRequired(true)
            )

            //////////////////////////////////////////////////
            // PRICE
            //////////////////////////////////////////////////

            .addIntegerOption(o =>

                o.setName("precio")

                    .setDescription(
                        "Precio del rol"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            )

            //////////////////////////////////////////////////
            // EMOJI
            //////////////////////////////////////////////////

            .addStringOption(o =>

                o.setName("emoji")

                    .setDescription(
                        "Emoji del rol"
                    )

                    .setRequired(false)
            )

            //////////////////////////////////////////////////
            // DESCRIPTION
            //////////////////////////////////////////////////

            .addStringOption(o =>

                o.setName("descripcion")

                    .setDescription(
                        "Descripción del rol"
                    )

                    .setRequired(false)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const role =
            interaction.options.getRole(
                "rol"
            );

        //////////////////////////////////////////////////

        const price =
            interaction.options.getInteger(
                "precio"
            );

        //////////////////////////////////////////////////

        const emoji =
            interaction.options.getString(
                "emoji"
            ) || "🛒";

        //////////////////////////////////////////////////

        const description =
            interaction.options.getString(
                "descripcion"
            ) || "Rol exclusivo";

        //////////////////////////////////////////////////
        // EXISTING
        //////////////////////////////////////////////////

        const existing =
            await ShopItem.findOne({

                guildId:
                    interaction.guild.id,

                roleId:
                    role.id
            });

        //////////////////////////////////////////////////

        if (existing) {

            return interaction.reply({

                content:
                    "❌ Ese rol ya está en la tienda.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor(
                    role.color || "#8A2BE2"
                )

                .setTitle(
                    "🛒 Confirmar rol"
                )

                .setDescription(

                    `¿Deseas añadir ${role} a la tienda?\n\n` +

                    `${emoji} **Emoji:** ${emoji}\n` +

                    `📝 **Descripción:** ${description}\n` +

                    `💰 **Precio:** ${price.toLocaleString()} monedas`
                )

                .setThumbnail(

                    interaction.guild.iconURL({

                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        "Bryant's Economy"
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // BUTTONS
        //////////////////////////////////////////////////

        const row =

            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            "shopadd_confirm"
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
                            "shopadd_cancel"
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

        const msg =
            await interaction.reply({

                embeds: [embed],

                components: [row],

                fetchReply: true
            });

        //////////////////////////////////////////////////
        // COLLECTOR
        //////////////////////////////////////////////////

        const collector =

            msg.createMessageComponentCollector({

                time: 30000
            });

        //////////////////////////////////////////////////

        collector.on(

            "collect",

            async i => {

                ////////////////////////////////////////////////
                // AUTHOR ONLY
                ////////////////////////////////////////////////

                if (

                    i.user.id !==
                    interaction.user.id

                ) {

                    return i.reply({

                        content:
                            "❌ No puedes usar estos botones.",

                        flags: 64
                    });
                }

                ////////////////////////////////////////////////
                // CANCEL
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "shopadd_cancel"

                ) {

                    collector.stop();

                    return i.update({

                        content:
                            "❌ Operación cancelada.",

                        embeds: [],

                        components: []
                    });
                }

                ////////////////////////////////////////////////
                // CONFIRM
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "shopadd_confirm"

                ) {

                    //////////////////////////////////////////////////
                    // CREATE
                    //////////////////////////////////////////////////

                    await ShopItem.create({

                        guildId:
                            interaction.guild.id,

                        roleId:
                            role.id,

                        price,

                        emoji,

                        description
                    });

                    //////////////////////////////////////////////////
                    // SUCCESS
                    //////////////////////////////////////////////////

                    const successEmbed =

                        new EmbedBuilder()

                            .setColor(
                                "#00ff99"
                            )

                            .setTitle(
                                "✅ Rol añadido"
                            )

                            .setDescription(

                                `${role} fue añadido a la tienda.\n\n` +

                                `${emoji} **Emoji:** ${emoji}\n` +

                                `📝 **Descripción:** ${description}\n` +

                                `💰 **Precio:** ${price.toLocaleString()} monedas`
                            )

                            .setTimestamp();

                    //////////////////////////////////////////////////

                    collector.stop();

                    //////////////////////////////////////////////////

                    return i.update({

                        embeds: [successEmbed],

                        components: []
                    });
                }
            }
        );

        //////////////////////////////////////////////////
        // END
        //////////////////////////////////////////////////

        collector.on(

            "end",

            async (_, reason) => {

                if (
                    reason === "time"
                ) {

                    await msg.edit({

                        content:
                            "⌛ Tiempo agotado.",

                        embeds: [],

                        components: []

                    }).catch(() => {});
                }
            }
        );
    }
};