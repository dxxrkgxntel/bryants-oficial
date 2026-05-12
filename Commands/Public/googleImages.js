const {
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ActionRowBuilder,
    ChatInputCommandInteraction
} = require('discord.js');

const axios =
    require('axios');

const config =
    require('../../config.json');

//////////////////////////////////////////////////////

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName('google')

            .setDescription(
                'Busca imágenes en Google'
            )

            .addStringOption(option =>

                option

                    .setName('query')

                    .setDescription(
                        'Escribe la imagen a buscar'
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
        // INDEX
        //////////////////////////////////////////////////////

        let currentIndex = 0;

        //////////////////////////////////////////////////////

        try {

            //////////////////////////////////////////////////////
            // DEFER
            //////////////////////////////////////////////////////

            await interaction.deferReply();

            //////////////////////////////////////////////////////
            // BOT PERMISSIONS
            //////////////////////////////////////////////////////

            if (

                !interaction.channel.permissionsFor(

                    interaction.guild.members.me

                ).has([

                    'SendMessages',
                    'EmbedLinks'

                ])

            ) {

                return interaction.editReply({

                    content:
                        "❌ No tengo permisos suficientes para enviar embeds aquí."
                });
            }

            //////////////////////////////////////////////////////
            // QUERY
            //////////////////////////////////////////////////////

            const query =

                interaction.options.getString(
                    'query'
                );

            //////////////////////////////////////////////////////
            // GOOGLE API
            //////////////////////////////////////////////////////

            const response =
                await axios.get(

                    `https://www.googleapis.com/customsearch/v1` +

                    `?key=${encodeURIComponent(config.googleApiKey)}` +

                    `&cx=${encodeURIComponent(config.googleCseId)}` +

                    `&searchType=image` +

                    `&safe=active` +

                    `&q=${encodeURIComponent(query)}`
                );

            //////////////////////////////////////////////////////
            // IMAGES
            //////////////////////////////////////////////////////

            const images =
                response.data.items;

            //////////////////////////////////////////////////////
            // NO RESULTS
            //////////////////////////////////////////////////////

            if (

                !images ||
                images.length === 0

            ) {

                return interaction.editReply({

                    content:
                        "❌ No se encontraron imágenes."
                });
            }

            //////////////////////////////////////////////////////
            // CURRENT IMAGE
            //////////////////////////////////////////////////////

            let currentImage =
                images[currentIndex];

            //////////////////////////////////////////////////////
            // BUTTONS
            //////////////////////////////////////////////////////

            const button =
                new ButtonBuilder()

                    .setStyle(
                        ButtonStyle.Link
                    )

                    .setLabel(
                        'Ver imagen'
                    )

                    .setURL(
                        currentImage.link
                    );

            //////////////////////////////////////////////////////

            const nextButton =
                new ButtonBuilder()

                    .setStyle(
                        ButtonStyle.Secondary
                    )

                    .setLabel(
                        'Siguiente'
                    )

                    .setCustomId(
                        'next'
                    );

            //////////////////////////////////////////////////////
            // ROW
            //////////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(
                        button,
                        nextButton
                    );

            //////////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor('#8A2BE2')

                    .setTitle(

                        `🔎 Buscando imágenes de ${query}`
                    )

                    .setImage(
                        currentImage.link
                    )

                    .setFooter({

                        text:
                            `Resultado ${currentIndex + 1} de ${images.length}`
                    });

            //////////////////////////////////////////////////////
            // REPLY
            //////////////////////////////////////////////////////

            await interaction.editReply({

                content:
                    '📸 Haz clic en el botón para abrir la imagen.',

                embeds: [embed],

                components: [row]
            });

            //////////////////////////////////////////////////////
            // FETCH MESSAGE
            //////////////////////////////////////////////////////

            const messageMostrar =
                await interaction.fetchReply();

            //////////////////////////////////////////////////////
            // COLLECTOR
            //////////////////////////////////////////////////////

            const collector =

                messageMostrar.createMessageComponentCollector({

                    filter: i =>

                        i.isButton() &&
                        i.user.id === interaction.user.id,

                    time: 180000
                });

            //////////////////////////////////////////////////////
            // COLLECT
            //////////////////////////////////////////////////////

            collector.on(

                'collect',

                async (interaccion) => {

                    //////////////////////////////////////////////////////
                    // NEXT BUTTON
                    //////////////////////////////////////////////////////

                    if (

                        interaccion.customId ===
                        'next'

                    ) {

                        //////////////////////////////////////////////////////
                        // NEXT INDEX
                        //////////////////////////////////////////////////////

                        currentIndex++;

                        //////////////////////////////////////////////////////

                        if (

                            currentIndex >=
                            images.length

                        ) {

                            currentIndex = 0;
                        }

                        //////////////////////////////////////////////////////
                        // IMAGE
                        //////////////////////////////////////////////////////

                        currentImage =
                            images[currentIndex];

                        //////////////////////////////////////////////////////
                        // UPDATED BUTTON
                        //////////////////////////////////////////////////////

                        const updatedButton =
                            new ButtonBuilder()

                                .setStyle(
                                    ButtonStyle.Link
                                )

                                .setLabel(
                                    'Ver imagen'
                                )

                                .setURL(
                                    currentImage.link
                                );

                        //////////////////////////////////////////////////////
                        // UPDATED ROW
                        //////////////////////////////////////////////////////

                        const updatedRow =
                            new ActionRowBuilder()

                                .addComponents(

                                    updatedButton,

                                    nextButton
                                );

                        //////////////////////////////////////////////////////
                        // UPDATED EMBED
                        //////////////////////////////////////////////////////

                        const updatedEmbed =
                            new EmbedBuilder()

                                .setColor('#8A2BE2')

                                .setTitle(

                                    `🔎 Buscando imágenes de ${query}`
                                )

                                .setImage(
                                    currentImage.link
                                )

                                .setFooter({

                                    text:

                                        `Resultado ${currentIndex + 1} de ${images.length}`
                                });

                        //////////////////////////////////////////////////////
                        // UPDATE
                        //////////////////////////////////////////////////////

                        await interaccion.update({

                            embeds: [updatedEmbed],

                            components: [updatedRow]
                        });
                    }
                }
            );

            //////////////////////////////////////////////////////
            // END
            //////////////////////////////////////////////////////

            collector.on(

                'end',

                async () => {

                    try {

                        await messageMostrar.edit({

                            content:
                                "⏳ El tiempo expiró. Usa nuevamente `/google` para buscar más imágenes.",

                            components: []
                        });

                    } catch {}
                }
            );

        } catch (error) {

            console.log(error);

            //////////////////////////////////////////////////////

            if (

                interaction.deferred ||
                interaction.replied

            ) {

                return interaction.editReply({

                    content:
                        "❌ Ocurrió un error al obtener las imágenes."
                });
            }

            //////////////////////////////////////////////////////

            return interaction.reply({

                content:
                    "❌ Ocurrió un error al obtener las imágenes.",

                flags: 64
            });
        }
    }
};