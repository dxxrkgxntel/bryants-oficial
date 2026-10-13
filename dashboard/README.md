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

Activa después la dirección web de FadeHost. La app obtiene su URL desde `APP_URL` y construye el callback añadiendo `/auth/callback`. En Discord Developer Portal, registra esa URL exacta como redirect URL OAuth2. Si usas otro dominio, puedes definir `DASHBOARD_REDIRECT_URI` manualmente. La app usa los scopes `identify` y `guilds`.

FadeHost debe proporcionar `PORT`; el servidor escucha en `0.0.0.0`.
