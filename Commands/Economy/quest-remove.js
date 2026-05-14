const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const Quest = require("../../Models/Quest");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("mision-remove")

        .setDescription("Eliminar una misión.")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )



        .addStringOption(option =>
            option
                .setName("quest_id")
                .setDescription("ID de la misión")
                .setRequired(true)
        ),



    async execute(interaction) {

        const questId =
            interaction.options.getString("quest_id");



        const quest = await Quest.findOneAndDelete({

            guildId: interaction.guild.id,

            questId

        });

        if (!quest) {

            return interaction.reply({

                content: "❌ Misión no encontrada.",

                ephemeral: true

            });

        }



        const embed = new EmbedBuilder()

            .setColor("Red")

            .setTitle("🗑️ Misión eliminada")

            .setDescription(
                `La misión **${quest.name}** ha sido eliminada.`
            );



        interaction.reply({
            embeds: [embed]
        });

    }

};