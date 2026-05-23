const AntiScam = require(
    "../../Models/AntiScam"
);

const {
    detectScam
} = require(
    "../../Utils/antiscam/detectScam"
);

const userMessageMap =
new Map();

module.exports = {

    name: "messageCreate",

    async execute(message) {

        try {

            if (!message.guild) return;
            if (message.author.bot) return;

            const config =
                await AntiScam.findOne({
                    guildId:
                    message.guild.id
                });

            if (!config?.enabled)
                return;

            if (
                config.ignoredChannels.includes(
                    message.channel.id
                )
            ) return;

            if (
                message.member.roles.cache.some(
                    role =>
                    config.ignoredRoles.includes(
                        role.id
                    )
                )
            ) return;

            const now = Date.now();

if (
    !userMessageMap.has(
        message.author.id
    )
) {

    userMessageMap.set(
        message.author.id,
        []
    );

}

const messages =
userMessageMap.get(
    message.author.id
);

messages.push(now);

const filtered =
messages.filter(
    time => now - time < 5000
);

userMessageMap.set(
    message.author.id,
    filtered
);

if (filtered.length >= 6) {

    await message.member
        .timeout(
            10 * 60 * 1000,
            "Spam masivo detectado"
        )
        .catch(() => {});

    return;

}

            const result =
                detectScam(
    message.content,
    config.whitelistDomains
);

            if (!result.detected)
                return;

            await message.delete()
                .catch(() => {});

            switch (
                config.punishment
            ) {

                case "timeout":

                    await message.member
                        .timeout(
                            config.timeoutDuration
                            * 60 * 1000,
                            "Scam detectado"
                        )
                        .catch(() => {});

                    break;

                case "kick":

                    await message.member
                        .kick(
                            "Scam detectado"
                        )
                        .catch(() => {});

                    break;

                case "ban":

                    await message.member
                        .ban({
                            reason:
                            "Scam detectado"
                        })
                        .catch(() => {});

                    break;

            }

            if (
                config.logChannelId
            ) {

                const logChannel =
                    message.guild.channels
                    .cache.get(
                        config.logChannelId
                    );

                if (logChannel) {

                    logChannel.send({

                        embeds: [{

    color: 0xff0000,

    title:
    "🚨 Scam Detectado",

    fields: [

        {
            name: "👤 Usuario",
            value:
            `${message.author}`,
            inline: true
        },

        {
            name: "📛 Dominio",
            value:
            result.domain || "N/A",
            inline: true
        },

        {
            name: "📄 Razón",
            value:
            result.reason || "Scam detectado"
        },

        {
            name: "💬 Mensaje",
            value:
            `\`\`\`${message.content.slice(0, 1000)}\`\`\``
        }

    ],

    footer: {

        text:
        `ID: ${message.author.id}`

    },

    timestamp:
    new Date()

}]

                    });

                }

            }

        } catch (err) {

            console.error(
                "[AntiScam]",
                err
            );

        }

    }

};