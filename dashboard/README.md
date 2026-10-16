# Dashboard web

La dashboard se ejecuta como un servicio web separado del bot. En FadeHost, crea una app **Web app or API** desde este repositorio y configura el comando de inicio como `npm run start:dashboard`.

## Variables privadas de FadeHost

Configura estas variables en el servicio web; no las añadas a Git ni las compartas en mensajes:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | La misma conexión privada de MongoDB que usa el bot |
| `DASHBOARD_SESSION_SECRET` | Una cadena aleatoria larga y exclusiva para las sesiones web |
| `DISCORD_CLIENT_ID` | Application ID de la aplicación Discord del bot |
| `DISCORD_CLIENT_SECRET` | Client Secret de esa aplicación Discord |
| `DISCORD_BOT_TOKEN` | Token privado del bot |
| `TOPGG_WEBHOOK_SECRET` | Secreto del webhook de votos de Top.gg (no el token de API) |
| `TOPGG_REWARD_GUILD_ID` | ID del servidor donde se acreditan las monedas por votar |

Activa después la dirección web de FadeHost. La app obtiene su URL desde `APP_URL` y construye el callback añadiendo `/auth/callback`. En Discord Developer Portal, registra esa URL exacta como redirect URL OAuth2. Si usas otro dominio, puedes definir `DASHBOARD_REDIRECT_URI` manualmente. La app usa los scopes `identify` y `guilds`.

Para activar los referidos, registra también `https://tu-dominio/referral/callback` como redirect URL OAuth2 en Discord Developer Portal. Si tu dominio es distinto de `APP_URL`, define `REFERRAL_REDIRECT_URI` con la URL registrada. El flujo avanzado de instalación verifica al usuario y el servidor donde se añadió el bot; solo cuenta una instalación nueva y cada usuario puede generar una recompensa una vez. La recompensa inicial es de 1.000 monedas en el servidor recién configurado.

Para los votos, configura en Top.gg el webhook `https://tu-dominio/integrations/topgg/vote` y su secreto de webhook en `TOPGG_WEBHOOK_SECRET`. La recompensa inicial es de 250 monedas por voto, acreditadas en `TOPGG_REWARD_GUILD_ID`. El servicio acepta la firma HMAC actual de Top.gg y el encabezado Authorization heredado. Los votos de prueba no se recompensan y se aplica una espera de 12 horas por usuario. MongoDB debe permitir transacciones para que el crédito y el registro del evento sean atómicos.

FadeHost debe proporcionar `PORT`; el servidor escucha en `0.0.0.0`.

Los ajustes de perfil, idioma, referidos y votos se sirven desde este servicio web y comparten MongoDB con el bot; no necesitan un cambio de código ni redeploy del proceso del bot. Sí debes desplegar la web actualizada y completar la configuración de OAuth2 y Top.gg indicada arriba para que se acrediten las recompensas.


## Centro de soporte compartido

El centro de soporte está disponible en `/support` y requiere iniciar sesión con Discord. Los tickets y sus mensajes se almacenan en la misma base de datos MongoDB que utiliza el bot. Los usuarios solo pueden consultar sus propios tickets; los miembros del equipo que figuren en `SUPPORT_STAFF_DISCORD_IDS` pueden consultar y responder a todos los tickets desde la web.

Configura también estas variables privadas en **ambos servicios** (bot y dashboard) para habilitar la sincronización con canales privados de Discord:

| Variable | Valor |
| --- | --- |
| `SUPPORT_GUILD_ID` | ID del servidor de Discord donde se atenderán tickets creados desde la web |
| `SUPPORT_CATEGORY_ID` | ID opcional de la categoría para los canales privados |
| `SUPPORT_STAFF_ROLE_ID` | ID opcional del rol de soporte en Discord |
| `SUPPORT_STAFF_DISCORD_IDS` | IDs de usuarios del equipo autorizados en la web, separados por comas |

En Discord, publica el panel con `/setup support-tickets channel:#canal`. El bot necesita permisos para administrar canales, ver canales, enviar mensajes y leer el historial. El usuario que abre un ticket en Discord o en la web dispone de un canal privado; los mensajes humanos enviados en ese canal se guardan en MongoDB y se muestran en la conversación web. Las respuestas enviadas desde la web se publican en el canal asociado cuando existe.

Si `SUPPORT_GUILD_ID` no está definido, los tickets creados desde la web se guardan en MongoDB, pero no se podrá crear su canal espejo en Discord; por tanto, configura esta variable para tener sincronización completa.
