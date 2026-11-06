const { EmbedBuilder } = require("discord.js");
const CustomForm = require("../../Models/CustomForm");
const CustomFormResponse = require("../../Models/CustomFormResponse");
const { publishDashboardNotification } = require("../../Utils/dashboardNotifications");
module.exports = {
 id: "custom_form_submit:",
 async execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  const id = interaction.customId.slice("custom_form_submit:".length);
  if (!/^[a-f\d]{24}$/i.test(id)) return interaction.editReply({ content: "No pude identificar el formulario." });
  const form = await CustomForm.findOne({ _id: id, guildId: interaction.guildId, enabled: true }).lean();
  if (!form) return interaction.editReply({ content: "Este formulario ya no está disponible." });
  const answers = form.questions.slice(0, 5).map(question => ({
   questionId: question.questionId, question: question.label,
   answer: interaction.fields.getTextInputValue(question.questionId).trim()
  }));
  if (answers.some((answer, index) => form.questions[index].required !== false && !answer.answer)) {
   return interaction.editReply({ content: "Completa las respuestas obligatorias." });
  }
  const response = await CustomFormResponse.create({
   guildId: form.guildId, formId: form.formId, formTitle: form.title,
   userId: interaction.user.id, username: interaction.user.globalName || interaction.user.username, answers
  });
  const embed = new EmbedBuilder().setColor("#8A2BE2").setTitle("Nueva respuesta · " + form.title)
   .setDescription("**Enviado por:** " + interaction.user.tag + " (" + interaction.user.id + ")")
   .addFields(answers.filter(item => item.answer).map(item => ({ name: item.question, value: item.answer.slice(0, 1024) })))
   .setFooter({ text: "Respuesta #" + response._id });
  try {
   const channel = await client.channels.fetch(form.responseChannelId);
   if (!channel || channel.guildId !== form.guildId || !channel.isTextBased() || !channel.send) throw new Error("Canal de respuestas no disponible.");
   const sent = await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
   await CustomFormResponse.updateOne({ _id: response._id }, { $set: { discordChannelId: channel.id, discordMessageId: sent.id } });
  } catch (error) {
   console.error("[Custom Forms] No se pudo enviar la respuesta al canal:", error.message);
  }
  await publishDashboardNotification({
   guildId: form.guildId, title: "Nueva respuesta de formulario",
   message: interaction.user.username + " envió una respuesta a «" + form.title + "».",
   category: "community", severity: "info"
  });
  return interaction.editReply({ content: "¡Tu respuesta se envió correctamente! Gracias por participar." });
 }
};
