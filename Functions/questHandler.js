const Quest = require("../Models/Quest");
const UserQuest = require("../Models/UserQuest");

const Economy = require("../Models/EconomyUser");

module.exports = async (
    userId,
    guildId,
    category,
    amount = 1
) => {

    const quests = await Quest.find({
        guildId,
        category,
        enabled: true
    });

    if (!quests.length) return;



    let userQuestData =
        await UserQuest.findOne({
            userId,
            guildId
        });

    if (!userQuestData) {

        userQuestData = new UserQuest({
            userId,
            guildId,
            quests: []
        });

    }



    for (const quest of quests) {

        let userQuest =
            userQuestData.quests.find(
                q => q.questId === quest.questId
            );



        if (!userQuest) {

            userQuest = {

                questId: quest.questId,

                progress: 0,

                completed: false

            };

            userQuestData.quests.push(
                userQuest
            );

        }



        if (userQuest.completed) continue;

        userQuest.progress += amount;



        if (userQuest.progress >= quest.goal) {

            userQuest.completed = true;

            userQuest.completedAt = new Date();



            // 💰 REWARDS

            if (quest.reward.coins > 0) {

                let economy =
                    await Economy.findOne({
                        userId,
                        guildId
                    });

                if (economy) {

                    economy.coins +=
                        quest.reward.coins;

                    await economy.save();

                }

            }

            console.log(
                `${userId} completed quest ${quest.name}`
            );

        }

    }

    await userQuestData.save();

};