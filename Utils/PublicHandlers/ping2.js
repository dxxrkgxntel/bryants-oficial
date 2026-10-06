const {SlashCommandBuilder} = require('discord.js')

module.exports = {
  developer:false,
  data: new SlashCommandBuilder()
  .setName('ping-test')
  .setDescription('Te retorna pong'),
  execute(interaction){
    interaction.reply({content:"Pong"});
  }
};