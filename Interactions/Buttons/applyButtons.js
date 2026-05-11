const {
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const config =
    require("../../config.json");

const errReply =
    require("../../Functions/interactionErrorReply");

const correReply =
    require("../../Functions/interactionReply");

const applyGuildSchema =
    require("../../Models/applyGuildSchema");

const applyUserSchema =
    require("../../Models/applyUserSchema");

module.exports = {

    id: [
        "apply",
        "applyacept",
        "applydeny"
    ],

    //////////////////////////////////////////////////

    async execute(interaction, client) {

        try {

            //////////////////////////////////////////////////
            // CREAR APLICACION
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "apply"
            ) {

                //////////////////////////////////////////////////
                // DATA GUILD
                //////////////////////////////////////////////////

                const applyGuildData =

                    await applyGuildSchema.findOne({

                        applyGuildId:
                            interaction.guild.id
                    });

                //////////////////////////////////////////////////

                const role =

                    interaction.guild.roles.cache.get(

                        applyGuildData.applyRole
                    );

                //////////////////////////////////////////////////

                if (!role) {

                    return errReply(

                        interaction,

                        "El servidor no tiene configurado un rol.",

                        true
                    );
                }

                //////////////////////////////////////////////////
                // YA TIENE APLICACION
                //////////////////////////////////////////////////

                const userAplicacion =

                    await applyUserSchema.findOne({

                        applyGuildId:
                            interaction.guild.id,

                        applyUserId:
                            interaction.user.id
                    });

                //////////////////////////////////////////////////

                if (userAplicacion) {

                    return errReply(

                        interaction,

                        "Ya tienes una aplicación pendiente.",

                        true
                    );
                }

                //////////////////////////////////////////////////
                // YA TIENE ROL
                //////////////////////////////////////////////////

                if (

                    interaction.member.roles.cache.has(
                        role.id
                    )

                ) {

                    return errReply(

                        interaction,

                        "Ya cuentas con este rol.",

                        true
                    );
                }

                //////////////////////////////////////////////////
                // MODAL
                //////////////////////////////////////////////////

                const application =

                    new ModalBuilder()

                        .setCustomId(
                            "developerModal"
                        )

                        .setTitle(
                            "📋 Aplicación Staff"
                        );

                //////////////////////////////////////////////////
                // INPUTS
                //////////////////////////////////////////////////

                const userName =

                    new TextInputBuilder()

                        .setCustomId(
                            "username"
                        )

                        .setLabel(
                            "¿Cuál es tu nombre?"
                        )

                        .setStyle(
                            TextInputStyle.Short
                        )

                        .setRequired(true);

                //////////////////////////////////////////////////

                const userAge =

                    new TextInputBuilder()

                        .setCustomId(
                            "userage"
                        )

                        .setLabel(
                            "¿Cuál es tu edad?"
                        )

                        .setStyle(
                            TextInputStyle.Short
                        )

                        .setRequired(true);

                //////////////////////////////////////////////////

                const userPortfolio =

                    new TextInputBuilder()

                        .setCustomId(
                            "userportfolio"
                        )

                        .setLabel(
                            "Github / Portfolio"
                        )

                        .setStyle(
                            TextInputStyle.Short
                        )

                        .setRequired(true);

                //////////////////////////////////////////////////

                const userDescription =

                    new TextInputBuilder()

                        .setCustomId(
                            "userdescription"
                        )

                        .setLabel(
                            "¿Qué aportarías al servidor?"
                        )

                        .setStyle(
                            TextInputStyle.Paragraph
                        )

                        .setRequired(true)

                        .setMinLength(50);

                //////////////////////////////////////////////////
                // ROWS
                //////////////////////////////////////////////////

                const row1 =
                    new ActionRowBuilder()

                        .addComponents(
                            userName
                        );

                //////////////////////////////////////////////////

                const row2 =
                    new ActionRowBuilder()

                        .addComponents(
                            userAge
                        );

                //////////////////////////////////////////////////

                const row3 =
                    new ActionRowBuilder()

                        .addComponents(
                            userPortfolio
                        );

                //////////////////////////////////////////////////

                const row4 =
                    new ActionRowBuilder()

                        .addComponents(
                            userDescription
                        );

                //////////////////////////////////////////////////

                application.addComponents(

                    row1,
                    row2,
                    row3,
                    row4
                );

                //////////////////////////////////////////////////

                return interaction.showModal(
                    application
                );
            }

            //////////////////////////////////////////////////
            // SOLO OWNER
            //////////////////////////////////////////////////

            if (
                interaction.user.id !==
                config.developer
            ) {

                return errReply(

                    interaction,

                    "No tienes permisos para gestionar aplicaciones.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // DATA USER
            //////////////////////////////////////////////////

            const userData =

                await applyUserSchema.findOne({

                    applyGuildId:
                        interaction.guild.id,

                    applyMessageId:
                        interaction.message.id
                });

            //////////////////////////////////////////////////

            if (!userData) {

                return errReply(

                    interaction,

                    "No se encontró la aplicación.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // MEMBER
            //////////////////////////////////////////////////

            const member =

                interaction.guild.members.cache.get(

                    userData.applyUserId
                );

            //////////////////////////////////////////////////

            if (!member) {

                return errReply(

                    interaction,

                    "No se pudo encontrar el usuario.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                interaction.message.embeds[0];

            //////////////////////////////////////////////////
            // ACEPTAR
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "applyacept"
            ) {

                //////////////////////////////////////////////////
                // GUILD DATA
                //////////////////////////////////////////////////

                const dataGuild =

                    await applyGuildSchema.findOne({

                        applyGuildId:
                            interaction.guild.id
                    });

                //////////////////////////////////////////////////
                // STATUS
                //////////////////////////////////////////////////

                embed.data.fields[4] = {

                    name:
                        "Status",

                    value:
                        "Aceptado",

                    inline: true
                };

                //////////////////////////////////////////////////

                const embedAceptado =

                    EmbedBuilder

                        .from(embed)

                        .setAuthor({

                            name:
                                "✅ Aplicación Aceptada",

                            iconURL:
                                member.user.displayAvatarURL({

                                    dynamic: true
                                })
                        })

                        .setColor("#00ff99")

                        .addFields({

                            name:
                                "Aceptado por",

                            value:
                                `<@${interaction.user.id}>`
                        });

                //////////////////////////////////////////////////
                // EVITAR INTERACTION FAILED
                //////////////////////////////////////////////////

                await interaction.deferUpdate();

                //////////////////////////////////////////////////

                await interaction.message.edit({

                    embeds: [embedAceptado],

                    components: []
                });

                //////////////////////////////////////////////////
                // DAR ROL
                //////////////////////////////////////////////////

                await member.roles.add(
                    dataGuild.applyRole
                );

                //////////////////////////////////////////////////
                // EMBED USER
                //////////////////////////////////////////////////

                const embedUser =

                    new EmbedBuilder()

                        .setTitle(
                            "🎉 Aplicación Aceptada"
                        )

                        .setDescription(

                            `Tu aplicación fue aceptada exitosamente.\n\n` +

                            `🚀 Ya formas parte del staff de ${interaction.guild.name}.`
                        )

                        .setColor("#00ff99")

                        .setTimestamp();

                //////////////////////////////////////////////////

                try {

                    await member.send({

                        embeds: [embedUser]
                    });

                } catch {}

                //////////////////////////////////////////////////

                await applyUserSchema.findOneAndDelete({

                    applyGuildId:
                        interaction.guild.id,

                    applyMessageId:
                        interaction.message.id
                });

                //////////////////////////////////////////////////

                return correReply(

                    interaction,

                    "Aplicación aceptada correctamente.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // DENEGAR
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "applydeny"
            ) {

                //////////////////////////////////////////////////
                // STATUS
                //////////////////////////////////////////////////

                embed.data.fields[4] = {

                    name:
                        "Status",

                    value:
                        "Denegado",

                    inline: true
                };

                //////////////////////////////////////////////////

                const embedDenegado =

                    EmbedBuilder

                        .from(embed)

                        .setAuthor({

                            name:
                                "❌ Aplicación Denegada",

                            iconURL:
                                member.user.displayAvatarURL({

                                    dynamic: true
                                })
                        })

                        .setColor("#ff0000")

                        .addFields({

                            name:
                                "Denegado por",

                            value:
                                `<@${interaction.user.id}>`
                        });

                //////////////////////////////////////////////////
                // EVITAR ERROR
                //////////////////////////////////////////////////

                await interaction.deferUpdate();

                //////////////////////////////////////////////////

                await interaction.message.edit({

                    embeds: [embedDenegado],

                    components: []
                });

                //////////////////////////////////////////////////
                // EMBED USER
                //////////////////////////////////////////////////

                const embedUser =

                    new EmbedBuilder()

                        .setTitle(
                            "❌ Aplicación Denegada"
                        )

                        .setDescription(

                            `Tu aplicación para staff fue denegada.\n\n` +

                            `Puedes volver a intentarlo más adelante.`
                        )

                        .setColor("#ff0000")

                        .setTimestamp();

                //////////////////////////////////////////////////

                try {

                    await member.send({

                        embeds: [embedUser]
                    });

                } catch {}

                //////////////////////////////////////////////////

                await applyUserSchema.findOneAndDelete({

                    applyGuildId:
                        interaction.guild.id,

                    applyMessageId:
                        interaction.message.id
                });

                //////////////////////////////////////////////////

                return correReply(

                    interaction,

                    "Aplicación denegada correctamente.",

                    true
                );
            }

        } catch (error) {

            console.log(error);

            //////////////////////////////////////////////////

            return errReply(

                interaction,

                "Se produjo un error en el sistema de aplicaciones.",

                true
            );
        }
    }
};