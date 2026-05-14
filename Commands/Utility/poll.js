const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const Poll = require("../../Models/Poll");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("crear-encuesta")

        .setDescription("Crea una encuesta.")

        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("Pregunta de la encuesta")
                .setRequired(true)
        )

        .addIntegerOption(option =>
            option
                .setName("duration")
                .setDescription("Duración en minutos")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("option1")
                .setDescription("Opción 1")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("option2")
                .setDescription("Opción 2")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("option3")
                .setDescription("Opción 3")
        )

        .addStringOption(option =>
            option
                .setName("option4")
                .setDescription("Opción 4")
        ),



    async execute(interaction) {

        //////////////////////////////////////////////////
        // QUESTION
        //////////////////////////////////////////////////

        const question =
            interaction.options.getString(
                "question"
            );

        //////////////////////////////////////////////////
        // DURATION
        //////////////////////////////////////////////////

        const duration =
            interaction.options.getInteger(
                "duration"
            );

        //////////////////////////////////////////////////
        // END DATE
        //////////////////////////////////////////////////

        const endAt = new Date(
            Date.now() + duration * 60 * 1000
        );

        //////////////////////////////////////////////////
        // OPTIONS
        //////////////////////////////////////////////////

        const options = [

            interaction.options.getString(
                "option1"
            ),

            interaction.options.getString(
                "option2"
            ),

            interaction.options.getString(
                "option3"
            ),

            interaction.options.getString(
                "option4"
            )

        ].filter(Boolean);

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed = new EmbedBuilder()

            .setColor("Purple")

            .setTitle("📊 Poll")

            .setDescription(

                `## ${question}\n\n` +

                options.map(

                    (opt, i) =>

`${i + 1}️⃣ ${opt} — **0** votes`

                ).join("\n")

            )

            .setFooter({

                text:
                `Termina en ${duration} minutos`

            });

        //////////////////////////////////////////////////
        // BUTTONS
        //////////////////////////////////////////////////

        const row = new ActionRowBuilder();

        options.forEach((option, index) => {

            row.addComponents(

                new ButtonBuilder()

                    .setCustomId(
                        `poll_${index}`
                    )

                    .setLabel(
                        `${index + 1}`
                    )

                    .setStyle(
                        ButtonStyle.Secondary
                    )

            );

        });

        //////////////////////////////////////////////////
        // SEND MESSAGE
        //////////////////////////////////////////////////

        const msg = await interaction.reply({

            embeds: [embed],

            components: [row],

            fetchReply: true

        });

        //////////////////////////////////////////////////
        // POLL OPTIONS
        //////////////////////////////////////////////////

        const pollOptions = options.map(

            (option, index) => ({

                id: index.toString(),

                text: option,

                votes: []

            })

        );

        //////////////////////////////////////////////////
        // SAVE POLL
        //////////////////////////////////////////////////

        await Poll.create({

            guildId: interaction.guild.id,

            channelId: interaction.channel.id,

            messageId: msg.id,

            creatorId: interaction.user.id,

            question,

            options: pollOptions,

            endAt

        });

    }

};