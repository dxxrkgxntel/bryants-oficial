const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const ShopItem =
    require("../../Models/ShopItem");

const getUser =
    require("../../utils/getUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("comprar-rol")

            .setDescription(
                "Compra un rol de la tienda"
            )

            .addRoleOption(o =>

                o.setName("rol")

                    .setDescription(
                        "Rol que deseas comprar"
                    )

                    .setRequired(true)
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
        // USER DATA
        //////////////////////////////////////////////////

        const user =
            await getUser(

                interaction.guild.id,
                interaction.user.id
            );

        //////////////////////////////////////////////////
        // ITEM
        //////////////////////////////////////////////////

        const item =
            await ShopItem.findOne({

                guildId:
                    interaction.guild.id,

                roleId:
                    role.id
            });

        //////////////////////////////////////////////////
        // VALIDAR TIENDA
        //////////////////////////////////////////////////

        if (!item) {

            return interaction.reply({

                content:
                    "❌ Ese rol no está en la tienda.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // VALIDAR DINERO
        //////////////////////////////////////////////////

        if (
            user.wallet < item.price
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // YA TIENE ROL
        //////////////////////////////////////////////////

        if (

            interaction.member.roles.cache.has(
                role.id
            )

        ) {

            return interaction.reply({

                content:
                    "⚠️ Ya tienes ese rol.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // PERMISOS BOT
        //////////////////////////////////////////////////

        if (

            role.position >=
            interaction.guild.members.me.roles.highest.position

        ) {

            return interaction.reply({

                content:
                    "❌ No puedo otorgar ese rol porque está por encima de mi jerarquía.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EMBED CONFIRMACION
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor(
                    role.color || "#8A2BE2"
                )

                .setTitle(
                    "🛒 Confirmar compra"
                )

                .setDescription(

                    `🎭 Rol: ${role}\n\n` +

                    `💰 Precio: ` +

                    `**${item.price.toLocaleString()} monedas**\n\n` +

                    `⚠️ Esta compra no puede reembolsarse.`
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

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
                            "buy_confirm"
                        )

                        .setLabel(
                            "Comprar"
                        )

                        .setEmoji("🛒")

                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            "buy_cancel"
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
        // COLLECT
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
                    "buy_cancel"

                ) {

                    collector.stop();

                    return i.update({

                        content:
                            "❌ Compra cancelada.",

                        embeds: [],

                        components: []
                    });
                }

                ////////////////////////////////////////////////
                // CONFIRMAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "buy_confirm"

                ) {

                    //////////////////////////////////////////////////
                    // VALIDAR DINERO OTRA VEZ
                    //////////////////////////////////////////////////

                    if (
                        user.wallet < item.price
                    ) {

                        collector.stop();

                        return i.update({

                            content:
                                "❌ Ya no tienes suficiente dinero.",

                            embeds: [],

                            components: []
                        });
                    }

                    //////////////////////////////////////////////////
                    // COMPRAR
                    //////////////////////////////////////////////////

                    user.wallet -= item.price;

                    //////////////////////////////////////////////////

                    await user.save();

                    //////////////////////////////////////////////////

                    await interaction.member.roles
                        .add(role)
                        .catch(() => {});

                    //////////////////////////////////////////////////
                    // EMBED SUCCESS
                    //////////////////////////////////////////////////

                    const successEmbed =

                        new EmbedBuilder()

                            .setColor(
                                role.color || "#00ff99"
                            )

                            .setTitle(
                                "🎉 Compra realizada"
                            )

                            .setDescription(

                                `✅ Has comprado el rol ${role}\n\n` +

                                `💸 Precio pagado: ` +

                                `**${item.price.toLocaleString()} monedas**\n\n` +

                                `💵 Wallet restante: ` +

                                `**${user.wallet.toLocaleString()} monedas**`
                            )

                            .setThumbnail(

                                interaction.user.displayAvatarURL({

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