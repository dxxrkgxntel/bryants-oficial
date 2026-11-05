const CountingConfig = require("../../Models/CountingConfig");
const { evaluateCountingMessage } = require("../../Functions/countingGame");
const { trackAchievementProgress } = require("../../Functions/achievementTracker");
module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (!message.guild || message.author.bot) return;
    const config = await CountingConfig.findOne({ guildId: message.guild.id, channelId: message.channel.id, enabled: true }).lean();
    if (!config) return;
    const outcome = evaluateCountingMessage({ content: message.content, currentNumber: config.currentNumber, currentStreak: config.currentStreak, lastUserId: config.lastUserId, authorId: message.author.id });
    if (outcome.type === "ignore") return;
    const expectedState = { guildId: message.guild.id, channelId: message.channel.id, enabled: true, currentNumber: config.currentNumber, lastUserId: config.lastUserId ?? null };
    if (outcome.type === "reset") {
      const reset = await CountingConfig.findOneAndUpdate(expectedState, { $set: { currentNumber: 0, currentStreak: 0, lastUserId: null } }, { new: true });
      if (!reset) return;
      await message.react("❌").catch(() => {});
      await message.reply({ content: "El conteo se reinició. Se esperaba **" + outcome.expected + "** y se recibió **" + outcome.submitted + "**. El próximo número es **1**.", allowedMentions: { repliedUser: false } }).catch(() => {});
      return;
    }
    const updated = await CountingConfig.findOneAndUpdate(expectedState, { $set: { currentNumber: outcome.number, currentStreak: outcome.streak, lastUserId: message.author.id }, $max: { highestNumber: outcome.number } }, { new: true });
    if (!updated) return;
    await message.react("✅").catch(() => {});
    const metrics = [["counting_correct", 1, {}], ["counting_highest", outcome.number, { absolute: true }], ["counting_streak", outcome.streak, { absolute: true }]];
    for (const [metric, amount, options] of metrics) {
      await trackAchievementProgress(message.guild, message.author, metric, amount, options).catch(error => console.warn("[Counting] No se pudo registrar " + metric + ":", error.message));
    }
  }
};
