const {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction
} = require('discord.js');

const OpenAI =
    require('openai');

const errReply =
    require('../../Functions/interactionErrorReply');

const config =
    require('../../config.json');

//////////////////////////////////////////////////////
// OPENAI
//////////////////////////////////////////////////////

const openai =
    new OpenAI({

        apiKey:
            config.openAiToken
    });

//////////////////////////////////////////////////////
// COOLDOWN
//////////////////////////////////////////////////////

const cooldown =
    new Set();

//////////////////////////////////////////////////////

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName('chat-gpt')

            .setDescription(
                'Puedes preguntar algo a ChatGPT'
            )

            .addStringOption(option =>

                option

                    .setName('pregunta')

                    .setDescription(
                        'Escribe la pregunta que deseas hacerle a la IA'
                    )

                    .setMaxLength(300)

                    .setRequired(true)
            ),

    //////////////////////////////////////////////////////

    /**
     * 
     * @param {ChatInputCommandInteraction} interaction
     */

    async execute(interaction) {

        //////////////////////////////////////////////////////
        // OPENAI TOKEN
        //////////////////////////////////////////////////////

        if (!config.openAiToken) {

            console.log(
                "❌ OPENAI TOKEN MISSING"
            );

            return interaction.reply({

                content:
                    "❌ La IA no está configurada.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // COOLDOWN
        //////////////////////////////////////////////////////

        if (
            cooldown.has(
                interaction.user.id
            )
        ) {

            return interaction.reply({

                content:
                    "⏳ Espera unos segundos antes de usar ChatGPT otra vez.",

                flags: 64
            });
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

        }, 10000);

        //////////////////////////////////////////////////////
        // QUESTION
        //////////////////////////////////////////////////////

        const pregunta =

            interaction.options.getString(
                'pregunta'
            );

        //////////////////////////////////////////////////////

        try {

            //////////////////////////////////////////////////////
            // DEFER
            //////////////////////////////////////////////////////

            await interaction.deferReply();

            //////////////////////////////////////////////////////
            // OPENAI
            //////////////////////////////////////////////////////

            const response =

                await openai.chat.completions.create({

                    model:
                        'gpt-4o-mini',

                    messages: [

                        {
                            role: 'user',

                            content: pregunta
                        }
                    ],

                    temperature: 0.5,

                    max_tokens: 1024
                });

            //////////////////////////////////////////////////////
            // RESPONSE
            //////////////////////////////////////////////////////

            const aiResponse =

                response.choices[0]
                    .message.content

                    .replace(/```/g, "'''")

                    .slice(0, 3500);

            //////////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////////

            const embed =

                new EmbedBuilder()

                    .setTitle(
                        '💬 Pregunta a ChatGPT'
                    )

                    .setAuthor({

                        name:

                            `${interaction.user.username} preguntó a ChatGPT`,

                        iconURL:

                            interaction.user.avatarURL({

                                dynamic: true
                            })
                    })

                    .setColor('#8A2BE2')

                    .setDescription(

                        `## ❓ Pregunta\n` +

                        `\`\`\`\n${pregunta}\n\`\`\`\n\n` +

                        `## 🤖 Respuesta\n` +

                        `\`\`\`\n${aiResponse}\n\`\`\``
                    )

                    .setFooter({

                        text:
                            "Bryant's Oficial • AI System"
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////////
            // REPLY
            //////////////////////////////////////////////////////

            await interaction.editReply({

                embeds: [embed]
            });

        } catch (error) {

            console.log(error);

            //////////////////////////////////////////////////////
            // ERROR
            //////////////////////////////////////////////////////

            if (

                interaction.deferred ||

                interaction.replied

            ) {

                return interaction.editReply({

                    content:
                        "❌ Se produjo un error al ejecutar el comando."
                });
            }

            //////////////////////////////////////////////////////

            return errReply(

                interaction,

                '❌ Se produjo un error al ejecutar el comando.',

                true
            );
        }
    }
};