const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const Quest = require("../../Models/Quest");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("mision-setup")

        .setDescription("Crea una nueva mision.")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )



        .addStringOption(option =>
            option
                .setName("mision_id")
                .setDescription("ID Mision")
                .setRequired(true)
        )



        .addStringOption(option =>
            option
                .setName("nombre")
                .setDescription("Nombre de Mision")
                .setRequired(true)
        )



        .addStringOption(option =>
            option
                .setName("descripcion")
                .setDescription("Descripcion de mision")
                .setRequired(true)
        )



        .addStringOption(option =>
            option
                .setName("tipo")
                .setDescription("Tipo de mision")
                .setRequired(true)

                .addChoices(
                    {
                        name: "Diaria",
                        value: "daily"
                    },

                    {
                        name: "Semanal",
                        value: "weekly"
                    }
                )
        )



        .addStringOption(option =>
            option
                .setName("categoria")
                .setDescription("Categoria de mision")
                .setRequired(true)

                .addChoices(

                    {
                        name: "Mensajes",
                        value: "messages"
                    },

                    {
                        name: "Voz",
                        value: "voice"
                    },

                    {
                        name: "Economia",
                        value: "economy"
                    },

                    {
                        name: "Juegos",
                        value: "games"
                    }

                )
        )



        .addIntegerOption(option =>
            option
                .setName("objetivo")
                .setDescription("Objetivo de mision")
                .setRequired(true)
        )



        .addIntegerOption(option =>
            option
                .setName("recompensa")
                .setDescription("Monedas de regalo")
                .setRequired(true)
        ),



    async execute(interaction) {

        const questId =
            interaction.options.getString("mision_id");

        const name =
            interaction.options.getString("nombre");

        const description =
            interaction.options.getString(
                "descripcion"
            );

        const type =
            interaction.options.getString("tipo");

        const category =
            interaction.options.getString(
                "categoria"
            );

        const goal =
            interaction.options.getInteger("objetivo");

        const coins =
            interaction.options.getInteger("recompensa");



        const existingQuest =
            await Quest.findOne({
                guildId: interaction.guild.id,
                questId
            });

        if (existingQuest) {

            return interaction.reply({

                content:
                    "❌ Ya existe una misión con este ID.",

                ephemeral: true

            });

        }



        await Quest.create({

            guildId: interaction.guild.id,

            questId,

            name,

            description,

            type,

            category,

            goal,

            reward: {
                coins
            }

        });



        const embed = new EmbedBuilder()

            .setColor("Green")

            .setTitle("✅ Mision Creada")

            .setDescription(
                `Mision **${name}** ha sido creada.`
            )

            .addFields(

                {
                    name: "🆔 Mision ID",
                    value: questId,
                    inline: true
                },

                {
                    name: "📂 Categoria",
                    value: category,
                    inline: true
                },

                {
                    name: "🎯 Objetivo",
                    value: goal.toString(),
                    inline: true
                },

                {
                    name: "💰 Recompensa",
                    value: `${coins} Monedas`,
                    inline: true
                }

            );



        interaction.reply({
            embeds: [embed]
        });

    }

};