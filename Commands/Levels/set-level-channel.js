const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const LevelConfig =
    require("../../Models/LevelConfig");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("level-setup")

        .setDescription(
            "Configura el canal de mensajes de nivel"
        )

        .addChannelOption(option =>

            option

                .setName("canal")

                .setDescription(
                    "Canal donde se enviarán los niveles"
                )

                .addChannelTypes(
                    ChannelType.GuildText
                )

                .setRequired(true)
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        ////////////////////////////////////////

        const channel =
            interaction.options.getChannel("canal");

        ////////////////////////////////////////

        let data =
            await LevelConfig.findOne({

                guildId: interaction.guild.id
            });

        ////////////////////////////////////////

        if (!data) {

            data = new LevelConfig({

                guildId: interaction.guild.id,

                levelChannel: channel.id
            });

        } else {

            data.levelChannel = channel.id;
        }

        ////////////////////////////////////////

        await data.save();

        ////////////////////////////////////////

        await interaction.reply({

            embeds: [
                {
                    title:
                        "✅ Canal configurado",

                    description:
                        `Los mensajes de nivel ahora se enviarán en ${channel}`,

                    color: 0x8000ff
                }
            ],

            flags: 64
        });
    }
};