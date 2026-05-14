const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const Quest =
require("../../Models/Quest");

const UserQuest =
require("../../Models/UserQuest");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("quest")

        .setDescription("Sistema de misiones")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        //////////////////////////////////////////////////
        // CREATE
        //////////////////////////////////////////////////

        .addSubcommand(subcommand =>

            subcommand

                .setName("create")

                .setDescription(
                    "Crear una misión"
                )

                .addStringOption(option =>

                    option

                        .setName("type")

                        .setDescription(
                            "Tipo de misión"
                        )

                        .setRequired(true)

                        .addChoices(

                            {
                                name: "Mensajes",
                                value: "messages"
                            },

                            {
                                name: "Tiempo de voz",
                                value: "voice"
                            },

                            {
                                name: "Invitar",
                                value: "invite"
                            }

                        )

                )

                .addStringOption(option =>

                    option

                        .setName("title")

                        .setDescription(
                            "Título de la misión"
                        )

                        .setRequired(true)

                )

                .addIntegerOption(option =>

                    option

                        .setName("goal")

                        .setDescription(
                            "Objetivo de la misión"
                        )

                        .setRequired(true)

                )

                .addIntegerOption(option =>

                    option

                        .setName("reward")

                        .setDescription(
                            "Cantidad de recompensa"
                        )

                        .setRequired(true)

                )

        )

        //////////////////////////////////////////////////
        // EDIT
        //////////////////////////////////////////////////

        .addSubcommand(subcommand =>

            subcommand

                .setName("edit")

                .setDescription(
                    "Editar una misión"
                )

                .addStringOption(option =>

                    option

                        .setName("quest_id")

                        .setDescription(
                            "ID de la misión"
                        )

                        .setRequired(true)

                )

                .addStringOption(option =>

                    option

                        .setName("title")

                        .setDescription(
                            "Nuevo título"
                        )

                )

                .addIntegerOption(option =>

                    option

                        .setName("goal")

                        .setDescription(
                            "Nuevo objetivo"
                        )

                )

                .addIntegerOption(option =>

                    option

                        .setName("reward")

                        .setDescription(
                            "Nueva recompensa"
                        )

                )

        )

        //////////////////////////////////////////////////
        // REMOVE
        //////////////////////////////////////////////////

        .addSubcommand(subcommand =>

            subcommand

                .setName("remove")

                .setDescription(
                    "Eliminar una misión"
                )

                .addStringOption(option =>

                    option

                        .setName("quest_id")

                        .setDescription(
                            "ID de la misión"
                        )

                        .setRequired(true)

                )

        )

        //////////////////////////////////////////////////
        // LIST
        //////////////////////////////////////////////////

        .addSubcommand(subcommand =>

            subcommand

                .setName("list")

                .setDescription(
                    "Lista de todas las misiones"
                )

        )

        //////////////////////////////////////////////////
        // INFO
        //////////////////////////////////////////////////

        .addSubcommand(subcommand =>

            subcommand

                .setName("info")

                .setDescription(
                    "Ver información de la misión"
                )

                .addStringOption(option =>

                    option

                        .setName("quest_id")

                        .setDescription(
                            "ID de la misión"
                        )

                        .setRequired(true)

                )

        )

        //////////////////////////////////////////////////
        // RESET
        //////////////////////////////////////////////////

        .addSubcommand(subcommand =>

            subcommand

                .setName("reset")

                .setDescription(
                    "Restablecer el progreso de la misión de un usuario"
                )

                .addUserOption(option =>

                    option

                        .setName("user")

                        .setDescription(
                            "Usuario objetivo"
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

            const type =
                interaction.options.getString(
                    "type"
                );

            const title =
                interaction.options.getString(
                    "title"
                );

            const goal =
                interaction.options.getInteger(
                    "goal"
                );

            const reward =
                interaction.options.getInteger(
                    "reward"
                );

            //////////////////////////////////////////////////

            const quest =
                await Quest.create({

                    guildId:
                        interaction.guild.id,

                    type,

                    title,

                    goal,

                    reward

                });

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "✅ Misión creada"
                    )

                    .setDescription(

`🆔 ID: ${quest._id}

📌 Título: ${title}

🎯 Meta: ${goal}

💰 Premio: ${reward}

📝 Tipo: ${type}`

                    );

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // EDIT
        //////////////////////////////////////////////////

        if (subcommand === "edit") {

            const questId =
                interaction.options.getString(
                    "quest_id"
                );

            const title =
                interaction.options.getString(
                    "title"
                );

            const goal =
                interaction.options.getInteger(
                    "goal"
                );

            const reward =
                interaction.options.getInteger(
                    "reward"
                );

            //////////////////////////////////////////////////

            const quest =
                await Quest.findById(
                    questId
                );

            //////////////////////////////////////////////////

            if (!quest) {

                return interaction.reply({

                    content:
                        "❌ Misión no encontrada.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            if (title)
                quest.title = title;

            if (goal)
                quest.goal = goal;

            if (reward)
                quest.reward = reward;

            //////////////////////////////////////////////////

            await quest.save();

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    "✅ Misión actualizada."

            });

        }

        //////////////////////////////////////////////////
        // REMOVE
        //////////////////////////////////////////////////

        if (subcommand === "remove") {

            const questId =
                interaction.options.getString(
                    "quest_id"
                );

            //////////////////////////////////////////////////

            const quest =
                await Quest.findById(
                    questId
                );

            //////////////////////////////////////////////////

            if (!quest) {

                return interaction.reply({

                    content:
                        "❌ Misión no encontrada.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            await quest.deleteOne();

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    "✅ Misión eliminada."

            });

        }

        //////////////////////////////////////////////////
        // LIST
        //////////////////////////////////////////////////

        if (subcommand === "list") {

            const quests =
                await Quest.find({

                    guildId:
                        interaction.guild.id

                });

            //////////////////////////////////////////////////

            if (!quests.length) {

                return interaction.reply({

                    content:
                        "❌ No se encontraron misiones.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "📜 Lista de misiones"
                    )

                    .setDescription(

                        quests.map(quest =>

`🆔 ${quest._id}

📌 ${quest.title}
🎯 Meta: ${quest.goal}
💰 Premio: ${quest.reward}
📝 Tipo: ${quest.type}`

                        ).join("\n\n")

                    );

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // INFO
        //////////////////////////////////////////////////

        if (subcommand === "info") {

            const questId =
                interaction.options.getString(
                    "quest_id"
                );

            //////////////////////////////////////////////////

            const quest =
                await Quest.findById(
                    questId
                );

            //////////////////////////////////////////////////

            if (!quest) {

                return interaction.reply({

                    content:
                        "❌ Misión no encontrada.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "📌 Información de la misión"
                    )

                    .setDescription(

`🆔 ID: ${quest._id}

📌 Título: ${quest.title}

🎯 Meta: ${quest.goal}

💰 Premio: ${quest.reward}

📝 Tipo: ${quest.type}`

                    );

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // RESET
        //////////////////////////////////////////////////

        if (subcommand === "reset") {

            const user =
                interaction.options.getUser(
                    "user"
                );

            //////////////////////////////////////////////////

            await UserQuest.deleteMany({

                guildId:
                    interaction.guild.id,

                userId:
                    user.id

            });

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
`✅ El progreso de la misión se restableció para ${user.username}.`

            });

        }

    }

};