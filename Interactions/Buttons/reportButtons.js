const {
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const errReply =
    require("../../Functions/interactionErrorReply");

const correReply =
    require("../../Functions/interactionReply");

const reportUserSchema =
    require("../../Models/reportUserSchema");

module.exports = {

    id: [
        "reportban",
        "reportkick",
        "reportto"
    ],

    //////////////////////////////////////////////////

    async execute(interaction, client) {

        const {
            guild,
            message
        } = interaction;

        //////////////////////////////////////////////////
        // CONFIGURACION
        //////////////////////////////////////////////////

        const configs = {

            reportban: {

                permission:
                    PermissionFlagsBits.BanMembers,

                title:
                    `Fuiste baneado de ${guild.name}`,

                description:
                    `Por favor no seas tóxico o no **rompas las reglas del servidor**`,

                success:
                    "Se sancionó correctamente al usuario (Baneado)",

                action:
                    async member => {

                        await member.ban();
                    }
            },

            //////////////////////////////////////////////////

            reportkick: {

                permission:
                    PermissionFlagsBits.KickMembers,

                title:
                    `Fuiste kickeado de ${guild.name}`,

                description:
                    `Puedes volver a entrar al servidor con una nueva invitación.\nPor favor no seas tóxico o no **rompas las reglas del servidor**`,

                success:
                    "Se sancionó correctamente al usuario (Kickeado)",

                action:
                    async member => {

                        await member.kick();
                    }
            },

            //////////////////////////////////////////////////

            reportto: {

                permission:
                    PermissionFlagsBits.ModerateMembers,

                title:
                    `Te dieron timeout en ${guild.name}`,

                description:
                    `Por favor no seas tóxico o no **rompas las reglas del servidor**`,

                success:
                    "Se sancionó correctamente al usuario (Timeout)",

                action:
                    async member => {

                        await member.timeout(
                            15 * 60 * 1000
                        );
                    }
            }
        };

        //////////////////////////////////////////////////
        // CONFIG ACTUAL
        //////////////////////////////////////////////////

        const config =
            configs[
                interaction.customId
            ];

        //////////////////////////////////////////////////

        if (!config)
            return;

        //////////////////////////////////////////////////
        // PERMISOS
        //////////////////////////////////////////////////

        if (

            !interaction.member.permissions.has(
                config.permission
            )

        ) {

            return errReply(

                interaction,

                "No tienes permisos para hacer esto.",

                true
            );
        }

        //////////////////////////////////////////////////

        try {

            //////////////////////////////////////////////////
            // DB
            //////////////////////////////////////////////////

            const userData =

                await reportUserSchema.findOne({

                    reportGuildId:
                        guild.id,

                    reportMessageId:
                        message.id
                });

            //////////////////////////////////////////////////

            if (!userData) {

                return errReply(

                    interaction,

                    "No se encontró la data del reporte.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // MEMBER
            //////////////////////////////////////////////////

            const member =

                guild.members.cache.get(

                    userData.reportUserId
                );

            //////////////////////////////////////////////////

            if (!member) {

                return errReply(

                    interaction,

                    "No se pudo encontrar al usuario.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // EMBED BASE
            //////////////////////////////////////////////////

            const embed =
                message.embeds[0];

            //////////////////////////////////////////////////
            // EMBED MD
            //////////////////////////////////////////////////

            const userEmbed =

                new EmbedBuilder()

                    .setAuthor({

                        name:
                            member.user.tag,

                        iconURL:
                            member.user.displayAvatarURL({

                                dynamic: true
                            })
                    })

                    .setTitle(
                        config.title
                    )

                    .setColor("#8A2BE2")

                    .setDescription(
                        config.description
                    )

                    .setTimestamp();

            //////////////////////////////////////////////////
            // MD
            //////////////////////////////////////////////////

            try {

                await member.send({

                    embeds: [userEmbed]
                });

                embed.data.fields[1] = {

                    name:
                        "Enviado al MD",

                    value:
                        "✔️",

                    inline: true
                };

            } catch {

                embed.data.fields[1] = {

                    name:
                        "Enviado al MD",

                    value:
                        "❌",

                    inline: true
                };
            }

            //////////////////////////////////////////////////
            // USUARIO SANCIONADO
            //////////////////////////////////////////////////

            embed.data.fields[2] = {

                name:
                    "Usuario Sancionado",

                value:
                    "✔️",

                inline: true
            };

            //////////////////////////////////////////////////
            // EDIT EMBED
            //////////////////////////////////////////////////

            const editEmbed =

                EmbedBuilder

                    .from(embed)

                    .setColor("#8A2BE2");

            //////////////////////////////////////////////////
            // EVITAR INTERACTION FAILED
            //////////////////////////////////////////////////

            await interaction.deferUpdate();

            //////////////////////////////////////////////////
            // ACCION
            //////////////////////////////////////////////////

            await config.action(
                member
            );

            //////////////////////////////////////////////////
            // EDIT MESSAGE
            //////////////////////////////////////////////////

            await message.edit({

                embeds: [editEmbed],

                components: []
            });

            //////////////////////////////////////////////////

            return correReply(

                interaction,

                config.success,

                true
            );

        } catch (error) {

            console.log(error);

            //////////////////////////////////////////////////

            return errReply(

                interaction,

                "Se produjo un error al tratar de sancionar al usuario.",

                true
            );
        }
    }
};