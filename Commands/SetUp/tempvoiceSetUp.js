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

        try {

            //////////////////////////////////////////////////
            // DEFER
            //////////////////////////////////////////////////

            await interaction.deferReply({
                flags: 64
            });

            //////////////////////////////////////////////////
            // VALIDAR ADMIN
            //////////////////////////////////////////////////

            if (
                !interaction.member.permissions.has(
                    PermissionFlagsBits.Administrator
                )
            ) {

                return interaction.editReply({

                    content:
                        "❌ No tienes permisos para usar este comando."
                });
            }

            //////////////////////////////////////////////////
            // VALIDAR PERMISOS BOT
            //////////////////////////////////////////////////

            const botMember =
                interaction.guild.members.me;

            if (
                !botMember.permissions.has([
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.MoveMembers,
                    PermissionFlagsBits.ViewChannel
                ])
            ) {

                return interaction.editReply({

                    content:
                        "❌ Necesito permisos de `Administrar Canales` para configurar TempVoice."
                });
            }

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

                return interaction.editReply({

                    content:
                        "❌ El sistema TempVoice ya está configurado."
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
                        category.id,

                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            allow: [
                                PermissionFlagsBits.Connect,
                                PermissionFlagsBits.ViewChannel
                            ]
                        }
                    ]
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

                    .setThumbnail(
                        interaction.guild.iconURL({
                            dynamic: true
                        })
                    )

                    .setFooter({

                        text:
                            `${interaction.guild.name} • TempVoice`
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////

            await interaction.editReply({

                embeds: [embed]
            });

        } catch (error) {

            console.log(error);

            if (interaction.deferred || interaction.replied) {

                await interaction.editReply({

                    content:
                        "❌ Ocurrió un error al configurar TempVoice."
                }).catch(() => {});

            } else {

                await interaction.reply({

                    content:
                        "❌ Ocurrió un error al configurar TempVoice.",

                    flags: 64
                }).catch(() => {});
            }
        }
    }
};