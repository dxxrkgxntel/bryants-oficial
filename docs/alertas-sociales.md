# Alertas sociales

La web permite configurar alertas sociales por servidor. El bot comprueba las plataformas cada minuto y publica un mensaje Components V2 al detectar un directo.

La sección **Alertas sociales** de la dashboard también muestra un diagnóstico por alerta: estado del canal, última consulta, últimos datos recibidos y errores recientes. Cuando falla, indica si ocurrió al consultar la plataforma, publicar en Discord o guardar el estado y muestra un paso sugerido. Los datos se actualizan aproximadamente cada minuto mientras la sección permanece abierta. El botón **Actualizar** vuelve a cargar el último diagnóstico guardado; no inicia una consulta adicional al canal.

## Configuración de Kick

Registra una aplicación en el portal de desarrolladores de Kick y añade estas variables al entorno del proceso del bot:

- `KICK_CLIENT_ID`
- `KICK_CLIENT_SECRET`

El bot utiliza el flujo OAuth de credenciales de cliente para consultar datos públicos de directos. No pongas el secreto en el repositorio ni en el entorno del dashboard web.

En la categoría **Alertas sociales**, selecciona la plataforma y añade el canal, el canal de Discord y el mensaje. Variables disponibles: `{{channel}}`, `{{title}}`, `{{viewers}}`, `{{category}}` y `{{url}}`. La cantidad de espectadores se actualiza cada cinco minutos si se activa la opción. Si la plataforma no devuelve la cifra o la categoría, la alerta muestra `No disponible`; un contador `0` representa cero espectadores reales.

## Configuración de YouTube

Activa **YouTube Data API v3** en un proyecto de Google Cloud y crea una clave de API. Restringe la clave a YouTube Data API v3 y añádela como `YOUTUBE_API_KEY` al entorno del proceso del bot (no al dashboard web). En la categoría **Alertas sociales**, selecciona YouTube y escribe el @handle del canal, por ejemplo `@canal`, o su URL `https://www.youtube.com/@canal`.

La comprobación usa `activities.list` y `videos.list` para consultar las actividades y el estado de directo. Así evita `search.list`, que tiene un límite independiente de 100 consultas diarias. Con la comprobación cada minuto, YouTube consume aproximadamente 2.880 unidades diarias por canal; la cuota estándar es de 10.000 unidades al día para estos métodos. Si sigues varios canales, revisa el uso en Google Cloud Console.

## Configuración de Twitch

Añade `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` al entorno del bot.

## Configuración de TikTok

TikTok se consulta mediante un endpoint web público no oficial, que puede cambiar o limitar las consultas.

El nombre y el avatar personalizados se publican mediante un webhook. Para usarlos, el bot necesita el permiso **Administrar webhooks** en el canal de destino. Sin esos campos, el bot publica con su identidad normal.

## Plataformas

Las plataformas disponibles en la web son Kick, TikTok, Twitch y YouTube. Instagram, Reddit y X todavía no están implementadas.
