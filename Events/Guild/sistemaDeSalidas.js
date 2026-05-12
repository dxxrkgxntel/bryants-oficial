const {
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const leaveSchema =
    require("../../Models/leaveSchema");

module.exports = {

    name: "guildMemberRemove",

    async execute(member) {

        try {

            //////////////////////////////////////////////////
            // BUSCAR DATA
            //////////////////////////////////////////////////

            const data =
                await leaveSchema.findOne({

                    Guild: member.guild.id
                });

            //////////////////////////////////////////////////

            if (!data) return;

            //////////////////////////////////////////////////
            // CANAL
            //////////////////////////////////////////////////

            const leaveChannel =
                member.guild.channels.cache.get(
                    data.Channel
                );

            //////////////////////////////////////////////////

            if (!leaveChannel) {

                return console.log(
                    `❌ Canal de salidas no encontrado en ${member.guild.name}`
                );
            }

            //////////////////////////////////////////////////
            // PERMISOS
            //////////////////////////////////////////////////

            const botMember =
                member.guild.members.me;

            if (
                !leaveChannel.permissionsFor(botMember)
                    .has([
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks
                    ])
            ) {

                return console.log(
                    `❌ Sin permisos en ${leaveChannel.name}`
                );
            }

            //////////////////////////////////////////////////
            // DATOS
            //////////////////////////////////////////////////

            const leaveDesc =
                data.MessageDes ||
                "Un usuario ha salido del servidor.";

            const leaveImg =
                data.ImagenDesc;

            const leaveThumbnail =
                data.Thumbnail;

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const leaveEmbed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🚪 Usuario salió del servidor"
                    )

                    .setDescription(

                        `${leaveDesc}\n\n` +

                        `👤 Usuario: **${member.user.tag}**\n` +

                        `🆔 ID: \`${member.id}\`\n` +

                        `💔 Ahora somos **${member.guild.memberCount}** miembros`
                    )

                    .setThumbnail(

                        leaveThumbnail ||

                        member.user.displayAvatarURL({
                            dynamic: true,
                            size: 1024
                        })
                    )

                    .setImage(
                        leaveImg || null
                    )

                    .setFooter({

                        text:
                            `${member.guild.name} • Sistema de Salidas`,

                        iconURL:
                            member.guild.iconURL({
                                dynamic: true
                            })
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////
            // ENVIAR
            //////////////////////////////////////////////////

            await leaveChannel.send({

                content:
                    `💨 Se fue **${member.user.tag}**`,

                embeds: [leaveEmbed]
            });

        } catch (error) {

            console.log(
                "❌ Error en sistemaDeSalidas:",
                error
            );
        }
    }
};