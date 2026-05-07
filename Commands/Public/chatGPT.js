const {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction} = require('discord.js');

const OpenAI = require('openai');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const config = require('../../config.json');

const openai = new OpenAI({
  apiKey: config.openAiToken
});

module.exports = {
  data: new SlashCommandBuilder()
  .setName('chat-gpt')
  .setDescription('Puedes preguntar algo a ChatGPT')
  .addStringOption(option =>
    option
      .setName('pregunta')
      .setDescription('Escribe la pregunta que deseas hacerle a la IA')
      .setMaxLength(300)
      .setRequired(true)
  ),

  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const pregunta = interaction.options.getString('pregunta');

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: pregunta }
        ],
        temperature: 0.5,
        max_tokens: 1024
      });

      const embed = new EmbedBuilder()
        .setTitle('💬 Pregunta a ChatGPT')
        .setAuthor({
          name: `${interaction.user.tag} preguntó a ChatGPT`,
          iconURL: interaction.user.avatarURL({ dynamic: true })
        })
        .setColor('Random')
        .setDescription(
          `**Pregunta:**\n\`\`\`${pregunta}\`\`\`\n` +
          `**Respuesta:**\n\`\`\`${response.choices[0].message.content}\`\`\``
        );

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      return errReply(
        interaction,
        'Se produjo un error al ejecutar el comando.',
        true
      );
    }
  }
};