const { EmbedBuilder } = require("discord.js");

const cooldown = new Set();

const questHandler =
require("../../Functions/questHandler");

module.exports = {

    name: "messageCreate",

    async execute(message, client) {

        if (message.author.bot) return;



        // 🔥 QUESTS DE MENSAJES
        await questHandler(
            message.author.id,
            message.guild.id,
            "messages",
            1
        );



        let prefix = "+";



        // ✅ SOLO comandos después de esto
        if (!message.content.startsWith(prefix))
            return;



        const args = message.content
            .slice(prefix.length)
            .trim()
            .split(/ +/g);



        const commandName =
            args.shift().toLowerCase();



        const command =
            client.pcommands.get(commandName)
            ||
            client.pcommands.find(
                cmd =>
                    cmd.aliases &&
                    cmd.aliases.includes(commandName)
            );



        if (!command) return;



        const cooldowns =
            await command.Cooldown;



        const cooldownKey =
`${message.guild.id}-${message.author.id}-${commandName}`;



        if (
            command.Cooldown &&
            cooldown.has(cooldownKey)
        ) {

            const embed = new EmbedBuilder()

                .setDescription(
`Este comando tiene cooldown, debes esperar ${cooldowns / 1000} segundos para volver a utilizarlo.`
                );



            return message.reply({
                embeds: [embed]
            });

        }



        cooldown.add(cooldownKey);



        try {

            setTimeout(() => {

                cooldown.delete(cooldownKey);

            }, cooldowns);

        } catch (error) {

            return;

        }



        try {

            command.execute(
                client,
                message,
                args
            );

        } catch (err) {

            message.reply({
                content: "Ocurrió un error"
            });

            console.log(err);

        }

    }

};