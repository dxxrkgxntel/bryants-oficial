const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, AttachmentBuilder } = require("discord.js");
const Level = require("../../Models/Level");
const LevelConfig = require("../../Models/LevelConfig");
const LevelReward = require("../../Models/LevelReward");
const EconomyUser = require("../../Models/EconomyUser");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

const BANNER = "https://i.imgur.com/V3VnbyI.png";
const PURPLE = 0x8A2BE2;

try {
    GlobalFonts.registerFromPath(path.join(__dirname, "../../Assets/Fonts/Audiowide-Regular.ttf"), "Audiowide");
} catch (_) {}

function panel(body, accent = PURPLE, extra = []) {
    return {
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: accent,
            components: [
                { type: 12, items: [{ media: { url: BANNER } }] },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: body },
                ...extra
            ]
        }]
    };
}

function xpNeeded(level) {
    return 5 * (level ** 2) + 50 * level + 100;
}

async function positionOf(guildId, data) {
    return (await Level.countDocuments({
        guildId,
        $or: [{ level: { $gt: data.level } }, { level: data.level, xp: { $gt: data.xp } }]
    })) + 1;
}

async function rank(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("usuario") || interaction.user;
    const data = await Level.findOne({ guildId: interaction.guild.id, userId: user.id });
    if (!data) return interaction.editReply(panel("## ⭐ BF Levels • Rank\n❌ Ese usuario todavía no tiene datos de nivel.", 0xED4245));
    const needed = xpNeeded(data.level);
    const pos = await positionOf(interaction.guild.id, data);
    const pct = Math.min(100, Math.floor((data.xp / needed) * 100));
    const filled = Math.min(10, Math.floor(pct / 10));
    return interaction.editReply(panel(
        `## ⭐ BF Levels • Rank\n### <@${user.id}>\n🏆 **Posición:** #${pos}\n⭐ **Nivel:** ${data.level}\n✨ **XP:** ${data.xp.toLocaleString()} / ${needed.toLocaleString()}\n📈 ${"🟪".repeat(filled)}${"⬛".repeat(10-filled)} **${pct}%**`
    ));
}

async function perfil(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("usuario") || interaction.user;
    const [data, economy, member] = await Promise.all([
        Level.findOne({ guildId: interaction.guild.id, userId: user.id }),
        EconomyUser.findOne({ guildId: interaction.guild.id, userId: user.id }),
        interaction.guild.members.fetch(user.id).catch(() => null)
    ]);
    if (!data) return interaction.editReply(panel("## 👤 BF Levels • Perfil\n❌ Este usuario todavía no tiene datos de nivel.", 0xED4245));
    const pos = await positionOf(interaction.guild.id, data);
    const needed = xpNeeded(data.level);
    const badges = [];
    if (interaction.guild.ownerId === user.id) badges.push("👑 Owner");
    if (member?.permissions.has(PermissionFlagsBits.Administrator)) badges.push("🛠️ Admin");
    if (member?.premiumSince) badges.push("🚀 Booster");
    if (pos <= 3) badges.push(pos===1?"🥇 Top 1":pos===2?"🥈 Top 2":"🥉 Top 3");
    if ((economy?.wallet || 0) >= 100000) badges.push("💰 Magnate");
    if (data.level >= 25) badges.push("🔥 Nivel 25+");
    return interaction.editReply(panel(
        `## 👤 BF Levels • Perfil\n### <@${user.id}>\n⭐ **Nivel:** ${data.level}\n🏆 **Ranking:** #${pos}\n✨ **XP:** ${data.xp.toLocaleString()} / ${needed.toLocaleString()}\n💰 **Wallet:** ${(economy?.wallet || 0).toLocaleString()}\n🏦 **Banco:** ${(economy?.bank || 0).toLocaleString()}\n🎖️ **Badges:** ${badges.join(" • ") || "Ninguno"}`
    ));
}

async function top(interaction) {
    await interaction.deferReply();
    const data = await Level.find({ guildId: interaction.guild.id }).sort({ level: -1, xp: -1 }).limit(10);
    if (!data.length) return interaction.editReply(panel("## 🏆 BF Levels • Top\n❌ Todavía no hay datos de niveles.", 0xED4245));
    const medals=["👑","🥈","🥉"];
    const lines=data.map((u,i)=>`${medals[i]||"🏅"} **#${i+1}** • <@${u.userId}>\n> ⭐ Nivel **${u.level}** • ✨ ${u.xp.toLocaleString()} XP`).join("\n\n");
    return interaction.editReply(panel(`## 🏆 BF Levels • Top 10\n${lines}`));
}

async function giveXp(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user=interaction.options.getUser("usuario"), amount=interaction.options.getInteger("xp");
    let data=await Level.findOne({guildId:interaction.guild.id,userId:user.id});
    if(!data) data=new Level({guildId:interaction.guild.id,userId:user.id,xp:0,level:0});
    data.xp += amount; await data.save();
    return interaction.editReply(panel(`## 📈 BF Levels • Añadir XP\n✅ Se añadieron **${amount.toLocaleString()} XP** a <@${user.id}>.\n\n✨ **XP actual:** ${data.xp.toLocaleString()}`,0x57F287));
}

async function removeXp(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user=interaction.options.getUser("usuario"), amount=interaction.options.getInteger("xp");
    const data=await Level.findOne({guildId:interaction.guild.id,userId:user.id});
    if(!data) return interaction.editReply(panel("## 📉 BF Levels • Remover XP\n❌ Ese usuario no tiene XP.",0xED4245));
    const removed=Math.min(amount,data.xp); data.xp=Math.max(0,data.xp-amount); await data.save();
    return interaction.editReply(panel(`## 📉 BF Levels • Remover XP\n✅ Se removieron **${removed.toLocaleString()} XP** a <@${user.id}>.\n\n✨ **XP actual:** ${data.xp.toLocaleString()}`,0xED4245));
}

async function channel(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const ch=interaction.options.getChannel("canal");
    await LevelConfig.findOneAndUpdate({guildId:interaction.guild.id},{levelChannel:ch.id},{upsert:true,new:true,setDefaultsOnInsert:true});
    return interaction.editReply(panel(`## ⚙️ BF Levels • Canal\n✅ Los mensajes de nivel se enviarán en ${ch}.`,0x57F287));
}

async function role(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const level=interaction.options.getInteger("nivel"), r=interaction.options.getRole("rol");
    if(r.managed) return interaction.editReply(panel("## 🎖️ BF Levels • Rol\n❌ Ese rol está administrado por una integración y no puede usarse como recompensa.",0xED4245));
    await LevelReward.findOneAndUpdate({guildId:interaction.guild.id,level},{roleId:r.id},{upsert:true,new:true,setDefaultsOnInsert:true});
    return interaction.editReply(panel(`## 🎖️ BF Levels • Rol por nivel\n✅ ${r} será otorgado al alcanzar el **nivel ${level}**.`,0x57F287));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("level").setDescription("Sistema de niveles de Bryant's Oficial")
        .addSubcommand(s=>s.setName("rank").setDescription("Mira tu nivel y XP").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(false)))
        .addSubcommand(s=>s.setName("perfil").setDescription("Muestra el perfil avanzado de un usuario").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(false)))
        .addSubcommand(s=>s.setName("top").setDescription("Top de niveles del servidor"))
        .addSubcommand(s=>s.setName("give-xp").setDescription("Dar XP a un usuario").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(true)).addIntegerOption(o=>o.setName("xp").setDescription("Cantidad de XP").setRequired(true).setMinValue(1)))
        .addSubcommand(s=>s.setName("remove-xp").setDescription("Remover XP a un usuario").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(true)).addIntegerOption(o=>o.setName("xp").setDescription("Cantidad de XP").setRequired(true).setMinValue(1)))
        .addSubcommand(s=>s.setName("channel").setDescription("Configura el canal de mensajes de nivel").addChannelOption(o=>o.setName("canal").setDescription("Canal donde se enviarán los niveles").addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(s=>s.setName("role").setDescription("Configura un rol por nivel").addIntegerOption(o=>o.setName("nivel").setDescription("Nivel requerido").setRequired(true).setMinValue(1)).addRoleOption(o=>o.setName("rol").setDescription("Rol a otorgar").setRequired(true))),
    async execute(interaction) {
        const sub=interaction.options.getSubcommand();
        if(["give-xp","remove-xp","channel","role"].includes(sub) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
            return interaction.reply({content:"❌ Necesitas permisos de administrador.",flags:MessageFlags.Ephemeral});
        return ({rank,perfil,top,"give-xp":giveXp,"remove-xp":removeXp,channel,role})[sub](interaction);
    }
};
