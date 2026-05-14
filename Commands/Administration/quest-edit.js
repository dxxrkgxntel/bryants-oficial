const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const Quest = require("../../Models/Quest");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("mision-edit")

        .setDescription("Editar una misión existente.")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )



        .addStringOption(option =>
            option
                .setName("quest_id")
                .setDescription("ID de la misión")
                .setRequired(true)
        )



        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Nombre de la nueva misión")
        )



        .addStringOption(option =>
            option
                .setName("description")
                .setDescription("Nueva descripción")
        )



        .addIntegerOption(option =>
            option
                .setName("goal")
                .setDescription("Nuevo objetivo")
        )



        .addIntegerOption(option =>
            option
                .setName("coins")
                .setDescription("Nueva recompensa en monedas")
        )



        .addBooleanOption(option =>
            option
                .setName("enabled")
                .setDescription("Habilitar o deshabilitar la misión")
        ),



    async execute(interaction) {

        const questId =
            interaction.options.getString("quest_id");



        const quest = await Quest.findOne({

            guildId: interaction.guild.id,

            questId

        });

        if (!quest) {

            return interaction.reply({

                content: "❌ Misión no encontrada.",

                ephemeral: true

            });

        }



        const name =
            interaction.options.getString("name");

        const description =
            interaction.options.getString(
                "description"
            );

        const goal =
            interaction.options.getInteger("goal");

        const coins =
            interaction.options.getInteger("coins");

        const enabled =
            interaction.options.getBoolean("enabled");



        if (name) quest.name = name;

        if (description)
            quest.description = description;

        if (goal)
            quest.goal = goal;

        if (coins !== null)
            quest.reward.coins = coins;

        if (enabled !== null)
            quest.enabled = enabled;



        await quest.save();



        const embed = new EmbedBuilder()

            .setColor("Yellow")

            .setTitle("✏️ Misión actualizada")

            .setDescription(
                `La misión **${quest.name}** se actualizó correctamente..`
            );



        interaction.reply({
            embeds: [embed]
        });

    }

};