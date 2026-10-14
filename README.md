<div align="center">

# 🔥 Bryant's Oficial

### Tu comunidad de Discord, con más herramientas y todo bajo control.

Un bot multifunción para **cuidar, organizar y darle vida** a tu servidor: moderación, comunidad, voz, niveles, economía, minijuegos y una dashboard web privada.

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Commands](https://img.shields.io/badge/Commands-Slash-8A2BE2)](#-comandos-principales)

<br>

**Una sola familia de herramientas. Dos formas de configurarla: con comandos o desde la web.**

</div>

---

## ✨ ¿Qué puedes hacer con Bryant's Oficial?

### 🛡️ Moderación y protección

Mantén el servidor ordenado con herramientas para moderar y automatizar tareas:

- Banear, expulsar, advertir y silenciar miembros; también retirar sanciones.
- Limpiar mensajes, con filtros por usuario y por tipo de contenido.
- Configurar protecciones contra enlaces, invitaciones, spam, menciones excesivas y palabras marcadas.
- Aplicar medidas contra estafas y controlar los canales permitidos para contenido multimedia.
- Centralizar registros y reportes del servidor.
- Programar la limpieza automática de un canal.

### 👋 Comunidad y bienvenida

Haz que participar sea fácil y que cada miembro encuentre su espacio:

- Mensajes personalizados de bienvenida, despedida y Boosts.
- Autoroles distintos para miembros y bots.
- Confesiones públicas o privadas, sugerencias y encuestas con duración y opciones.
- Registro de cumpleaños, avisos, lista de próximos cumpleaños y previsualización del mensaje.
- Información pública del servidor, sus miembros y el propio bot.

### 🎙️ Voz y herramientas del servidor

- **TempVoice:** crea salas de voz temporales desde canales creadores y publícalas en paneles interactivos.
- **Conexión persistente:** conecta el bot a un canal de voz y conserva la selección tras reinicios. Los cambios hechos desde la dashboard se aplican automáticamente.
- **Estadísticas del servidor:** canales con el total de miembros y una invitación personalizada.
- **Actividad de voz:** participa en el sistema de XP configurado para el servidor.

### 📈 Niveles, XP y prestigios

- XP por mensajes y actividad de voz con límites y tiempos configurables.
- Perfil, clasificación y avisos de subida de nivel.
- Recompensas de rol por nivel y sistema de prestigio con roles y recompensas.
- Misiones configurables para proponer objetivos a la comunidad.

### 💰 Economía y recompensas

- Saldo, recompensa diaria, trabajos, transferencias y robos.
- Cartera y banco global del servidor, depósitos, retiros, donaciones y préstamos.
- Tienda de roles y bonificaciones bancarias para miembros que apoyan el banco.
- Recompensas semanales automáticas y administración para el equipo.
- Juegos de azar con monedas: blackjack, ruleta, slots, dados y coinflip.

### 🎮 Diversión para compartir

- Minijuegos individuales y multijugador.
- Comandos de actividad con utilidades, traducción y contenido para el chat.
- Comandos de información, embeds personalizados, reportes y sugerencias.

---

## 🖥️ Dashboard web

Configura los sistemas de tu servidor desde una interfaz visual, además de hacerlo con `/setup` en Discord.

| Comunidad | Moderación | Servidor | Economía y XP |
|:--|:--|:--|:--|
| Autoroles | Logs | Estadísticas | Niveles y XP |
| Bienvenidas y salidas | Reportes | Conexión de voz | Economía |
| Cumpleaños y Boosts | AntiLinks | TempVoice | Prestigios |
| Confesiones, sugerencias y encuestas | AntiScam | Limpieza automática | Recompensa semanal |
| Cumpleaños de miembros | AntiMultimedia |  | Recompensas de nivel |
|  |  |  | Misiones y tienda de roles |
|  |  |  | Bonificaciones bancarias |

Inicia sesión con Discord, elige un servidor que administres y donde esté instalado el bot, y guarda los ajustes de cada sistema. La dashboard protege la sesión y mantiene sus secretos en la configuración privada del servicio web.

> La dashboard se ejecuta como un servicio web independiente del bot. Su guía de configuración y variables está en [`dashboard/README.md`](dashboard/README.md).

---

## 💬 Comandos principales

Todos los comandos se usan como **slash commands** de Discord. Estos son los grupos más destacados:

| Comando | Para qué sirve |
|:--|:--|
| `/setup` | Configurar bienvenidas, salidas, Boosts, autoroles, reportes, logs, encuestas, estadísticas, TempVoice y conexión de voz. |
| `/moderation` | Moderación del servidor y configuración de AntiLinks, AntiScam y filtros multimedia. |
| `/automod` | Ajustar filtros de palabras, spam, menciones, enlaces e invitaciones. |
| `/economy` | Consultar y gestionar saldo, trabajos, banco, transferencias, préstamos y más. |
| `/level` | Ver perfil y clasificación, y administrar XP y avisos de nivel. |
| `/prestige` · `/quest` · `/shop` | Prestigios, misiones y tienda de roles. |
| `/weeklydrop` · `/bank` | Recompensas semanales y gestión del banco del servidor. |
| `/games-singleplayer` · `/games-multiplayer` | Abrir juegos para jugar solo o con otras personas. |
| `/casino` · `/activity` | Juegos de azar y comandos recreativos. |
| `/birthday` · `/poll` | Cumpleaños y encuestas. |
| `/public` | Información del bot y servidor, confesiones, embeds, sugerencias y otros comandos públicos. |

> Las opciones disponibles dependen de los permisos de Discord y de la configuración de cada servidor. Los comandos administrativos requieren los permisos correspondientes.

---

## 🚀 Ejecutar el bot

### Requisitos

- Node.js **22.12 o superior**.
- Una aplicación y un bot creados en [Discord Developer Portal](https://discord.com/developers/applications).
- Una base de datos MongoDB.

### Instalación local

```bash
git clone https://github.com/dxxrkgxntel/bryants-oficial.git
cd bryants-oficial
npm install
```

Configura `config.json` con el token del bot y la URL de MongoDB. También puedes definir `DISCORD_TOKEN` en el entorno para el token. **No publiques ni compartas tokens, contraseñas o cadenas de conexión.**

Inicia el bot:

```bash
npm start
```

Al arrancar, el bot registra los comandos de aplicación disponibles para su cuenta.

### Ejecutar la dashboard

La dashboard requiere sus variables privadas de OAuth, sesión, MongoDB y token del bot. Consulta la [guía de despliegue de la dashboard](dashboard/README.md) y arráncala con:

```bash
npm run start:dashboard
```

---

## 🧩 Cómo está organizado

```text
Commands/     Comandos slash, agrupados por función
Events/       Eventos de Discord
Handlers/     Carga de comandos, eventos, voz y sistemas programados
Interactions/ Botones, menús y modales
Functions/    Funciones compartidas
Models/       Modelos y configuraciones de MongoDB
Utils/        Utilidades y lógica auxiliar
dashboard/    Aplicación web y su documentación de despliegue
Assets/       Recursos visuales del bot
index.js      Entrada principal del bot
```

---

<div align="center">

### Hecho para que Bryant's Family tenga todo en un mismo lugar. 💜

**Moderación · Comunidad · Voz · Juegos · Economía · Dashboard**

</div>
