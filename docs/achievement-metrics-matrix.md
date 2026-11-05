# Matriz de auditoría de las 106 métricas de logros — Bryvex Bot

> Rama: `feature/notoq-achievements-import`. Estado basado en evidencia localizada en código y modelos. «Pendiente» significa que no hay llamada confirmada al tracker, aunque pueda existir una fuente de datos aprovechable.

## Resumen

- Catálogo: **397 logros / 106 métricas únicas**.
- Conectadas: **32**.
- Parciales: **4**.
- Fuente existente o dato calculable, sin conexión al catálogo: **17**.
- Pendientes de localizar/implementar o validar: **53**.
- Ninguna fila pendiente se considera funcional hasta que exista llamada explícita, persistencia correcta y prueba.

## Matriz

| # | Métrica | Logros | Estado | Evidencia actual / siguiente punto de integración | Ejemplos |
|---:|---|---:|---|---|---|
| 1 | `account_age_days` | 2 | **Dato calculable; falta conexión** | Discord User.createdAt + Events/Guild/sistemaDeIngreso.js — Calcular edad de cuenta; respetar mínimo de edad de cuenta del sistema. | Discord Veteran (1825); Discord Ancient (3650) |
| 2 | `achievements_unlocked` | 8 | **Dato existente; falta conexión** | Models/UserAchievement.js — Se puede contar desbloqueos, excluyendo niveles repetidos del mismo logro según definición. | Collector (5); Achiever (10) |
| 3 | `activity_awards` | 3 | **Pendiente** | sistema de temporada/premios; no se localizó adjudicación por usuario | Top Member (1); Community Champion (5) |
| 4 | `activity_coins` | 2 | **Pendiente** | sin sistema de pesca/minería identificado | Gatherer (100000); Resource Baron (1000000) |
| 5 | `ai_conversations` | 2 | **Pendiente** | asistente IA/dashboard; falta identificar inicio de conversación | Conversationalist (10); Deep Talker (100) |
| 6 | `ai_messages` | 6 | **Pendiente** | asistente IA/dashboard; falta localizar flujo y definir userId/guildId | AI Curious (10); AI Chatter (100) |
| 7 | `applications_accepted` | 2 | **Pendiente** | sin sistema de solicitudes identificado | Welcome Aboard (1); Team Player (5) |
| 8 | `applications_sent` | 2 | **Pendiente** | sin sistema de solicitudes identificado | Applicant (1); Persistent Applicant (5) |
| 9 | `attachments_sent` | 2 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · cuenta adjuntos reales del mensaje | File Sharer (100); Data Hoarder (1000) |
| 10 | `bank_balance` | 3 | **Dato existente; falta conexión** | Models/EconomyUser.js + Commands/Economy/economy.js — Saldo bancario consultable. | Banker (100000); Vault Keeper (5000000) |
| 11 | `birthday_celebrations` | 3 | **Conectada** | Handlers/birthdaySystem.js + Models/Birthday.js · suma solo después de enviar el aviso y guarda el año celebrado para evitar repeticiones | First Birthday (1); Birthday Regular (3) |
| 12 | `birthday_set` | 1 | **Conectada** | Commands/Utility/birthday.js · suma únicamente el primer registro; editar la fecha no repite el logro | Party Ready (1) |
| 13 | `boost_months` | 4 | **Dato calculable; falta conexión** | Events/Logs/boostSystem.js · guildMemberUpdate — Calcular meses desde premiumSince; verificar continuidad del boost. | Loyal Booster (3); Boost Legend (12) |
| 14 | `boosts` | 1 | **Conectada** | Events/Logs/boostSystem.js · cuenta el inicio de un boost tras detectar premiumSince por primera vez | Supporter (1) |
| 15 | `bot_mentions` | 3 | **Conectada** | Events/Levels/messageCreate2.js · messageCreate — Cuenta menciones al bot. | Hey Bot (10); Bot Buddy (100) |
| 16 | `business_earnings` | 4 | **Pendiente** | sin modelo de negocios identificado | Small Business (100000); Business Owner (1000000) |
| 17 | `businesses_owned` | 2 | **Pendiente** | sin modelo de negocios identificado | Entrepreneur (1); Business Empire (5) |
| 18 | `characters_typed` | 3 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · cuenta puntos de código Unicode del contenido | Getting Started (5000); Ink Slinger (250000) |
| 19 | `clan_level` | 1 | **Pendiente** | sin sistema de clanes identificado | Stronghold (10) |
| 20 | `clan_member` | 1 | **Pendiente** | sin sistema de clanes identificado | Sworn In (1) |
| 21 | `clan_raids_won` | 2 | **Pendiente** | sin sistema de clanes identificado | Raid Hunter (1); Boss Slayer (25) |
| 22 | `clan_recruits` | 3 | **Pendiente** | sin sistema de clanes identificado | Recruiter (1); Headhunter (10) |
| 23 | `clan_season_league` | 2 | **Pendiente** | sin sistema de clanes identificado | Diamond Season (4); Champion Season (5) |
| 24 | `clan_wars_won` | 2 | **Pendiente** | sin sistema de clanes identificado | War Hero (1); Warlord (10) |
| 25 | `clan_xp_contributed` | 3 | **Pendiente** | sin sistema de clanes identificado | Contributor (10000); Pillar of the Clan (100000) |
| 26 | `code_blocks_sent` | 3 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · cuenta bloques cercados de código | Coder (10); Developer (100) |
| 27 | `coins` | 7 | **Dato parcial; falta definir semántica** | Models/EconomyUser.js + Commands/Economy/economy.js — Hay wallet y bank; confirmar si el logro mide saldo total o wallet. | Piggy Bank (1000); Coin Stacker (10000) |
| 28 | `commands_used` | 4 | **Pendiente** | Events/Messages/messageCreate.js + Events/Interaction/interactionCreate.js | Command Curious (25); Power User (250) |
| 29 | `counting_correct` | 6 | **Pendiente** | Localizar evento/comando responsable y conectar en el punto de éxito. | Counter (10); Number Cruncher (100) |
| 30 | `counting_highest` | 4 | **Pendiente** | Localizar evento/comando responsable y conectar en el punto de éxito. | Hundred Club (100); Thousand Reach (1000) |
| 31 | `counting_streak` | 4 | **Pendiente** | Localizar evento/comando responsable y conectar en el punto de éxito. | Steady Counter (25); Focused Counter (100) |
| 32 | `custom_emojis_used` | 7 | **Conectada** | Events/Levels/messageCreate2.js · messageCreate — Cuenta cada emoji personalizado del contenido. | Emoji User (50); Emoji Fan (500) |
| 33 | `daily_streak` | 8 | **Conectada** | Models/PersonalActivity.js + Functions/personalActivity.js — Mejor racha de días activos, independiente de la racha de recompensas económicas. | On a Roll (3); Week Streak (7) |
| 34 | `days_active` | 6 | **Conectada** | Models/PersonalActivity.js + Functions/personalActivity.js — Cuenta días UTC distintos con al menos un mensaje. | Regular (7); Committed (30) |
| 35 | `early_bird_messages` | 2 | **Conectada** | Functions/achievementMessageMetrics.js · 06:00–08:59 en America/Santo_Domingo | Early Bird (100); Sunrise Soul (1000) |
| 36 | `economy_daily_streak` | 3 | **Dato existente; falta conexión** | Models/EconomyUser.js + Commands/Economy/economy.js — Existe dailyStreak en economía. | Daily Devotee (7); Daily Loyalist (30) |
| 37 | `embeds_posted` | 2 | **Conectada** | Events/Levels/messageCreate2.js · messageCreate — Suma embeds adjuntos al mensaje. | Embed Enjoyer (25); Rich Poster (250) |
| 38 | `first_unlocks` | 4 | **Pendiente** | Functions/achievementTracker.js; falta detección atómica del primer desbloqueo | Pioneer (1); Trailblazer (5) |
| 39 | `fishing_trips` | 5 | **Pendiente** | sin sistema de pesca identificado | First Catch (1); Angler (25) |
| 40 | `flags_collected` | 5 | **Pendiente** | sin juego de banderas identificado | Globetrotter (10); Cartographer (50) |
| 41 | `game_guesses` | 3 | **Pendiente** | Commands/Fun/minijuegos.js; falta contar intentos | Guesser (100); Sharp Eye (1000) |
| 42 | `games_perfect` | 3 | **Pendiente** | Commands/Fun/minijuegos.js; falta registrar resultado perfecto | Perfectionist (10); Flawless Master (100) |
| 43 | `games_played` | 4 | **Dato existente; falta conexión** | Models/CasinoStats.js + Commands/Casino/casino.js — Existe totalGames para casino; comprobar si el catálogo quiere incluir solo casino o todos los minijuegos. | Casual Gamer (10); Regular Player (100) |
| 44 | `games_streak` | 2 | **Dato existente; falta conexión** | Models/CasinoStats.js + Commands/Casino/casino.js — Existe currentStreak de victorias. | Hot Streak (10); On Fire (25) |
| 45 | `games_won` | 4 | **Dato existente; falta conexión** | Models/CasinoStats.js + Commands/Casino/casino.js — Existe totalWins en estadísticas de casino. | Winner (10); Champion (100) |
| 46 | `gems` | 3 | **Pendiente** | sin sistema de gemas identificado | Gem Collector (50); Gem Baron (1000) |
| 47 | `gifs_sent` | 4 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · GIF adjuntos y enlaces .gif | GIF Enjoyer (50); GIF Master (500) |
| 48 | `giveaways_created` | 4 | **Pendiente** | Commands/Administration/weeklydrop.js; confirmar si equivale a sorteo creado por miembro | Giveaway Host (1); Generous Host (10) |
| 49 | `giveaways_entered` | 3 | **Pendiente** | Commands/Administration/weeklydrop.js; no se localizó registro individual de participantes | Hopeful (1); Lucky Participant (25) |
| 50 | `giveaways_won` | 3 | **Pendiente** | Commands/Administration/weeklydrop.js; no se localizó registro individual de ganadores | Lucky Winner (1); Fortune's Favorite (5) |
| 51 | `hall_of_fame` | 2 | **Pendiente** | sin sistema Hall of Fame identificado | Hall of Famer (1); Immortalized (10) |
| 52 | `images_sent` | 4 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · adjuntos con MIME de imagen, excluye GIF | Shutterbug (50); Gallery Owner (500) |
| 53 | `investment_profit` | 2 | **Pendiente** | sin sistema de inversiones identificado | In the Green (10000); Bull Market (1000000) |
| 54 | `investments_made` | 3 | **Pendiente** | sin sistema de inversiones identificado | Investor (1); Portfolio Builder (10) |
| 55 | `invites` | 7 | **Conectada** | Utils/inviteTracker.js · suma al invitador solo después de atribuir y guardar una invitación usada | Recruiter (1); Connector (10) |
| 56 | `items_owned` | 3 | **Dato existente; falta conexión** | Models/EconomyUser.js + Utils/shopHandlers.js — Existe inventario; el evento heredado itemsPurchased no mide artículos actualmente poseídos. | Collector (25); Window Shopper (5) |
| 57 | `level` | 11 | **Conectada** | Models/Level.js + Events/Levels/messageCreate2.js + Events/Levels/voiceXp.js · reporta el máximo nivel alcanzado con actualización absoluta y evita repetir reportes | Rookie (5); Apprentice (10) |
| 58 | `links_sent` | 2 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · enlaces HTTP(S) escritos en el contenido | Link Dropper (50); Web Weaver (500) |
| 59 | `long_messages` | 3 | **Conectada** | Functions/achievementMessageMetrics.js · mensaje de 500 caracteres o más | Essayist (10); Wall of Text (100) |
| 60 | `membership_days` | 9 | **Dato calculable; falta conexión** | Events/Guild/sistemaDeIngreso.js + member.joinedAt — Calcular antigüedad de membresía con joinedAt; necesita actualización periódica o cálculo al evaluar. | Fresh Face (7); Familiar Face (30) |
| 61 | `mentions_made` | 3 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · menciones a usuarios distintos del autor | Name Dropper (100); Social Pinger (1000) |
| 62 | `messages_sent` | 13 | **Conectada** | Events/Levels/messageCreate2.js · messageCreate — Suma mensajes de usuarios. | Casual Typer (100); Chatterbox (500) |
| 63 | `messages_starred` | 3 | **Pendiente** | sin sistema Starboard identificado | On the Board (1); Board Regular (10) |
| 64 | `mining_trips` | 4 | **Pendiente** | sin sistema de minería identificado | First Dig (1); Miner (25) |
| 65 | `mod_actions` | 4 | **Pendiente** | Commands/Administration/moderation.js; falta tracker por acción | Rookie Mod (1); Peacekeeper (25) |
| 66 | `net_worth` | 6 | **Dato derivable; falta conexión** | Models/EconomyUser.js — Patrimonio = wallet + bank; no incluye deuda/activos hasta definir fórmula. | Getting Comfortable (10000); Well Off (100000) |
| 67 | `night_owl_messages` | 3 | **Conectada** | Functions/achievementMessageMetrics.js · 00:00–05:59 en America/Santo_Domingo | Night Owl (100); Moon Dweller (1000) |
| 68 | `polls_created` | 3 | **Conectada** | Commands/Utility/poll.js · creación de encuesta — Suma al crear encuesta. | Pollster (5); Poll Maker (50) |
| 69 | `prestige_level` | 2 | **Conectada** | Commands/Economy/prestige.js · suma solo después de guardar correctamente el nuevo prestigio | Prestige (1); Prestige Master (5) |
| 70 | `prestige_points` | 2 | **Pendiente** | Localizar evento/comando responsable y conectar en el punto de éxito. | Prestige Points (100); Prestige Grinder (1000) |
| 71 | `properties_owned` | 3 | **Pendiente** | sin modelo de propiedades identificado | Homeowner (1); Landlord (5) |
| 72 | `property_income` | 3 | **Pendiente** | sin modelo de propiedades identificado | First Rent (10000); Rent Collector (1000000) |
| 73 | `questions_asked` | 6 | **Pendiente** | asistente IA/dashboard; falta definir pregunta válida | Curious (25); Inquirer (250) |
| 74 | `reactions_added` | 9 | **Conectada** | Events/Logs/personalReactionStats.js · messageReactionAdd — Cuenta reacciones añadidas. | Give or Take (10); True Star (100) |
| 75 | `reactions_received` | 6 | **Conectada** | Events/Logs/personalReactionStats.js · messageReactionAdd — Cuenta reacciones recibidas por el autor. | First Fan (10); Crowd Pleaser (100) |
| 76 | `referrals` | 3 | **Pendiente** | Models/DashboardReferral.js; verificar si la referencia pertenece a un miembro/servidor | Referrer (1); Brand Ambassador (5) |
| 77 | `replies_sent` | 3 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · mensajes con referencia a otro mensaje | Replier (100); Conversationalist (1000) |
| 78 | `reviews_written` | 5 | **Pendiente** | sin sistema de reseñas identificado | Reviewer (1); Critic (10) |
| 79 | `roles_count` | 2 | **Dato calculable; falta conexión** | Discord GuildMember.roles.cache — Contar roles del miembro excluyendo @everyone y roles gestionados si procede. | Role Collector (10); Role Hoarder (25) |
| 80 | `season_podiums` | 2 | **Pendiente** | Models/TrophyScore.js + TrophySettings; falta cálculo de podio | Podium Finish (1); Podium Regular (5) |
| 81 | `season_wins` | 3 | **Pendiente** | Models/TrophyScore.js + TrophySettings; falta cierre y adjudicación de temporadas | Season Champion (1); Title Defender (3) |
| 82 | `self_roles_taken` | 3 | **Pendiente** | Utils/SetupHandlers/autoRoleUB.js + Events/Interaction/* | Self-Made (1); Role Picker (10) |
| 83 | `spoilers_sent` | 3 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · mensajes con sintaxis de spoiler Discord ||...|| | Spoiler Alert (10); Secret Keeper (100) |
| 84 | `stars_given` | 3 | **Pendiente** | sin sistema de estrellas identificado | Star Giver (25); Generous Soul (250) |
| 85 | `stars_received` | 5 | **Pendiente** | sin sistema de estrellas identificado | Star Struck (1); Shining (25) |
| 86 | `stickers_sent` | 2 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · cuenta stickers del mensaje | Sticker Fan (50); Sticker Addict (500) |
| 87 | `streaming_minutes` | 4 | **Parcial** | Models/PersonalVoiceActivity.js + Functions/voiceActivity.js · sesión persistente de transmisión; falta validación en Discord real | Go Live (30); Streamer (600) |
| 88 | `threads_created` | 3 | **Conectada** | Events/Messages/threadCreateAchievement.js · threadCreate, atribuye el hilo a ownerId | Thread Starter (5); Thread Weaver (50) |
| 89 | `tickets_claimed` | 3 | **Pendiente** | Models/SupportTicket.js; no existe campo claimant confirmado | Ticket Claimer (10); Support Specialist (100) |
| 90 | `tickets_closed` | 3 | **Dato existente; falta conexión** | Models/SupportTicket.js + flujo de cierre de tickets — El modelo conserva closedAt. | Support Hero (10); Support Champion (100) |
| 91 | `tickets_opened` | 2 | **Dato existente; falta conexión** | Models/SupportTicket.js + flujo de creación de tickets — El modelo conserva estado open/closed. | Need Help? (1); Frequent Visitor (10) |
| 92 | `tokens` | 5 | **Pendiente** | sin campo o sistema de tokens identificado | Token Starter (10); Token Collector (100) |
| 93 | `top_star_post` | 2 | **Pendiente** | sin sistema Starboard identificado | Going Viral (25); Viral Sensation (100) |
| 94 | `total_earned` | 6 | **Pendiente** | todos los puntos de pago/recompensa · requiere ledger histórico | Hard Worker (10000); Grinder (100000) |
| 95 | `total_points` | 6 | **Dato existente; falta conexión** | Models/TrophyScore.js + Models/UserAchievement.js — Hay puntos de temporada y puntos ganados en logros; definir si global o por temporada. | Point Starter (100); Point Collector (500) |
| 96 | `total_spent` | 4 | **Pendiente** | Utils/shopHandlers.js + comandos de economía · requiere ledger histórico | Shopper (10000); Big Spender (100000) |
| 97 | `verified` | 1 | **Pendiente** | flujo de verificación; no se identificó modelo/evento específico | Verified (1) |
| 98 | `voice_joins` | 3 | **Conectada** | Events/Logs/personalVoiceStats.js + Functions/voiceAchievementMetrics.js · cuenta solo entrada real desde fuera de voz | Channel Hopper (25); Frequent Flyer (250) |
| 99 | `voice_minutes` | 12 | **Parcial** | Models/PersonalVoiceActivity.js + Functions/voiceActivity.js · guarda inicio de sesión y segundos/minutos reportados; falta validar recuperación en Discord real. | New Here? (5); Warming Up (30) |
| 100 | `voice_video_minutes` | 6 | **Parcial** | Models/PersonalVoiceActivity.js + Functions/voiceActivity.js · registra intervalos de cámara con persistencia; falta validación en Discord real | On Camera (30); Face Reveal (300) |
| 101 | `votes` | 4 | **Pendiente** | sin integración de votos identificada | Voter (1); Loyal Voter (25) |
| 102 | `warns_issued` | 2 | **Pendiente** | Commands/Administration/moderation.js; falta tracker por advertencia | Rule Enforcer (10); The Hammer (100) |
| 103 | `weekend_messages` | 2 | **Conectada** | Functions/achievementMessageMetrics.js · sábado y domingo según America/Santo_Domingo | Weekend Warrior (500); Weekend Legend (5000) |
| 104 | `words_typed` | 3 | **Conectada** | Functions/achievementMessageMetrics.js + Events/Levels/messageCreate2.js · palabras separadas por espacios | Word Novice (1000); Author (50000) |
| 105 | `work_streak` | 2 | **Pendiente** | Commands/Economy/economy.js · runWork (el modelo no conserva racha histórica) | Workaholic (25); Never Off the Clock (100) |
| 106 | `xp` | 4 | **Parcial** | Events/Levels/messageCreate2.js + Events/Levels/voiceXp.js + Functions/achievementTracker.js · suma XP de texto, voz y recompensas de logros; falta auditar otras posibles fuentes de XP | XP Collector (10000); XP Hoarder (100000) |

## Diferencias entre el catálogo y el tracker heredado

El motor heredado todavía registra métricas como `messages`, `levels`, `dailyClaims`, `workClaims`, `coinsEarned` e `itemsPurchased`. Esos nombres no coinciden con las métricas importadas. No se deben tratar como conexiones: hay que mapearlas a semánticas correctas y evitar contar dos veces.

## Riesgos detectados

- Las sesiones de voz, transmisión y cámara se guardan en `PersonalVoiceActivity`; deben validarse en un servidor Discord real, especialmente tras reiniciar el proceso.
- `level` representa el máximo nivel alcanzado; `achievementLevelReported` evita reportar de nuevo el mismo nivel incluso tras prestigio. `xp` en Level sigue siendo saldo de progreso actual; la métrica acumulada suma las fuentes principales conocidas, pero requiere auditar otras posibles fuentes.
- `coins`, `bank_balance`, `net_worth` son métricas de saldo: requieren evaluación de estado, no sumar el saldo en cada transacción.
- `total_earned` y `total_spent` requieren historial transaccional; no deben inferirse del saldo actual.
- `daily_streak` de actividad y `economy_daily_streak` son conceptos diferentes.
- `games_played`/`games_won`/`games_streak` tienen fuente de datos en CasinoStats; no deben confundirse con los minijuegos de `Commands/Fun/minijuegos.js`.
- Las métricas de clanes, negocios, propiedades, inversiones, pesca y minería no tienen modelos correspondientes en el árbol de modelos revisado; deben declararse no aplicables o implementar primero esos sistemas, nunca simular progreso.

## Orden recomendado de implementación

1. **Mensajes y actividad:** ya conectados palabras, caracteres, imágenes, GIF, links, stickers, adjuntos, respuestas, menciones, spoilers y bloques de código; las cuatro métricas restantes ya están conectadas: mensajes de 500+ caracteres, madrugada (00:00–05:59), temprano (06:00–08:59) y fines de semana, todo en America/Santo_Domingo. Días activos, racha y creación de hilos también conectados.
2. **Voz:** joins conectados; minutos de voz, transmisión y cámara ya tienen sesiones persistentes y quedan parciales hasta validación en Discord real.
3. **Economía y niveles:** `level` y `prestige_level` conectados; XP parcialmente conectado desde texto, voz y recompensas de logros; pendientes otras fuentes y saldos/transacciones.
4. **Comunidad:** invitaciones, registro y celebraciones de cumpleaños, y boosts conectados; pendientes meses de boost, auto-roles, tickets y moderación.
5. **Juegos y eventos:** casino, minijuegos y sorteos con registros individuales.
6. **Temporadas y meta-logros:** primer desbloqueo, podios, victorias y premios semanales/mensuales.
7. **No aplicables:** clanes, negocios, propiedades, inversiones, pesca/minería, solicitudes y otras funciones que no existan en Bryvex; confirmar con el producto antes de eliminar del catálogo.

## Reglas de horario y mensajes largos

- Zona horaria fija para las métricas de actividad: `America/Santo_Domingo`.
- `night_owl_messages`: de 00:00 a 05:59, hora local.
- `early_bird_messages`: de 06:00 a 08:59, hora local.
- `weekend_messages`: sábado y domingo, según fecha local.
- `long_messages`: un mensaje con al menos 500 caracteres Unicode. El umbral queda centralizado en `LONG_MESSAGE_MIN_CHARACTERS`.

## Criterio de cierre

Una métrica solo pasará a **Conectada** cuando: (a) se actualice en el punto de éxito correcto; (b) sobreviva reinicios si es acumulativa; (c) no se duplique en reintentos/eventos parciales; (d) respete comparadores, niveles, prerrequisitos y recompensas; y (e) tenga prueba automatizada.
