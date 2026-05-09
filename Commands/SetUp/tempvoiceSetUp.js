const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const tempVoiceSchema =
    require("../../Models/tempVoiceSchema");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("tempvoice-setup")

        .setDescription(
            "Configura el sistema de TempVoice"
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // VERIFICAR CONFIG
        //////////////////////////////////////////////////

        const data =
            await tempVoiceSchema.findOne({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        if (data) {

            return interaction.reply({

                content:
                    "❌ El sistema TempVoice ya está configurado.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // CREAR CATEGORIA
        //////////////////////////////////////////////////

        const category =
            await interaction.guild.channels.create({

                name:
                    "TEMP VOICE",

                type:
                    ChannelType.GuildCategory
            });

        //////////////////////////////////////////////////
        // CREAR CANAL CREADOR
        //////////////////////////////////////////////////

        const creatorChannel =
            await interaction.guild.channels.create({

                name:
                    "➕ Create Room",

                type:
                    ChannelType.GuildVoice,

                parent:
                    category.id
            });

        //////////////////////////////////////////////////
        // CREAR CANAL PANEL
        //////////////////////////////////////////////////

        const panelChannel =
            await interaction.guild.channels.create({

                name:
                    "🎛️tempvoice-control",

                type:
                    ChannelType.GuildText,

                parent:
                    category.id
            });

        //////////////////////////////////////////////////
        // GUARDAR DB
        //////////////////////////////////////////////////

        await tempVoiceSchema.create({

            guildId:
                interaction.guild.id,

            creatorChannelId:
                creatorChannel.id,

            categoryId:
                category.id,

            panelChannelId:
                panelChannel.id
        });

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "✅ TempVoice Configurado"
                )

                .setDescription(

                    `El sistema TempVoice fue configurado correctamente.\n\n` +

                    `📂 Categoría: ${category}\n` +

                    `🎤 Canal creador: ${creatorChannel}\n` +

                    `🎛️ Panel TempVoice: ${panelChannel}`
                )

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};