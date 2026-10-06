const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("tempvoice-panel")

        .setDescription(
            "Envía el panel global de TempVoice"
        )

        // 🔒 SOLO ADMINS
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .setDMPermission(false),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // SEGURIDAD EXTRA
        //////////////////////////////////////////////////

        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes permisos para usar este comando.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // VALIDAR PERMISOS DEL BOT
        //////////////////////////////////////////////////

        const permissions =
            interaction.channel.permissionsFor(
                interaction.guild.members.me
            );

        if (
            !permissions.has([
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ViewChannel
            ])
        ) {

            return interaction.reply({

                content:
                    "❌ No tengo permisos suficientes en este canal.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🎛️ • Panel TempVoice"
                )

                .setDescription(

                    `🎧 • Panel TempVoice\n\n` +

                    `Personaliza y administra tu sala temporal de voz de manera rápida y sencilla utilizando los menús desplegables disponibles debajo de este panel.\n\n` +

                    `🔒 • Opciones de Privacidad\n` +
                    `• Controla quién puede entrar y ver tu canal\n` +
                    `• Bloquea o desbloquea accesos fácilmente\n` +
                    `• Mantén tu sala privada cuando lo necesites\n\n` +

                    `👥 • Opciones de Usuarios\n` +
                    `• Permite acceso a miembros específicos\n` +
                    `• Expulsa usuarios de tu sala\n` +
                    `• Gestiona quién puede permanecer dentro\n\n` +

                    `⚙️ • Configuración\n` +
                    `• Cambia el nombre de tu sala\n` +
                    `• Ajusta el límite de usuarios\n` +
                    `• Modifica el bitrate y la región de voz\n\n` +

                    `📌 Debes estar conectado dentro de tu sala temporal para utilizar todas las funciones del panel.\n\n` +

                    `💜 Disfruta de una experiencia totalmente personalizada junto a tu comunidad.`
                )

                .setThumbnail(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666281651441925/logo_principal.png"
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                .setFooter({

                    text:
                        `Panel creado por ${interaction.user.username}`,

                    iconURL:
                        interaction.user.displayAvatarURL({
                            dynamic: true
                        })
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // PRIVACIDAD
        //////////////////////////////////////////////////

        const privacyMenu =
            new StringSelectMenuBuilder()

                .setCustomId(
                    "tempvoice_privacy"
                )

                .setPlaceholder(
                    "🔒 Opciones de Privacidad"
                )

                .addOptions(

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Bloquear")

                        .setDescription(
                            "Nadie podrá entrar"
                        )

                        .setEmoji("🔒")

                        .setValue("temp_lock"),

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Desbloquear")

                        .setDescription(
                            "Todos podrán entrar"
                        )

                        .setEmoji("🔓")

                        .setValue("temp_unlock"),

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Ocultar")

                        .setDescription(
                            "Ocultar canal"
                        )

                        .setEmoji("👁️")

                        .setValue("temp_hide"),

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Mostrar")

                        .setDescription(
                            "Mostrar canal"
                        )

                        .setEmoji("👀")

                        .setValue("temp_show")
                );

        //////////////////////////////////////////////////
        // USUARIOS
        //////////////////////////////////////////////////

        const usersMenu =
            new StringSelectMenuBuilder()

                .setCustomId(
                    "tempvoice_users"
                )

                .setPlaceholder(
                    "👥 Opciones de Usuarios"
                )

                .addOptions(

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Permitir")

                        .setDescription(
                            "Dar acceso a un usuario"
                        )

                        .setEmoji("➕")

                        .setValue("temp_permit"),

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Denegar")

                        .setDescription(
                            "Quitar acceso"
                        )

                        .setEmoji("🚫")

                        .setValue("temp_deny"),

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Expulsar")

                        .setDescription(
                            "Kickear usuario"
                        )

                        .setEmoji("👢")

                        .setValue("temp_kick"),

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Claim")

                        .setDescription(
                            "Reclamar ownership"
                        )

                        .setEmoji("👑")

                        .setValue("temp_claim")
                );

        //////////////////////////////////////////////////
        // CONFIG
        //////////////////////////////////////////////////

        const configMenu =
            new StringSelectMenuBuilder()

                .setCustomId(
                    "tempvoice_config"
                )

                .setPlaceholder(
                    "⚙️ Configuración"
                )

                .addOptions(

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Renombrar")

                        .setDescription(
                            "Cambiar nombre"
                        )

                        .setEmoji("✏️")

                        .setValue("temp_rename"),

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Límite")

                        .setDescription(
                            "Cambiar límite"
                        )

                        .setEmoji("👥")

                        .setValue("temp_limit"),

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Bitrate")

                        .setDescription(
                            "Cambiar calidad"
                        )

                        .setEmoji("🔊")

                        .setValue("temp_bitrate"),

                    new StringSelectMenuOptionBuilder()

                        .setLabel("Región")

                        .setDescription(
                            "Cambiar región"
                        )

                        .setEmoji("🌍")

                        .setValue("temp_region")
                );

        //////////////////////////////////////////////////
        // ROWS
        //////////////////////////////////////////////////

        const row1 =
            new ActionRowBuilder()
                .addComponents(privacyMenu);

        const row2 =
            new ActionRowBuilder()
                .addComponents(usersMenu);

        const row3 =
            new ActionRowBuilder()
                .addComponents(configMenu);

        //////////////////////////////////////////////////
        // ENVIAR PANEL
        //////////////////////////////////////////////////

        await interaction.channel.send({

            embeds: [embed],

            components: [
                row1,
                row2,
                row3
            ]
        });

        //////////////////////////////////////////////////
        // RESPUESTA
        //////////////////////////////////////////////////

        await interaction.reply({

            content:
                "✅ Panel TempVoice enviado correctamente.",

            flags: 64
        });
    }
};