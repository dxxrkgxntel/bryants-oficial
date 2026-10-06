const {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder
} = require('discord.js');

const errReply =
    require('../../Functions/interactionErrorReply');

const correReply =
    require('../../Functions/interactionReply');

const confesionesSchema =
    require('../../Models/confesionesSetUp');

//////////////////////////////////////////////////////
// COOLDOWN
//////////////////////////////////////////////////////

const cooldown =
    new Set();

//////////////////////////////////////////////////////

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName('confesiones')

            .setDescription(
                'Di una confesión.'
            )

            .addStringOption(option =>

                option

                    .setName('description')

                    .setDescription(
                        'Qué confesión deseas realizar'
                    )

                    .setMaxLength(2048)

                    .setRequired(true)
            )

            .addStringOption(option =>

                option

                    .setName('elegir')

                    .setDescription(
                        'Deseas que sea pública o no'
                    )

                    .addChoices(

                        {
                            name: 'Público',

                            value: 'p'
                        },

                        {
                            name: 'Privado',

                            value: 'c'
                        }
                    )

                    .setRequired(true)
            ),

    //////////////////////////////////////////////////////

    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */

    async execute(interaction) {

        //////////////////////////////////////////////////////
        // CLIENT
        //////////////////////////////////////////////////////

        const client =
            interaction.client;

        //////////////////////////////////////////////////////
        // COOLDOWN
        //////////////////////////////////////////////////////

        if (
            cooldown.has(
                interaction.user.id
            )
        ) {

            return errReply(

                interaction,

                "⏳ Espera antes de enviar otra confesión.",

                true
            );
        }

        //////////////////////////////////////////////////////

        cooldown.add(
            interaction.user.id
        );

        //////////////////////////////////////////////////////

        setTimeout(() => {

            cooldown.delete(
                interaction.user.id
            );

        }, 30000);

        //////////////////////////////////////////////////////
        // OPTIONS
        //////////////////////////////////////////////////////

        const { options } =
            interaction;

        //////////////////////////////////////////////////////
        // DESCRIPTION
        //////////////////////////////////////////////////////

        const desc =

            options.getString(
                'description'
            );

        //////////////////////////////////////////////////////
        // SAFE DESCRIPTION
        //////////////////////////////////////////////////////

        const safeDesc =

            desc.replace(
                /```/g,
                "'''"
            );

        //////////////////////////////////////////////////////
        // TYPE
        //////////////////////////////////////////////////////

        const elegir =

            options.getString(
                'elegir'
            );

        //////////////////////////////////////////////////////

        try {

            //////////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////////

            const confesionesData =

                await confesionesSchema.findOne({

                    guildId:
                        interaction.guild.id
                });

            //////////////////////////////////////////////////////

            if (!confesionesData) {

                return correReply(

                    interaction,

                    "❌ No se ha creado todavía el sistema de confesiones.",

                    true
                );
            }

            //////////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////////

            const channel =

                client.channels.cache.get(

                    confesionesData.channelId
                );

            //////////////////////////////////////////////////////

            if (!channel) {

                return errReply(

                    interaction,

                    "❌ No se encontró el canal.",

                    true
                );
            }

            //////////////////////////////////////////////////////
            // VALID CHANNEL
            //////////////////////////////////////////////////////

            if (!channel.isTextBased()) {

                return errReply(

                    interaction,

                    "❌ El canal configurado no es válido.",

                    true
                );
            }

            //////////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor('#8A2BE2')

                    .setTimestamp()

                    .setFooter({

                        text:
                            `${interaction.guild.name}`,

                        iconURL:

                            client.user.avatarURL({

                                dynamic: true
                            })
                    });

            //////////////////////////////////////////////////////
            // PUBLIC
            //////////////////////////////////////////////////////

            if (elegir === 'p') {

                embed

                    .setAuthor({

                        name:

                            `${interaction.user.username} acaba de realizar una confesión`,

                        iconURL:

                            interaction.user.avatarURL({

                                dynamic: true
                            })
                    })

                    .setThumbnail(

                        interaction.user.avatarURL({

                            dynamic: true
                        })
                    )

                    .setDescription(

                        `## 📢 Confesión Pública\n\n` +

                        `\`\`\`\n${safeDesc}\n\`\`\``
                    );

                //////////////////////////////////////////////////////

                await channel.send({

                    embeds: [embed]
                });

                //////////////////////////////////////////////////////

                return correReply(

                    interaction,

                    "✅ Se envió correctamente tu confesión pública.",

                    true
                );
            }

            //////////////////////////////////////////////////////
            // PRIVATE
            //////////////////////////////////////////////////////

            if (elegir === 'c') {

                embed

                    .setAuthor({

                        name:
                            `Acaban de realizar una confesión privada 😏`
                    })

                    .setDescription(

                        `## 🔒 Confesión Privada\n\n` +

                        `\`\`\`\n${safeDesc}\n\`\`\``
                    );

                //////////////////////////////////////////////////////

                await channel.send({

                    embeds: [embed]
                });

                //////////////////////////////////////////////////////

                return correReply(

                    interaction,

                    "✅ Se envió correctamente tu confesión privada.",

                    true
                );
            }

        } catch (error) {

            console.log(error);

            //////////////////////////////////////////////////////

            return errReply(

                interaction,

                "❌ Ocurrió un error al tratar de enviar la confesión.",

                true
            );
        }
    }
};