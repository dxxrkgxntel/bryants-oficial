const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require("discord.js");

const Poll =
require("../../Models/Poll");

const progressBar =
require("../../Functions/progressBar");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("poll")

            .setDescription(
                "Sistema de encuestas"
            )

            //////////////////////////////////////////////////
            // CREATE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("create")

                    .setDescription(
                        "Crear una encuesta"
                    )

                    .addStringOption(option =>

                        option

                            .setName("question")

                            .setDescription(
                                "Pregunta de la encuesta"
                            )

                            .setRequired(true)

                    )

                    .addIntegerOption(option =>

                        option

                            .setName("duration")

                            .setDescription(
                                "Duración en minutos"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("option1")

                            .setDescription(
                                "Opción 1"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("option2")

                            .setDescription(
                                "Opción 2"
                            )

                            .setRequired(true)

                    )

                    .addStringOption(option =>

                        option

                            .setName("option3")

                            .setDescription(
                                "Opción 3"
                            )

                    )

                    .addStringOption(option =>

                        option

                            .setName("option4")

                            .setDescription(
                                "Opción 4"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // END
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("end")

                    .setDescription(
                        "Terminar una encuesta"
                    )

                    .addStringOption(option =>

                        option

                            .setName("message_id")

                            .setDescription(
                                "ID del mensaje"
                            )

                            .setRequired(true)

                    )

            )

            //////////////////////////////////////////////////
            // LIST
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("list")

                    .setDescription(
                        "Ver encuestas activas"
                    )

            )

            //////////////////////////////////////////////////
            // DELETE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("delete")

                    .setDescription(
                        "Eliminar una encuesta"
                    )

                    .addStringOption(option =>

                        option

                            .setName("message_id")

                            .setDescription(
                                "ID del mensaje"
                            )

                            .setRequired(true)

                    )

            ),

    //////////////////////////////////////////////////
    // EXECUTE
    //////////////////////////////////////////////////

    async execute(interaction) {

        const subcommand =
            interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // CREATE
        //////////////////////////////////////////////////

        if (subcommand === "create") {

            const question =
                interaction.options.getString(
                    "question"
                );

            //////////////////////////////////////////////////

            const duration =
                interaction.options.getInteger(
                    "duration"
                );

            //////////////////////////////////////////////////

            const endAt =
                new Date(

                    Date.now() +
                    duration * 60 * 1000

                );

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

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "📊 Encuesta"
                    )

                    .setDescription(

                        `## ${question}\n\n` +

                        options.map(

                            (opt, i) =>

`${i + 1}️⃣ ${opt} — **0** votos`

                        ).join("\n")

                    )

                    .setFooter({

                        text:
`Termina en ${duration} minutos`

                    });

            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder();

            //////////////////////////////////////////////////

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

            const msg =
                await interaction.reply({

                    embeds: [embed],

                    components: [row],

                    fetchReply: true

                });

            //////////////////////////////////////////////////

            const pollOptions =
                options.map(

                    (option, index) => ({

                        id:
                            index.toString(),

                        text:
                            option,

                        votes: []

                    })

                );

            //////////////////////////////////////////////////

            await Poll.create({

                guildId:
                    interaction.guild.id,

                channelId:
                    interaction.channel.id,

                messageId:
                    msg.id,

                creatorId:
                    interaction.user.id,

                question,

                options:
                    pollOptions,

                endAt

            });

        }

        //////////////////////////////////////////////////
        // END
        //////////////////////////////////////////////////

        if (subcommand === "end") {

            if (

                !interaction.member.permissions.has(
                    PermissionFlagsBits.ManageMessages
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ No tienes permisos.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const messageId =
                interaction.options.getString(
                    "message_id"
                );

            //////////////////////////////////////////////////

            const poll =
                await Poll.findOne({

                    guildId:
                        interaction.guild.id,

                    messageId

                });

            //////////////////////////////////////////////////

            if (!poll) {

                return interaction.reply({

                    content:
                        "❌ Encuesta no encontrada.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            if (poll.ended) {

                return interaction.reply({

                    content:
                        "❌ Esta encuesta ya terminó.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            poll.ended = true;

            await poll.save();

            //////////////////////////////////////////////////

            const channel =
                interaction.guild.channels.cache.get(
                    poll.channelId
                );

            //////////////////////////////////////////////////

            if (!channel) {

                return interaction.reply({

                    content:
                        "❌ Canal no encontrado.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const message =
                await channel.messages.fetch(
                    poll.messageId
                );

            //////////////////////////////////////////////////

            const totalVotes =
                poll.options.reduce(

                    (acc, option) =>

                        acc +
                        option.votes.length,

                    0

                );

            //////////////////////////////////////////////////

            const winner =
                poll.options.reduce(

                    (prev, current) =>

                        current.votes.length >
                        prev.votes.length

                            ? current

                            : prev

                );

            //////////////////////////////////////////////////

            const highestVotes =
                Math.max(

                    ...poll.options.map(
                        o => o.votes.length
                    )

                );

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "📊 Encuesta Terminada"
                    )

                    .setDescription(

                        `## ${poll.question}\n\n` +

                        poll.options.map((option, index) => {

                            const percentage =

                                totalVotes > 0

                                    ? Math.round(

                                        (
                                            option.votes.length
                                            /
                                            totalVotes
                                        ) * 100

                                    )

                                    : 0;

                            //////////////////////////////////////////////////

                            const bar =
                                progressBar(

                                    option.votes.length,

                                    totalVotes,

                                    10

                                );

                            //////////////////////////////////////////////////

                            const isWinner =

                                option.votes.length === highestVotes

                                &&

                                highestVotes > 0;

                            //////////////////////////////////////////////////

                            return `

${isWinner ? "🏆" : ""}
${index + 1}️⃣ ${option.text}

${bar} ${percentage}%
👥 ${option.votes.length} votos

`;

                        }).join("\n")

                    )

                    .addFields({

                        name: "🏆 Ganador",

                        value:
`${winner.text} (${winner.votes.length} votos)`

                    })

                    .setFooter({

                        text:
`Total de votos: ${totalVotes}`

                    });

            //////////////////////////////////////////////////

            const rows =
                message.components.map(row => {

                    row.components.forEach(button => {

                        button.data.disabled = true;

                    });

                    return row;

                });

            //////////////////////////////////////////////////

            await message.edit({

                embeds: [embed],

                components: rows

            });

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    "✅ Encuesta terminada correctamente.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // LIST
        //////////////////////////////////////////////////

        if (subcommand === "list") {

            const polls =
                await Poll.find({

                    guildId:
                        interaction.guild.id,

                    ended: false

                });

            //////////////////////////////////////////////////

            if (!polls.length) {

                return interaction.reply({

                    content:
                        "❌ No hay encuestas activas.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "📊 Encuestas Activas"
                    )

                    .setDescription(

                        polls.map(poll =>

                            `🆔 \`${poll.messageId}\`\n` +

                            `❓ ${poll.question}\n` +

                            `👤 <@${poll.creatorId}>`

                        ).join("\n\n━━━━━━━━━━━━━━\n\n")

                    )

                    .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed],

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // DELETE
        //////////////////////////////////////////////////

        if (subcommand === "delete") {

            if (

                !interaction.member.permissions.has(
                    PermissionFlagsBits.ManageMessages
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ No tienes permisos.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const messageId =
                interaction.options.getString(
                    "message_id"
                );

            //////////////////////////////////////////////////

            const poll =
                await Poll.findOne({

                    guildId:
                        interaction.guild.id,

                    messageId

                });

            //////////////////////////////////////////////////

            if (!poll) {

                return interaction.reply({

                    content:
                        "❌ Encuesta no encontrada.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            try {

                const channel =
                    interaction.guild.channels.cache.get(
                        poll.channelId
                    );

                //////////////////////////////////////////////////

                if (channel) {

                    const message =
                        await channel.messages.fetch(
                            poll.messageId
                        ).catch(() => null);

                    //////////////////////////////////////////////////

                    if (message) {

                        await message.delete()
                            .catch(() => {});

                    }

                }

            } catch {}

            //////////////////////////////////////////////////

            await Poll.deleteOne({

                guildId:
                    interaction.guild.id,

                messageId

            });

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    "✅ Encuesta eliminada correctamente.",

                flags: 64

            });

        }

    }

};