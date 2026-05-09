const {SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()

        .setName("tempvoice-panel")
        .setDescription("Envía el panel global de TempVoice")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")
                .setTitle("🎛️ - Panel TempVoice")
                .setDescription(`Administra tu canal temporal usando los menús desplegables.\n\n` +`⚠️ Debes estar dentro de tu sala temporal.`)
                .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1501666281651441925/logo_principal.png?ex=69ff8a35&is=69fe38b5&hm=93a35cefa66cd30f2730eaedc8edb5c83509e4d7ccbfcfc7ad5e24c4f9254f90&=&format=webp&quality=lossless&width=694&height=694')
                .setImage('https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=69ff8a34&is=69fe38b4&hm=20d0de70c8ae315aae73b3f468611e5d74239caf34394d34aca4cec64cdfaef0&=&format=webp&quality=lossless&width=1288&height=515');

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

                .addComponents(
                    privacyMenu
                );

        //////////////////////////////////////////////////

        const row2 =
            new ActionRowBuilder()

                .addComponents(
                    usersMenu
                );

        //////////////////////////////////////////////////

        const row3 =
            new ActionRowBuilder()

                .addComponents(
                    configMenu
                );

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

        await interaction.reply({

            content:
                "✅ Panel enviado.",

            flags: 64
        });
    }
};