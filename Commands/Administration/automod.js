const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
    ChannelType
} = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Setup AutoMod system')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)

        .addSubcommand(command =>
            command
                .setName('flagged-words')
                .setDescription('Block profanity, sexual content, and slurs')
        )

        .addSubcommand(command =>
            command
                .setName('spam-messages')
                .setDescription('Block messages suspected of spam')
        )

        .addSubcommand(command =>
            command
                .setName('mention-spam')
                .setDescription('Block mention spam')
                .addIntegerOption(option =>
                    option
                        .setName('number')
                        .setDescription('The number of mentions required')
                        .setRequired(true)
                )
        )

        .addSubcommand(command =>
            command
                .setName('keyword')
                .setDescription('Block a given keyword in the server')
                .addStringOption(option =>
                    option
                        .setName('word')
                        .setDescription('The word to block')
                        .setRequired(true)
                )
        )

        .addSubcommand(command =>
            command
                .setName('anti-links')
                .setDescription('Block links')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Allowed channel')
                        .addChannelTypes(ChannelType.GuildText)
                )
        )

        .addSubcommand(command =>
            command
                .setName('anti-invites')
                .setDescription('Block Discord invites')
        ),

    async execute(interaction, client) {

        const { guild, options } = interaction;
        const sub = options.getSubcommand();

        // 🔒 Protección backend
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: '❌ No tienes permisos para usar este comando.',
                flags: 64
            });
        }

        // 🔥 Evita Unknown Interaction
        await interaction.deferReply({ flags: 64 });

        try {

            switch (sub) {

                // ==================================================
                // FLAGGED WORDS
                // ==================================================

                case 'flagged-words': {

                    const existingRule = guild.autoModerationRules.cache.find(
                        r => r.name === `Block profanity by ${client.user.id}`
                    );

                    if (existingRule) {
                        return interaction.editReply({
                            content: '❌ Ya existe una regla de palabras ofensivas.'
                        });
                    }

                    await guild.autoModerationRules.create({

                        name: `Block profanity by ${client.user.id}`,

                        enabled: true,

                        eventType: 1,

                        triggerType: 4,

                        triggerMetadata: {
                            presets: [1, 2, 3]
                        },

                        actions: [
                            {
                                type: 1,
                                metadata: {
                                    customMessage: `⚠️ Tu mensaje fue bloqueado por el AutoMod de ${guild.name}.`
                                }
                            }
                        ]

                    });

                    const embed = new EmbedBuilder()
                        .setColor('#8A2BE2')
                        .setDescription('✅ AutoMod de palabras ofensivas activado.');

                    return interaction.editReply({
                        embeds: [embed]
                    });
                }

                // ==================================================
                // KEYWORD
                // ==================================================

                case 'keyword': {

                    const word = options.getString('word');

                    await guild.autoModerationRules.create({

                        name: `Keyword Block: ${word}`,

                        enabled: true,

                        eventType: 1,

                        triggerType: 1,

                        triggerMetadata: {
                            keywordFilter: [word]
                        },

                        actions: [
                            {
                                type: 1,
                                metadata: {
                                    customMessage: `⚠️ Esa palabra está bloqueada en este servidor.`
                                }
                            }
                        ]

                    });

                    const embed = new EmbedBuilder()
                        .setColor('#8A2BE2')
                        .setDescription(`✅ La palabra \`${word}\` ahora está bloqueada.`);

                    return interaction.editReply({
                        embeds: [embed]
                    });
                }

                // ==================================================
                // SPAM MESSAGES
                // ==================================================

                case 'spam-messages': {

                    await guild.autoModerationRules.create({

                        name: `Anti Spam by ${client.user.id}`,

                        enabled: true,

                        eventType: 1,

                        triggerType: 3,

                        actions: [
                            {
                                type: 1,
                                metadata: {
                                    customMessage: `⚠️ Spam detectado.`
                                }
                            }
                        ]

                    });

                    const embed = new EmbedBuilder()
                        .setColor('#8A2BE2')
                        .setDescription('✅ Sistema anti-spam activado.');

                    return interaction.editReply({
                        embeds: [embed]
                    });
                }

                // ==================================================
                // MENTION SPAM
                // ==================================================

                case 'mention-spam': {

                    const number = options.getInteger('number');

                    await guild.autoModerationRules.create({

                        name: `Mention Spam by ${client.user.id}`,

                        enabled: true,

                        eventType: 1,

                        triggerType: 5,

                        triggerMetadata: {
                            mentionTotalLimit: number
                        },

                        actions: [
                            {
                                type: 1,
                                metadata: {
                                    customMessage: `⚠️ Demasiadas menciones detectadas.`
                                }
                            }
                        ]

                    });

                    const embed = new EmbedBuilder()
                        .setColor('#8A2BE2')
                        .setDescription(`✅ Anti mention spam activado (${number} menciones).`);

                    return interaction.editReply({
                        embeds: [embed]
                    });
                }

                // ==================================================
                // ANTI LINKS
                // ==================================================

                case 'anti-links': {

                    const permChannel = options.getChannel('channel');

                    await guild.autoModerationRules.create({

                        name: `Anti Links by ${client.user.id}`,

                        enabled: true,

                        eventType: 1,

                        triggerType: 1,

                        triggerMetadata: {
                            regexPatterns: ['https?://[^\\s]+']
                        },

                        actions: [
                            {
                                type: 1,
                                metadata: {
                                    customMessage: `⚠️ Los links están bloqueados en este servidor.`
                                }
                            }
                        ],

                        exemptChannels: permChannel ? [permChannel.id] : []

                    });

                    const embed = new EmbedBuilder()
                        .setColor('#8A2BE2')
                        .setDescription(
                            permChannel
                                ? `✅ Anti-links activado.\n📌 Canal permitido: ${permChannel}`
                                : `✅ Anti-links activado.`
                        );

                    return interaction.editReply({
                        embeds: [embed]
                    });
                }

                // ==================================================
                // ANTI INVITES
                // ==================================================

                case 'anti-invites': {

                    await guild.autoModerationRules.create({

                        name: `Anti Invites by ${client.user.id}`,

                        enabled: true,

                        eventType: 1,

                        triggerType: 1,

                        triggerMetadata: {
                            keywordFilter: [
                                'discord.gg',
                                'discord.com/invite'
                            ]
                        },

                        actions: [
                            {
                                type: 1,
                                metadata: {
                                    customMessage: `⚠️ Las invitaciones de Discord están bloqueadas.`
                                }
                            }
                        ]

                    });

                    const embed = new EmbedBuilder()
                        .setColor('#8A2BE2')
                        .setDescription('✅ Anti-invitaciones activado.');

                    return interaction.editReply({
                        embeds: [embed]
                    });
                }

            }

        } catch (error) {

            console.log(error);

            if (interaction.deferred || interaction.replied) {

                return interaction.editReply({
                    content: '❌ Ocurrió un error al crear la regla.'
                });

            } else {

                return interaction.reply({
                    content: '❌ Ocurrió un error.',
                    flags: 64
                });

            }
        }
    }
};