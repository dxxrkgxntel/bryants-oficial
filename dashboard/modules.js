const messageVariables = {
    welcome: [
        { token: "{{user}}", label: "Miembro", description: "Mención al miembro que entra." },
        { token: "{{username}}", label: "Nombre", description: "Nombre de usuario, sin mención." },
        { token: "{{userid}}", label: "ID", description: "ID del miembro." },
        { token: "{{server}}", label: "Servidor", description: "Nombre del servidor." },
        { token: "{{members}}", label: "Miembros", description: "Cantidad de miembros." },
        { token: "{{date}}", label: "Fecha", description: "Fecha actual." },
        { token: "{{time}}", label: "Hora", description: "Hora actual." },
        { token: "{{accountAge}}", label: "Cuenta", description: "Antigüedad de la cuenta." }
    ],
    leave: [
        { token: "{{user}}", label: "Miembro", description: "Nombre del miembro que salió." },
        { token: "{{username}}", label: "Nombre", description: "Nombre de usuario." },
        { token: "{{userid}}", label: "ID", description: "ID del miembro." },
        { token: "{{server}}", label: "Servidor", description: "Nombre del servidor." },
        { token: "{{members}}", label: "Miembros", description: "Cantidad de miembros." },
        { token: "{{date}}", label: "Fecha", description: "Fecha actual." },
        { token: "{{time}}", label: "Hora", description: "Hora actual." }
    ],
    birthday: [
        { token: "{{user}}", label: "Miembro", description: "Mención al cumpleañero." },
        { token: "{{username}}", label: "Nombre", description: "Nombre de usuario." },
        { token: "{{userid}}", label: "ID", description: "ID del miembro." },
        { token: "{{server}}", label: "Servidor", description: "Nombre del servidor." },
        { token: "{{members}}", label: "Miembros", description: "Cantidad de miembros." },
        { token: "{{reward}}", label: "Recompensa", description: "Monedas otorgadas." },
        { token: "{{date}}", label: "Fecha", description: "Fecha actual." },
        { token: "{{time}}", label: "Hora", description: "Hora actual." }
    ],
    birthdayReminder: [
        { token: "{{user}}", label: "Miembro", description: "Mención al cumpleañero." },
        { token: "{{username}}", label: "Nombre", description: "Nombre de usuario." },
        { token: "{{userid}}", label: "ID", description: "ID del miembro." },
        { token: "{{server}}", label: "Servidor", description: "Nombre del servidor." },
        { token: "{{members}}", label: "Miembros", description: "Cantidad de miembros." },
        { token: "{{date}}", label: "Fecha", description: "Fecha actual." },
        { token: "{{time}}", label: "Hora", description: "Hora actual." }
    ],
    boost: [
        { token: "{{user}}", label: "Miembro", description: "Mención al booster." },
        { token: "{{username}}", label: "Nombre", description: "Nombre de usuario." },
        { token: "{{userid}}", label: "ID", description: "ID del miembro." },
        { token: "{{server}}", label: "Servidor", description: "Nombre del servidor." },
        { token: "{{members}}", label: "Miembros", description: "Cantidad de miembros." },
        { token: "{{boost}}", label: "Boosts", description: "Boosts actuales del servidor." },
        { token: "{{date}}", label: "Fecha", description: "Fecha actual." },
        { token: "{{time}}", label: "Hora", description: "Hora actual." }
    ],
    level: [
        { token: "{{user}}", label: "Miembro", description: "Mención al miembro." },
        { token: "{{username}}", label: "Nombre", description: "Nombre de usuario." },
        { token: "{{userid}}", label: "ID", description: "ID del miembro." },
        { token: "{{server}}", label: "Servidor", description: "Nombre del servidor." },
        { token: "{{level}}", label: "Nivel", description: "Nivel alcanzado." },
        { token: "{{xp}}", label: "XP", description: "Experiencia del miembro." },
        { token: "{{reward}}", label: "Recompensa", description: "Recompensa obtenida." },
        { token: "{{role}}", label: "Rol", description: "Rol concedido." },
        { token: "{{date}}", label: "Fecha", description: "Fecha actual." },
        { token: "{{time}}", label: "Hora", description: "Hora actual." }
    ]
};

const configurations = {
    autoroles: {
        title: "Autoroles",
        category: "Comunidad",
        model: require("../Models/autoRoleType"),
        guildField: "guildId",
        fields: [
            { name: "userRole", label: "Rol para miembros", type: "role" },
            { name: "botRole", label: "Rol para bots", type: "role" }
        ]
    },
    welcome: {
        title: "Bienvenidas",
        category: "Comunidad",
        model: require("../Models/welcomeSchema"),
        guildField: "Guild",
        fields: [
            { name: "Channel", label: "Canal", type: "channel", channelTypes: [0] },
            { name: "Title", label: "Título", type: "text", maxLength: 256, optional: true, templateComposer: true, templateVariables: messageVariables.welcome },
            { name: "MessageDes", label: "Descripción", type: "textarea", maxLength: 4000, optional: true, templateComposer: true, templateVariables: messageVariables.welcome, help: "Admite variables con llaves dobles, por ejemplo {{user}}, {{server}} y {{members}}. También puedes insertarlas con los botones." },
            { name: "Color", label: "Color hexadecimal", type: "color", optional: true },
            { name: "Banner", label: "URL del banner", type: "url", optional: true },
            { name: "Thumbnail", label: "URL de miniatura", type: "url", optional: true },
            { name: "SendDM", label: "Activar mensajes de bienvenida al DM", type: "boolean", help: "Cuando esté activo, el bot enviará también un mensaje privado al nuevo miembro." },
            { name: "DMTitle", label: "Título del mensaje privado", type: "text", maxLength: 256, optional: true, templateComposer: true, templateVariables: messageVariables.welcome },
            { name: "DMMessage", label: "Mensaje de bienvenida al DM", type: "textarea", maxLength: 4000, optional: true, templateComposer: true, templateVariables: messageVariables.welcome, help: "Usa {{user}}, {{username}}, {{server}} y las demás variables de bienvenida." },
            { name: "DMColor", label: "Color hexadecimal del DM", type: "color", optional: true },
            { name: "DMBanner", label: "URL del banner del DM", type: "url", optional: true },
              { name: "DMThumbnail", label: "URL de miniatura del DM", type: "url", optional: true },
              { name: "Buttons", label: "Botones del mensaje de bienvenida", type: "buttons", optional: true, help: "Añade botones con un enlace o una acción para reclamar un rol." }
        ]
    },
    leaves: {
        title: "Salidas",
        category: "Comunidad",
        model: require("../Models/leaveSchema"),
        guildField: "Guild",
        fields: [
            { name: "Channel", label: "Canal", type: "channel", channelTypes: [0] },
            { name: "Title", label: "Título", type: "text", maxLength: 256, optional: true, templateComposer: true, templateVariables: messageVariables.leave },
            { name: "MessageDes", label: "Descripción", type: "textarea", maxLength: 4000, optional: true, templateComposer: true, templateVariables: messageVariables.leave, help: "Admite variables con llaves dobles, por ejemplo {{user}}, {{server}} y {{members}}. También puedes insertarlas con los botones." },
            { name: "Color", label: "Color hexadecimal", type: "color", optional: true },
            { name: "Banner", label: "URL del banner", type: "url", optional: true },
            { name: "Thumbnail", label: "URL de miniatura", type: "url", optional: true }
        ]
    },
    birthday: {
        title: "Cumpleaños",
        category: "Comunidad",
        model: require("../Models/BirthdayConfig"),
        guildField: "guildId",
        fields: [
            { name: "channelId", label: "Canal de anuncios", type: "channel", channelTypes: [0], optional: true },
            { name: "roleId", label: "Rol de cumpleaños", type: "role", optional: true },
            { name: "birthdayTitle", label: "Título del aviso", type: "text", maxLength: 256, optional: true, templateComposer: true, templateVariables: messageVariables.birthday },
            { name: "birthdayDescription", label: "Descripción del aviso", type: "textarea", maxLength: 4000, optional: true, templateComposer: true, templateVariables: messageVariables.birthday, help: "Puedes insertar variables como {{user}}, {{server}} y {{reward}} con los botones." },
            { name: "birthdayBanner", label: "URL del banner", type: "url", optional: true },
            { name: "birthdayColor", label: "Color hexadecimal", type: "color", optional: true },
            { name: "birthdayReminder", label: "Recordatorio del día anterior", type: "textarea", maxLength: 2000, optional: true, templateComposer: true, templateVariables: messageVariables.birthdayReminder, help: "Puedes insertar variables como {{user}}, {{server}} y {{date}} con los botones." },
            { name: "birthdayReward", label: "Monedas de cumpleaños", type: "number", min: 0, max: 1000000, optional: true }
        ]
    },
    boosts: {
        title: "Boosts",
        category: "Comunidad",
        model: require("../Models/boostSchema"),
        guildField: "guildId",
        fields: [
            { name: "boosterRole", label: "Rol Booster", type: "role" },
            { name: "boosterVipRole", label: "Rol Booster VIP", type: "role" },
            { name: "boosterLegendRole", label: "Rol Booster Legend", type: "role" },
            { name: "boostChannel", label: "Canal de avisos", type: "channel", channelTypes: [0, 5] },
            { name: "boostTitle", label: "Título del aviso", type: "text", maxLength: 256, optional: true, templateComposer: true, templateVariables: messageVariables.boost },
            { name: "boostDescription", label: "Descripción", type: "textarea", maxLength: 4000, optional: true, templateComposer: true, templateVariables: messageVariables.boost, help: "Puedes insertar variables como {{user}}, {{server}} y {{boost}} con los botones." },
            { name: "boostColor", label: "Color hexadecimal", type: "color", optional: true },
            { name: "boostThumbnail", label: "URL de miniatura", type: "url", optional: true },
              { name: "boostImage", label: "URL del banner", type: "url", optional: true },
              { name: "boostButtons", label: "Botones del aviso de boost", type: "buttons", optional: true, help: "Configura hasta cinco botones para reclamar roles o abrir enlaces." }
        ]
    },
    stats: {
        title: "Estadísticas del servidor",
        category: "Servidor",
        description: "Configura la categoría y los dos canales de voz que muestran el total de miembros y la invitación personalizada. El bot actualiza los nombres de esos canales.",
        model: require("../Models/ServerStatsConfig"),
        guildField: "guildId",
        fields: [
            { name: "categoryId", label: "Categoría de estadísticas", type: "category", help: "Elige la categoría donde están —o estarán— los dos canales de voz de estadísticas." },
            { name: "membersChannelId", label: "Canal de miembros", type: "voice", help: "Canal de voz cuyo nombre muestra cuántos miembros tiene el servidor." },
            { name: "inviteChannelId", label: "Canal de invitación", type: "voice", help: "Canal de voz cuyo nombre muestra tu enlace personalizado, por ejemplo .gg/bryantfamily." },
            { name: "inviteLink", label: "Invitación personalizada (.gg/código)", type: "text", maxLength: 100, help: "Escribe el enlace o código que quieras mostrar. El bot lo incluye en el nombre del canal." }
        ]
    },
    logs: {
        title: "Logs",
        category: "Moderación",
        model: require("../Models/logsSchema"),
        guildField: "Guild",
        fields: [
            { name: "Enabled", label: "Sistema activo", type: "boolean", default: true },
            { name: "Channel", label: "Canal de logs", type: "channel", channelTypes: [0] }
        ]
    },
    reports: {
        title: "Reportes",
        category: "Moderación",
        model: require("../Models/reportGuildSchema"),
        guildField: "reportGuildId",
        fields: [
            { name: "Enabled", label: "Sistema activo", type: "boolean", default: true },
            { name: "reportChannelId", label: "Canal de reportes", type: "channel", channelTypes: [0] }
        ]
    },
    antiLinks: {
        title: "AntiLinks",
        category: "Moderación",
        model: require("../Models/AntiLinksConfig"),
        guildField: "guildId",
        fields: [
            { name: "enabled", label: "Sistema activo", type: "boolean" },
            { name: "allowedChannels", label: "Canales permitidos", type: "channel-list", channelTypes: [0] },
            { name: "logsChannel", label: "Canal de logs", type: "channel", channelTypes: [0], optional: true }
        ]
    },
    antiScam: {
        title: "AntiScam",
        category: "Moderación",
        model: require("../Models/AntiScam"),
        guildField: "guildId",
        fields: [
            { name: "enabled", label: "Sistema activo", type: "boolean" },
            { name: "punishment", label: "Castigo", type: "select", options: ["delete", "timeout", "kick", "ban"] },
            { name: "timeoutDuration", label: "Duración de timeout (minutos)", type: "number", min: 1, max: 40320 },
            { name: "logChannelId", label: "Canal de logs", type: "channel", channelTypes: [0], optional: true },
            { name: "whitelistDomains", label: "Dominios permitidos", type: "string-list" },
            { name: "ignoredChannels", label: "Canales ignorados", type: "channel-list" },
            { name: "ignoredRoles", label: "Roles ignorados", type: "role-list" }
        ]
    },
    antiMultimedia: {
        title: "AntiMultimedia",
        category: "Moderación",
        model: require("../Models/ImageConfig"),
        guildField: "guildId",
        fields: [
            { name: "enabled", label: "Sistema activo", type: "boolean", default: true },
            { name: "allowedChannels", label: "Canales multimedia", type: "channel-list", channelTypes: [0] },
            { name: "logChannel", label: "Canal de logs", type: "channel", channelTypes: [0], optional: true },
            { name: "thumbnail", label: "URL de miniatura para logs", type: "url", optional: true },
            { name: "image", label: "URL de imagen para logs", type: "url", optional: true }
        ]
    },
    confessions: {
        title: "Confesiones",
        category: "Comunidad",
        model: require("../Models/confesionesSetUp"),
        guildField: "guildId",
        fields: [
            { name: "channelId", label: "Canal", type: "channel", channelTypes: [0] },
            { name: "Enabled", label: "Sistema activo", type: "boolean", default: true }
        ]
    },
    suggestions: {
        title: "Sugerencias",
        category: "Comunidad",
        model: require("../Models/suggestSchema"),
        guildField: "guildSuggest",
        fields: [
            { name: "guildChannel", label: "Canal", type: "channel", channelTypes: [0] },
            { name: "Enabled", label: "Sistema activo", type: "boolean" }
        ]
    },
    polls: {
        title: "Encuestas",
        category: "Comunidad",
        model: require("../Models/PollConfig"),
        guildField: "guildId",
        fields: [{ name: "channelId", label: "Canal de encuestas", type: "channel", channelTypes: [0, 5] }]
    },
    purge: {
        title: "Limpieza automática",
        category: "Moderación",
        model: require("../Models/PurgeConfig"),
        guildField: "guildId",
        fields: [
            { name: "enabled", label: "Sistema activo", type: "boolean", default: true },
            { name: "channelId", label: "Canal que se limpia a medianoche (hora RD)", type: "channel", channelTypes: [0, 5] }
        ]
    },
    voiceConnection: {
        title: "Conexión de voz del bot",
        category: "Servidor",
        description: "El bot aplicará el canal seleccionado en unos segundos después de guardar.",
        model: require("../Models/VoiceConnectConfig"),
        guildField: "guildId",
        fields: [{ name: "channelId", label: "Canal de voz", type: "voice" }]
    },
    tempvoice: {
        title: "TempVoice",
        category: "Servidor",
        description: "Administra las configuraciones existentes de TempVoice. Cada una conecta su categoría, canal creador de voz y canal de texto del panel; el ID del mensaje es opcional.",
        model: require("../Models/tempVoiceSchema"),
        guildField: "guildId",
        fields: [
            { name: "enabled", label: "Sistema activo", type: "boolean" },
            { name: "setups", label: "Canales creadores y paneles", type: "setups" }
        ]
    },
    levelSettings: {
        title: "Niveles y XP",
        category: "Economía y XP",
        model: require("../Models/LevelConfig"),
        guildField: "guildId",
        fields: [
            { type: "section", label: "Aviso al subir de nivel por mensaje" },
            { name: "levelChannel", label: "Canal de avisos", type: "channel", channelTypes: [0], optional: true },
            { name: "messageLevelTitle", label: "Título del aviso por mensaje", type: "text", maxLength: 256, optional: true, templateComposer: true, templateVariables: messageVariables.level },
            { name: "messageLevelDescription", label: "Descripción del aviso por mensaje", type: "textarea", maxLength: 4000, optional: true, templateComposer: true, templateVariables: messageVariables.level, help: "Se muestra cuando el miembro sube de nivel por XP obtenida al escribir." },
            { type: "section", label: "Aviso al subir de nivel por voz" },
            { name: "voiceLevelTitle", label: "Título del aviso por voz", type: "text", maxLength: 256, optional: true, templateComposer: true, templateVariables: messageVariables.level },
            { name: "voiceLevelDescription", label: "Descripción del aviso por voz", type: "textarea", maxLength: 4000, optional: true, templateComposer: true, templateVariables: messageVariables.level, help: "Se muestra cuando el miembro sube de nivel por XP obtenida en canales de voz." },
            { type: "section", label: "Aviso al recibir un rol por nivel" },
            { name: "levelRoleTitle", label: "Título al recibir un rol", type: "text", maxLength: 256, optional: true, templateComposer: true, templateVariables: messageVariables.level },
            { name: "levelRoleDescription", label: "Descripción al recibir un rol", type: "textarea", maxLength: 4000, optional: true, templateComposer: true, templateVariables: messageVariables.level, help: "Puedes insertar variables como {{user}}, {{level}} y {{role}} con los botones." },
            { name: "levelImage", label: "URL de imagen", type: "url", optional: true },
            { name: "levelThumbnail", label: "URL de miniatura", type: "url", optional: true },
            { name: "levelColor", label: "Color hexadecimal", type: "color", optional: true },
            { name: "levelCoinReward", label: "Monedas por cada nivel alcanzado", type: "number", min: 0, max: 1000000, optional: true },
            { name: "messageXpMin", label: "XP mínima por mensaje", type: "number", min: 0, max: 1000, default: 5 },
            { name: "messageXpMax", label: "XP máxima por mensaje", type: "number", min: 0, max: 1000, default: 14 },
            { name: "messageXpCooldownMs", label: "Espera entre XP de mensajes (ms)", type: "number", min: 0, max: 3600000, default: 5000 },
            { name: "voiceXpAmount", label: "XP por actividad de voz", type: "number", min: 1, max: 1000, default: 15 },
            { name: "voiceXpCooldownMs", label: "Espera entre XP de voz (ms)", type: "number", min: 1000, max: 3600000, default: 300000 },
            { name: "voiceMinMembers", label: "Miembros mínimos en la sala", type: "number", min: 1, max: 99, default: 2 }
        ]
    },
    economy: {
        title: "Economía",
        category: "Economía y XP",
        model: require("../Models/EconomyConfig"),
        guildField: "guildId",
        fields: [
            { name: "dailyAmount", label: "Recompensa diaria", type: "number", min: 0 },
            { name: "dailyCooldown", label: "Tiempo entre recompensas (ms)", type: "number", min: 0 },
            { name: "workMin", label: "Trabajo: mínimo", type: "number", min: 0 },
            { name: "workMax", label: "Trabajo: máximo", type: "number", min: 0 },
            { name: "workCooldown", label: "Tiempo entre trabajos (ms)", type: "number", min: 0 },
            { name: "gambleMin", label: "Apuesta: mínimo", type: "number", min: 0 },
            { name: "gambleMax", label: "Apuesta: máximo", type: "number", min: 0 }
        ]
    },
    prestige: {
        title: "Prestigios",
        category: "Economía y XP",
        model: require("../Models/PrestigeConfig"),
        guildField: "guildId",
        fields: [
            { name: "enabled", label: "Sistema activo", type: "boolean" },
            { name: "prestigeRoles", label: "Roles de prestigio", type: "json", help: "Elige el rol que recibirá cada miembro al alcanzar uno de los cinco prestigios." },
            { name: "prestigeRewards", label: "Recompensas por prestigio", type: "json", help: "Indica las monedas que se entregarán en cada nivel de prestigio." }
        ]
    },
    weeklyDrop: {
        title: "Recompensa semanal",
        category: "Economía y XP",
        model: require("../Models/WeeklyDrop"),
        guildField: "guildId",
        fields: [
            { name: "enabled", label: "Sistema activo", type: "boolean" },
            { name: "minAmount", label: "Cantidad mínima", type: "number", min: 1 },
            { name: "maxAmount", label: "Cantidad máxima", type: "number", min: 1 },
            { name: "logChannelId", label: "Canal de avisos", type: "channel", channelTypes: [0], optional: true }
        ]
    }
};

const lists = {
    levelRewards: {
        title: "Recompensas de nivel",
        category: "Economía y XP",
        model: require("../Models/LevelReward"),
        fields: [
            { name: "level", label: "Nivel requerido", type: "number", min: 1 },
            { name: "roleId", label: "Rol otorgado", type: "role" }
        ],
        identity: "level"
    },
    quests: {
        title: "Misiones",
        category: "Economía y XP",
        model: require("../Models/Quest"),
        fields: [
            { name: "questId", label: "ID de la misión", type: "text", maxLength: 80 },
            { name: "name", label: "Nombre", type: "text", maxLength: 100 },
            { name: "description", label: "Descripción", type: "textarea", maxLength: 1000 },
            { name: "type", label: "Frecuencia", type: "select", options: ["daily", "weekly"] },
            { name: "category", label: "Categoría", type: "select", options: ["messages", "voice", "economy", "games"] },
            { name: "goal", label: "Objetivo", type: "number", min: 1 },
            { name: "reward.coins", label: "Recompensa en monedas", type: "number", min: 0 },
            { name: "reward.xp", label: "Recompensa en XP", type: "number", min: 0 },
            { name: "enabled", label: "Misión activa", type: "boolean" }
        ],
        identity: "questId"
    },
    shopItems: {
        title: "Tienda de roles",
        category: "Economía y XP",
        model: require("../Models/ShopItem"),
        fields: [
            { name: "roleId", label: "Rol", type: "role" },
            { name: "price", label: "Precio", type: "number", min: 1 },
            { name: "emoji", label: "Emoji", type: "text", maxLength: 100 },
            { name: "description", label: "Descripción", type: "text", maxLength: 300 }
        ],
        identity: "roleId"
    },
    bankDonorRoles: {
        title: "Roles de bonificación bancaria",
        category: "Economía y XP",
        model: require("../Models/BankDonorRoles"),
        fields: [
            { name: "roleId", label: "Rol", type: "role" },
            { name: "requiredAmount", label: "Donación mínima", type: "number", min: 1 }
        ],
        identity: "roleId"
    },
    birthdayMembers: {
        title: "Cumpleaños de miembros",
        category: "Comunidad",
        model: require("../Models/Birthday"),
        fields: [
            { name: "userId", label: "ID del miembro", type: "text", maxLength: 25 },
            { name: "day", label: "Día", type: "number", min: 1, max: 31 },
            { name: "month", label: "Mes", type: "number", min: 1, max: 12 },
            { name: "channelId", label: "Canal de anuncio personalizado", type: "channel", channelTypes: [0], optional: true }
        ],
        identity: "userId"
    }
};

module.exports = { configurations, lists };
