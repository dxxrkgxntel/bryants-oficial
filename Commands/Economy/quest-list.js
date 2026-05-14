const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Quest = require("../../Models/Quest");
const UserQuest =
require("../../Models/UserQuest");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("misiones")

        .setDescription(
            "Mira las misiones activas."
        ),



    async execute(interaction) {

        const quests = await Quest.find({
            guildId: interaction.guild.id,
            enabled: true
        });

        if (!quests.length) {

            return interaction.reply({

                content:
                    "❌ no hay misiones en función.",

                ephemeral: true

            });

        }



        let userQuestData =
            await UserQuest.findOne({

                userId: interaction.user.id,

                guildId: interaction.guild.id

            });



        const embed = new EmbedBuilder()

            .setColor("Purple")

            .setTitle(
                `📜 Misiones para ${interaction.user.username}`
            );



        let description = "";



        for (const quest of quests) {

            const userQuest =
                userQuestData?.quests.find(
                    q =>
                        q.questId === quest.questId
                );



            const progress =
                userQuest?.progress || 0;

            const completed =
                userQuest?.completed;



            description +=
`${completed ? "✅" : "📌"} **${quest.name}**
${progress}/${quest.goal}
Recompensa: 💰 ${quest.reward.coins}

`;

        }



        embed.setDescription(description);



        interaction.reply({
            embeds: [embed]
        });

    }

};