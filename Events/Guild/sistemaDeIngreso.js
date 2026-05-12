const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require("discord.js");

const welcomeSchema =
    require("../../Models/welcomeSchema");

module.exports = {

    name: "guildMemberAdd",

    async execute(member) {

        try {

            //////////////////////////////////////////////////
            // BUSCAR DATA
            //////////////////////////////////////////////////

            const data =
                await welcomeSchema.findOne({

                    Guild: member.guild.id
                });

            //////////////////////////////////////////////////

            if (!data) return;

            //////////////////////////////////////////////////
            // OBTENER CANAL
            //////////////////////////////////////////////////

            const channel =
                member.guild.channels.cache.get(
                    data.Channel
                );

            //////////////////////////////////////////////////

            if (!channel) {

                console.log(
                    `❌ Canal de bienvenida no encontrado en ${member.guild.name}`
                );

                return;
            }

            //////////////////////////////////////////////////
            // VALIDAR PERMISOS
            //////////////////////////////////////////////////

            const botMember =
                member.guild.members.me;

            if (
                !channel.permissionsFor(botMember)
                    .has([
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks
                    ])
            ) {

                return console.log(
                    `❌ Sin permisos en ${channel.name}`
                );
            }

            //////////////////////////////////////////////////
            // DATOS
            //////////////////////////////////////////////////

            const created =
                Math.floor(
                    member.user.createdTimestamp / 1000
                );

            const memberCount =
                member.guild.memberCount;

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor(
                        data.Color || "#8A2BE2"
                    )

                    .setTitle(
                        `✨ Bienvenido/a a ${member.guild.name}`
                    )

                    .setDescription(

                        `${data.MessageDes || "Esperamos que disfrutes tu estadía en el servidor."}\n\n` +

                        `👤 Usuario: ${member}\n` +

                        `🆔 ID: \`${member.id}\`\n` +

                        `📅 Cuenta creada: <t:${created}:R>\n` +

                        `👥 Miembro número: **#${memberCount}**`
                    )

                    .setThumbnail(

                        data.Thumbnail ||

                        member.guild.iconURL({
                            dynamic: true,
                            size: 1024
                        })
                    )

                    .setImage(
                        data.ImagenDesc || null
                    )

                    .setFooter({

                        text:
                            `${member.guild.name} • Sistema de Bienvenidas`,

                        iconURL:
                            member.user.displayAvatarURL({
                                dynamic: true
                            })
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////
            // BOTONES (OPCIONAL)
            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()

                            .setLabel("Invitar Bot")

                            .setEmoji("🚀")

                            .setStyle(ButtonStyle.Link)

                            .setURL(
                                "https://discord.com/oauth2/authorize?client_id=1497973126569656540&permissions=8&scope=bot%20applications.commands"
                            )
                    );

            //////////////////////////////////////////////////
            // ENVIAR
            //////////////////////////////////////////////////

            await channel.send({

                content:
                    `🎉 ¡Bienvenido ${member}!`,

                embeds: [embed],

                components: [row]
            });

        } catch (error) {

            console.log(
                "❌ Error en sistemaDeIngreso:",
                error
            );
        }
    }
};