const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {

    data: new SlashCommandBuilder()

        .setName("shitpost")

        .setDescription("Recibe un humor negro"),

    async execute(interaction) {

        try {

            const embed = new EmbedBuilder();

            const response = await fetch(
                "https://www.reddit.com/r/ShitpostESP/random/.json"
            );

            const data = await response.json();

            // 🔥 VALIDAR DATA
            if (
                !data ||
                !data[0] ||
                !data[0].data ||
                !data[0].data.children ||
                !data[0].data.children[0]
            ) {

                return interaction.reply({
                    content: "❌ No pude obtener un shitpost.",
                    ephemeral: true
                });
            }

            const post = data[0].data.children[0].data;

            // 🔥 VALIDAR URL
            if (!post.url) {

                return interaction.reply({
                    content: "❌ El post no contiene imagen.",
                    ephemeral: true
                });
            }

            embed
                .setColor("#8A2BE2")
                .setImage(post.url)
                .setURL(post.url);

            return interaction.reply({
                embeds: [embed]
            });

        } catch (err) {

            console.log(err);

            return interaction.reply({
                content: "❌ Ocurrió un error obteniendo el shitpost.",
                ephemeral: true
            });
        }
    }
};