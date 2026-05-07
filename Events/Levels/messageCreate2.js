const Level = require("../../Models/Level");
const levelRoles = require("../../Levels/levelRoles");

const cooldown = new Set();

module.exports = {
    name: "messageCreate",
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        if (cooldown.has(message.author.id)) return;

        cooldown.add(message.author.id);
        setTimeout(() => cooldown.delete(message.author.id), 5000);

        const xpRandom = Math.floor(Math.random() * 10) + 5;

        let data = await Level.findOne({
            userId: message.author.id,
            guildId: message.guild.id
        });

        if (!data) {
            data = new Level({
                userId: message.author.id,
                guildId: message.guild.id,
                xp: xpRandom,
                level: 0
            });
        } else {
            data.xp += xpRandom;
        }

        // 🔥 SISTEMA DE NIVELES
        const xpNeeded = (data.level + 1) * 100;

        if (data.xp >= xpNeeded) {
            data.level += 1;
            data.xp = 0;

            // 🎉 MENSAJE DE NIVEL
            message.channel.send({
                embeds: [{
                    title: "🎉 Subiste de nivel",
                    description: `${message.author} ahora es nivel **${data.level}**`,
                    color: 0x8000ff
                }]
            });

            // 🎭 ROLES
            const roleId = levelRoles[data.level];

            if (roleId) {
                const role = message.guild.roles.cache.get(roleId);

                if (role) {
                    message.member.roles.add(role).catch(() => {});

                    message.channel.send({
                        embeds: [{
                            description: `🎭 ${message.author} obtuvo el rol **${role.name}**`,
                            color: 0x00ff99
                        }]
                    });
                }
            }
        }

        await data.save();

        console.log(`XP añadido a ${message.author.username}`);
    }
};