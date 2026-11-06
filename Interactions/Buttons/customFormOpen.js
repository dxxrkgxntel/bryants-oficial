const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const CustomForm = require("../../Models/CustomForm");
module.exports = {
 id: "custom_form_open:",
 async execute(interaction) {
  const id = interaction.customId.slice("custom_form_open:".length);
  if (!/^[a-f\d]{24}$/i.test(id)) return interaction.reply({ content: "Este formulario no es válido.", ephemeral: true });
  const form = await CustomForm.findOne({ _id: id, guildId: interaction.guildId, enabled: true }).lean();
  if (!form) return interaction.reply({ content: "Este formulario ya no está disponible.", ephemeral: true });
  const modal = new ModalBuilder().setCustomId("custom_form_submit:" + form._id).setTitle(form.title.slice(0, 45));
  for (const question of form.questions.slice(0, 5)) {
   const field = new TextInputBuilder()
    .setCustomId(question.questionId)
    .setLabel(question.label.slice(0, 45))
    .setStyle(question.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setRequired(question.required !== false)
    .setMaxLength(question.style === "paragraph" ? 4000 : 1000);
   if (question.placeholder) field.setPlaceholder(question.placeholder.slice(0, 100));
   modal.addComponents(new ActionRowBuilder().addComponents(field));
  }
  return interaction.showModal(modal);
 }
};
