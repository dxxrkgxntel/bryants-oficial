# Alertas sociales

La web permite configurar alertas de Kick por servidor. El bot consulta la API oficial de Kick cada minuto y publica un mensaje Components V2 cuando detecta que empieza un directo.

## Configuración de Kick

Registra una aplicación en el portal de desarrolladores de Kick y añade estas variables al entorno del proceso del bot:

- `KICK_CLIENT_ID`
- `KICK_CLIENT_SECRET`

El bot utiliza el flujo OAuth de credenciales de cliente para consultar datos públicos de directos. No pongas el secreto en el repositorio ni en el entorno del dashboard web.

En **Alertas sociales · Kick**, añade el nombre del canal de Kick, el canal de Discord y el mensaje. Variables disponibles: `{{channel}}`, `{{title}}`, `{{viewers}}`, `{{category}}` y `{{url}}`. La cantidad de espectadores se actualiza cada cinco minutos si se activa la opción.

El nombre y el avatar personalizados se publican mediante un webhook. Para usarlos, el bot necesita el permiso **Administrar webhooks** en el canal de destino. Sin esos campos, el bot publica con su identidad normal.

## Plataformas

La primera integración implementada es Kick. Instagram, Reddit, TikTok, Twitch, X y YouTube requieren flujos y permisos propios de sus APIs; no se muestran como configurables hasta implementar y validar esas conexiones.
