# Servicio de audio Lavalink para Bryvex Bot

Este servicio Java obtiene el flujo de audio de YouTube mediante el plugin oficial `youtube-source`. El bot conserva su reproductor de Discord y FFmpeg; Lavalink funciona como proveedor HTTP de audio, por lo que no reemplaza el sistema de conexiones de voz persistentes.

## Requisitos

- Java 17 o superior.
- Lavalink v4.2.2 (JAR oficial).
- Un servicio/servidor adicional en FadeHost, con un puerto TCP accesible desde el proceso Node.js del bot.

## Archivos

- `application.yml`: configuración de Lavalink y del plugin YouTube.
- Plugin fijado en `dev.lavalink.youtube:youtube-plugin:1.18.2`.

## Configuración del servicio Java en FadeHost

1. Crea el segundo servicio como aplicación Java.
2. Coloca el JAR oficial de Lavalink v4.2.2 en el directorio de trabajo del servicio.
3. Copia este `application.yml` al mismo directorio desde el que se inicia Lavalink.
4. Configura la variable de entorno `LAVALINK_PASSWORD` con una contraseña larga y privada.
5. Configura `SERVER_PORT` con el puerto asignado por FadeHost (si FadeHost asigna uno automáticamente, utiliza ese valor).
6. Usa como comando de inicio `java -jar Lavalink.jar` (ajusta el nombre si el archivo JAR tiene otro nombre).
7. Mantén el servicio protegido: no compartas la contraseña ni dejes el endpoint abierto sin autenticación.

Lavalink requiere Java 17 o superior. La documentación oficial y las versiones están en https://github.com/lavalink-devs/Lavalink.

## Variables del servicio Node.js (Bryvex Bot)

Añade estas variables en el apartado de variables de entorno del servicio del bot:

| Variable | Valor |
| --- | --- |
| `LAVALINK_HTTP_URL` | URL HTTP interna o pública del servicio Lavalink, incluyendo el puerto, sin barra final. Ejemplo: `http://HOST:2333` |
| `LAVALINK_PASSWORD` | Exactamente la misma contraseña configurada en el servicio Java. |

No añadas estas credenciales a archivos del repositorio ni a `config.json`.

## YouTube y verificaciones

El plugin usa varios clientes de YouTube y prueba alternativas para cargar el flujo. YouTube puede seguir exigiendo OAuth o un PO Token para determinados vídeos, IPs o sesiones. El plugin documenta ambos mecanismos; no se deben publicar tokens ni utilizar una cuenta personal principal para pruebas OAuth. Si los registros del servicio Java muestran que YouTube sigue rechazando una pista, habrá que completar uno de esos mecanismos antes de considerar la reproducción validada.

## Comprobación

Cuando ambos servicios estén iniciados:

- El servicio Java debe indicar que Lavalink arrancó y cargó `youtube-plugin`.
- El bot debe tener `LAVALINK_HTTP_URL` y `LAVALINK_PASSWORD`.
- Prueba una canción de YouTube en Discord y revisa los registros de ambos servicios.

El endpoint utilizado por el bot es `GET /youtube/stream/{videoId}`; requiere el encabezado `Authorization` con la contraseña de Lavalink.
