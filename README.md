# 🤖 Bryant's Oficial

Bot avanzado de Discord enfocado en **moderación, entretenimiento y automatización**, diseñado para ofrecer una experiencia completa en servidores mediante múltiples sistemas integrados.

---

## 🚀 Características principales

### 🛡️ Moderación

* Sistema de moderación completo
* Comandos administrativos
* Control de usuarios y roles

### 🎮 Juegos

* Juegos interactivos dentro del servidor
* Sistema de recompensas vinculado a economía

### 🎫 Tickets

* Sistema de tickets configurable
* Soporte organizado por canales privados

### 💰 Economía

* Sistema de dinero virtual
* Tienda integrada
* Interacción con juegos y recompensas

### 📈 Niveles

* Sistema de experiencia (XP)
* Subida de nivel automática
* Recompensas por actividad

### 🕵️ Confesiones

* Sistema anónimo de confesiones
* Canales dedicados

### 💡 Sugerencias

* Sistema de sugerencias para la comunidad
* Reacciones automáticas para votación

### 🛒 Tienda

* Compra de ítems usando la economía del bot
* Integración directa con el sistema de dinero

### 🔢 Conteo

* Sistema de conteo en canal específico
* Control de errores y reinicio automático

### 🎭 Autoroles

* Asignación automática de roles
* Configuración flexible

---

## 🏗️ Estructura del proyecto

```
📦 Bryant's Oficial
 ┣ 📂 Commands        # Comandos principales del bot
 ┣ 📂 Events          # Eventos de Discord
 ┣ 📂 Functions       # Funciones reutilizables
 ┣ 📂 Handlers        # Manejo de comandos/eventos
 ┣ 📂 Interactions    # Slash commands e interacciones
 ┣ 📂 Levels          # Sistema de niveles
 ┣ 📂 Models          # Modelos de base de datos
 ┣ 📂 PCommands       # Comandos personalizados
 ┣ 📂 Utils           # Utilidades generales
 ┣ 📜 config.json     # Configuración del bot
 ┣ 📜 index.js        # Archivo principal
 ┣ 📜 package.json
```

---

## ⚙️ Tecnologías utilizadas

* Node.js v18+
* discord.js
* Sistema modular personalizado
* Base de datos (según configuración en Models)

---

## 📦 Instalación

```bash
git clone https://github.com/dxxrkgxntel/bryants-oficial
cd bryants-oficial
npm install
```

---

## ▶️ Ejecución

```bash
node index.js
```

---

## ⚙️ Configuración

Edita el archivo:

```
config.json
```

Ejemplo:

```json
{
  "token": "TU_TOKEN",
  "prefix": "!",
  "clientId": "TU_CLIENT_ID"
}
```

---

## 🧠 Arquitectura

El bot sigue una arquitectura modular:

* **Commands** → lógica de comandos
* **Events** → eventos de Discord
* **Handlers** → conexión entre módulos
* **Models** → estructura de datos
* **Utils/Functions** → helpers reutilizables

Esto permite escalar fácilmente el proyecto y añadir nuevas funcionalidades sin romper el sistema.

---

## 📌 Estado del proyecto

🟢 En desarrollo activo
Se siguen agregando nuevas funciones y mejoras constantemente.

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas:

1. Haz fork del repositorio
2. Crea una rama (`feature/nueva-funcion`)
3. Haz commit
4. Abre un Pull Request

---

## 👨‍💻 Autor

Desarrollado por **Bryant**

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---

## ⭐ Nota final

Este bot está diseñado para ser una solución **todo-en-uno para servidores de Discord**, combinando administración, entretenimiento y automatización en un solo sistema.
