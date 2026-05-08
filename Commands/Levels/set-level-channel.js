const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const LevelConfig =
    require("../../Models/LevelConfig");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("set-level-channel")

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
        // SOLO ADMINS
        ////////////////////////////////////////

        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {

            return interaction.reply({

                content:
                    "❌ Solo administradores pueden usar este comando.",

                ephemeral: true
            });
        }

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

            ephemeral: true
        });
    }
};