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

            .addRoleOption(o =>

                o.setName("rol")

                    .setDescription(
                        "Rol que se añadirá a la tienda"
                    )

                    .setRequired(true)
            )

            .addIntegerOption(o =>

                o.setName("precio")

                    .setDescription(
                        "Precio del rol"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // ROLE
        //////////////////////////////////////////////////

        const role =
            interaction.options.getRole(
                "rol"
            );

        //////////////////////////////////////////////////
        // PRICE
        //////////////////////////////////////////////////

        const price =
            interaction.options.getInteger(
                "precio"
            );

        //////////////////////////////////////////////////
        // VALIDAR SI YA EXISTE
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

                embeds: [

                    new EmbedBuilder()

                        .setColor("#ff0000")

                        .setTitle(
                            "⚠️ Rol ya registrado"
                        )

                        .setDescription(

                            `El rol ${role} ya se encuentra dentro de la tienda del servidor.`
                        )
                ],

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
                    "🛒 Confirmar registro de rol"
                )

                .setDescription(

                    `¿Deseas añadir el rol ${role} a la tienda del servidor?\n\n` +

                    `💰 **Precio asignado**\n` +

                    `> ${price.toLocaleString()} monedas\n\n` +

                    `🏪 Los usuarios podrán comprar este rol usando el sistema económico.`
                )

                .addFields({

                    name: "👮 Administrador",
                    value: `${interaction.user}`,
                    inline: true

                }, {

                    name: "🎭 Rol",
                    value: `${role}`,
                    inline: true
                })

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
                        "Tienes 30 segundos para responder"
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // BOTONES
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
        // SEND
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
                // SOLO AUTOR
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
                // CANCELAR
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
                // CONFIRMAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "shopadd_confirm"

                ) {

                    //////////////////////////////////////////////////
                    // CREAR ITEM
                    //////////////////////////////////////////////////

                    await ShopItem.create({

                        guildId:
                            interaction.guild.id,

                        roleId:
                            role.id,

                        price
                    });

                    //////////////////////////////////////////////////
                    // SUCCESS EMBED
                    //////////////////////////////////////////////////

                    const successEmbed =

                        new EmbedBuilder()

                            .setColor(
                                role.color || "#00ff99"
                            )

                            .setTitle(
                                "✅ Rol añadido correctamente"
                            )

                            .setDescription(

                                `El rol ${role} ahora forma parte de la tienda del servidor.\n\n` +

                                `💰 **Precio configurado**\n` +

                                `> ${price.toLocaleString()} monedas\n\n` +

                                `🛒 Los usuarios ya pueden comprar este rol usando el sistema económico.`
                            )

                            .addFields({

                                name: "👮 Administrador",
                                value: `${interaction.user}`,
                                inline: true

                            }, {

                                name: "🎭 Rol añadido",
                                value: `${role}`,
                                inline: true
                            })

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
                                    "Bryant's Economy System"
                            })

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
        // TIMEOUT
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