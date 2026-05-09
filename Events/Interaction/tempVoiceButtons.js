const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const tempVoiceChannels =
    require("../../Models/tempVoiceChannels");

module.exports = {

    name: "interactionCreate",

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // MODALS
        //////////////////////////////////////////////////

        if (
            interaction.isModalSubmit()
        ) {

            //////////////////////////////////////////////////
            // VOICE CHANNEL
            //////////////////////////////////////////////////

            const voiceChannel =
                interaction.member.voice.channel;

            //////////////////////////////////////////////////

            if (!voiceChannel) {

                return interaction.reply({

                    content:
                        "❌ Debes estar en tu canal.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // RENAME MODAL
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "temp_rename_modal"
            ) {

                const newName =
                    interaction.fields.getTextInputValue(

                        "temp_rename_input"
                    );

                //////////////////////////////////////////////////

                await voiceChannel.setName(
                    newName
                );

                //////////////////////////////////////////////////

                return interaction.reply({

                    content:
                        `✅ Canal renombrado a \`${newName}\``,

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // LIMIT MODAL
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "temp_limit_modal"
            ) {

                const limit =
                    parseInt(

                        interaction.fields.getTextInputValue(

                            "temp_limit_input"
                        )
                    );

                //////////////////////////////////////////////////

                if (
                    isNaN(limit) ||
                    limit < 0 ||
                    limit > 99
                ) {

                    return interaction.reply({

                        content:
                            "❌ Número inválido.",

                        flags: 64
                    });
                }

                //////////////////////////////////////////////////

                await voiceChannel.setUserLimit(
                    limit
                );

                //////////////////////////////////////////////////

                return interaction.reply({

                    content:
                        `👥 Límite cambiado a ${limit}.`,

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
// BITRATE MODAL
//////////////////////////////////////////////////

if (
    interaction.customId ===
    "temp_bitrate_modal"
) {

    const bitrate =
        parseInt(

            interaction.fields.getTextInputValue(

                "temp_bitrate_input"
            )
        );

    //////////////////////////////////////////////////

    if (
        isNaN(bitrate)
    ) {

        return interaction.reply({

            content:
                "❌ Debes escribir un número válido.",

            flags: 64
        });
    }

    //////////////////////////////////////////////////
    // MAXIMO SEGUN BOOST
    //////////////////////////////////////////////////

    const maxBitrate =
        voiceChannel.guild.maximumBitrate;

    //////////////////////////////////////////////////

    const finalBitrate =
        bitrate * 1000;

    //////////////////////////////////////////////////

    if (
        finalBitrate > maxBitrate
    ) {

        return interaction.reply({

            content:
                `❌ El máximo bitrate permitido en este servidor es ${Math.floor(maxBitrate / 1000)}kbps.`,

            flags: 64
        });
    }

    //////////////////////////////////////////////////

    await voiceChannel.setBitrate(
        finalBitrate
    );

    //////////////////////////////////////////////////

    return interaction.reply({

        content:
            `🔊 Bitrate cambiado a ${bitrate}kbps.`,

        flags: 64
    });
}

            //////////////////////////////////////////////////
            // REGION MODAL
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "temp_region_modal"
            ) {

                const region =
                    interaction.fields.getTextInputValue(

                        "temp_region_input"
                    ).toLowerCase();

                //////////////////////////////////////////////////

                const validRegions = [

                    "brazil",
                    "us-east",
                    "us-west",
                    "singapore",
                    "japan",
                    "rotterdam"
                ];

                //////////////////////////////////////////////////

                if (
                    !validRegions.includes(region)
                ) {

                    return interaction.reply({

                        content:
                            "❌ Región inválida.",

                        flags: 64
                    });
                }

                //////////////////////////////////////////////////

                await voiceChannel.setRTCRegion(
                    region
                );

                //////////////////////////////////////////////////

                return interaction.reply({

                    content:
                        `🌍 Región cambiada a ${region}.`,

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // PERMIT MODAL
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "temp_permit_modal"
            ) {

                const userId =
                    interaction.fields.getTextInputValue(

                        "temp_permit_input"
                    );

                //////////////////////////////////////////////////

                const target =
                    await interaction.guild.members.fetch(

                        userId
                    ).catch(() => null);

                //////////////////////////////////////////////////

                if (!target) {

                    return interaction.reply({

                        content:
                            "❌ Usuario inválido.",

                        flags: 64
                    });
                }

                //////////////////////////////////////////////////

                await voiceChannel.permissionOverwrites.edit(

                    target.id,

                    {
                        ViewChannel: true,
                        Connect: true
                    }
                );

                //////////////////////////////////////////////////

                return interaction.reply({

                    content:
                        `➕ ${target.user.username} ahora tiene acceso.`,

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // DENY MODAL
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "temp_deny_modal"
            ) {

                const userId =
                    interaction.fields.getTextInputValue(

                        "temp_deny_input"
                    );

                //////////////////////////////////////////////////

                const target =
                    await interaction.guild.members.fetch(

                        userId
                    ).catch(() => null);

                //////////////////////////////////////////////////

                if (!target) {

                    return interaction.reply({

                        content:
                            "❌ Usuario inválido.",

                        flags: 64
                    });
                }

                //////////////////////////////////////////////////

                await voiceChannel.permissionOverwrites.delete(

                    target.id
                ).catch(() => {});

                //////////////////////////////////////////////////

                return interaction.reply({

                    content:
                        `🚫 ${target.user.username} perdió acceso.`,

                    flags: 64
                });
            }

                        //////////////////////////////////////////////////
            // KICK MODAL
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "temp_kick_modal"
            ) {

                const userId =
                    interaction.fields.getTextInputValue(

                        "temp_kick_input"
                    );

                //////////////////////////////////////////////////

                const target =
                    await interaction.guild.members.fetch(

                        userId
                    ).catch(() => null);

                //////////////////////////////////////////////////

                if (!target) {

                    return interaction.reply({

                        content:
                            "❌ Usuario inválido.",

                        flags: 64
                    });
                }

                //////////////////////////////////////////////////

                if (
                    target.voice.channelId !==
                    voiceChannel.id
                ) {

                    return interaction.reply({

                        content:
                            "❌ Ese usuario no está en la sala.",

                        flags: 64
                    });
                }

                //////////////////////////////////////////////////

                await target.voice.disconnect()
                    .catch(() => {});

                //////////////////////////////////////////////////

                return interaction.reply({

                    content:
                        `👢 ${target.user.username} fue expulsado.`,

                    flags: 64
                });
            }
        }

        //////////////////////////////////////////////////
        // BUTTONS
        //////////////////////////////////////////////////

        //////////////////////////////////////////////////
// SELECT MENUS
//////////////////////////////////////////////////

if (
    interaction.isStringSelectMenu()
) {

    const value =
        interaction.values[0];

    interaction.customId =
        value;
}

//////////////////////////////////////////////////
// BUTTONS
//////////////////////////////////////////////////

if (
    !interaction.isButton() &&
    !interaction.isStringSelectMenu()
) return;

        //////////////////////////////////////////////////

        const validButtons = [

            "temp_lock",
            "temp_unlock",
            "temp_rename",
            "temp_limit",
            "temp_hide",
            "temp_show",
            "temp_claim",
            "temp_kick",
            "temp_permit",
            "temp_deny",
            "temp_bitrate",
            "temp_region"

        ];

        //////////////////////////////////////////////////

        if (
            !validButtons.includes(
                interaction.customId
            )
        ) return;

        //////////////////////////////////////////////////
        // VOICE CHANNEL
        //////////////////////////////////////////////////

        const voiceChannel =
            interaction.member.voice.channel;

        //////////////////////////////////////////////////

        if (!voiceChannel) {

            return interaction.reply({

                content:
                    "❌ Debes estar en tu canal temporal.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // DB
        //////////////////////////////////////////////////

        const data =
            await tempVoiceChannels.findOne({

                channelId:
                    voiceChannel.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ Este no es un canal temporal.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // CLAIM
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_claim"
        ) {

            const currentOwner =
                interaction.guild.members.cache.get(

                    data.ownerId
                );

            //////////////////////////////////////////////////

            if (

                currentOwner &&

                currentOwner.voice.channelId ===
                voiceChannel.id

            ) {

                return interaction.reply({

                    content:
                        "❌ El owner actual sigue en la sala.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////

            data.ownerId =
                interaction.user.id;

            await data.save();

            //////////////////////////////////////////////////

            await voiceChannel.permissionOverwrites.edit(

                interaction.user.id,

                {
                    ManageChannels: true,
                    MoveMembers: true
                }
            );

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    "👑 Ahora eres el nuevo owner de la sala.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // OWNER CHECK
        //////////////////////////////////////////////////

        if (
            data.ownerId !==
            interaction.user.id
        ) {

            return interaction.reply({

                content:
                    "❌ No eres el owner de esta sala.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // LOCK
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_lock"
        ) {

            await voiceChannel.permissionOverwrites.edit(

                interaction.guild.roles.everyone,

                {
                    Connect: false
                }
            );

            return interaction.reply({

                content:
                    "🔒 Canal bloqueado.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // UNLOCK
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_unlock"
        ) {

            await voiceChannel.permissionOverwrites.edit(

                interaction.guild.roles.everyone,

                {
                    Connect: true
                }
            );

            return interaction.reply({

                content:
                    "🔓 Canal desbloqueado.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // HIDE
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_hide"
        ) {

            await voiceChannel.permissionOverwrites.edit(

                interaction.guild.roles.everyone,

                {
                    ViewChannel: false
                }
            );

            return interaction.reply({

                content:
                    "👁️ Canal ocultado.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // SHOW
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_show"
        ) {

            await voiceChannel.permissionOverwrites.edit(

                interaction.guild.roles.everyone,

                {
                    ViewChannel: true
                }
            );

            return interaction.reply({

                content:
                    "👀 Canal visible nuevamente.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // RENAME BUTTON
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_rename"
        ) {

            const modal =
                new ModalBuilder()

                    .setCustomId(
                        "temp_rename_modal"
                    )

                    .setTitle(
                        "Renombrar Sala"
                    );

            //////////////////////////////////////////////////

            const input =
                new TextInputBuilder()

                    .setCustomId(
                        "temp_rename_input"
                    )

                    .setLabel(
                        "Nuevo nombre del canal"
                    )

                    .setPlaceholder(
                        "Ej: Sala de Bryant"
                    )

                    .setStyle(
                        TextInputStyle.Short
                    )

                    .setMaxLength(30)

                    .setRequired(true);

            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(input);

            //////////////////////////////////////////////////

            modal.addComponents(row);

            //////////////////////////////////////////////////

            return interaction.showModal(
                modal
            );
        }

        //////////////////////////////////////////////////
        // LIMIT BUTTON
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_limit"
        ) {

            const modal =
                new ModalBuilder()

                    .setCustomId(
                        "temp_limit_modal"
                    )

                    .setTitle(
                        "Límite de Usuarios"
                    );

            //////////////////////////////////////////////////

            const input =
                new TextInputBuilder()

                    .setCustomId(
                        "temp_limit_input"
                    )

                    .setLabel(
                        "Máximo de usuarios"
                    )

                    .setPlaceholder(
                        "0 - 99"
                    )

                    .setStyle(
                        TextInputStyle.Short
                    )

                    .setRequired(true);

            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(input);

            //////////////////////////////////////////////////

            modal.addComponents(row);

            //////////////////////////////////////////////////

            return interaction.showModal(
                modal
            );
        }

        //////////////////////////////////////////////////
        // BITRATE BUTTON
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_bitrate"
        ) {

            const modal =
                new ModalBuilder()

                    .setCustomId(
                        "temp_bitrate_modal"
                    )

                    .setTitle(
                        "Cambiar Bitrate"
                    );

            //////////////////////////////////////////////////

            const input =
                new TextInputBuilder()

                    .setCustomId(
                        "temp_bitrate_input"
                    )

                    .setLabel(
                        "Bitrate en kbps"
                    )

                    .setPlaceholder(
                        "64 / 96 / 128"
                    )

                    .setStyle(
                        TextInputStyle.Short
                    )

                    .setRequired(true);

            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(input);

            //////////////////////////////////////////////////

            modal.addComponents(row);

            //////////////////////////////////////////////////

            return interaction.showModal(
                modal
            );
        }

        //////////////////////////////////////////////////
        // REGION BUTTON
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_region"
        ) {

            const modal =
                new ModalBuilder()

                    .setCustomId(
                        "temp_region_modal"
                    )

                    .setTitle(
                        "Cambiar Región"
                    );

            //////////////////////////////////////////////////

            const input =
                new TextInputBuilder()

                    .setCustomId(
                        "temp_region_input"
                    )

                    .setLabel(
                        "Región RTC"
                    )

                    .setPlaceholder(
                        "brazil / us-east"
                    )

                    .setStyle(
                        TextInputStyle.Short
                    )

                    .setRequired(true);

            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(input);

            //////////////////////////////////////////////////

            modal.addComponents(row);

            //////////////////////////////////////////////////

            return interaction.showModal(
                modal
            );
        }

        //////////////////////////////////////////////////
        // PERMIT BUTTON
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_permit"
        ) {

            const modal =
                new ModalBuilder()

                    .setCustomId(
                        "temp_permit_modal"
                    )

                    .setTitle(
                        "Permitir Usuario"
                    );

            //////////////////////////////////////////////////

            const input =
                new TextInputBuilder()

                    .setCustomId(
                        "temp_permit_input"
                    )

                    .setLabel(
                        "ID del usuario"
                    )

                    .setPlaceholder(
                        "123456789"
                    )

                    .setStyle(
                        TextInputStyle.Short
                    )

                    .setRequired(true);

            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(input);

            //////////////////////////////////////////////////

            modal.addComponents(row);

            //////////////////////////////////////////////////

            return interaction.showModal(
                modal
            );
        }

        //////////////////////////////////////////////////
        // DENY BUTTON
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_deny"
        ) {

            const modal =
                new ModalBuilder()

                    .setCustomId(
                        "temp_deny_modal"
                    )

                    .setTitle(
                        "Quitar Acceso"
                    );

            //////////////////////////////////////////////////

            const input =
                new TextInputBuilder()

                    .setCustomId(
                        "temp_deny_input"
                    )

                    .setLabel(
                        "ID del usuario"
                    )

                    .setPlaceholder(
                        "123456789"
                    )

                    .setStyle(
                        TextInputStyle.Short
                    )

                    .setRequired(true);

            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(input);

            //////////////////////////////////////////////////

            modal.addComponents(row);

            //////////////////////////////////////////////////

            return interaction.showModal(
                modal
            );
        }

                //////////////////////////////////////////////////
        // KICK BUTTON
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "temp_kick"
        ) {

            const modal =
                new ModalBuilder()

                    .setCustomId(
                        "temp_kick_modal"
                    )

                    .setTitle(
                        "Expulsar Usuario"
                    );

            //////////////////////////////////////////////////

            const input =
                new TextInputBuilder()

                    .setCustomId(
                        "temp_kick_input"
                    )

                    .setLabel(
                        "ID del usuario"
                    )

                    .setPlaceholder(
                        "123456789"
                    )

                    .setStyle(
                        TextInputStyle.Short
                    )

                    .setRequired(true);

            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(input);

            //////////////////////////////////////////////////

            modal.addComponents(row);

            //////////////////////////////////////////////////

            return interaction.showModal(
                modal
            );
        }
    }
};