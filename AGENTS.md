# Instrucciones permanentes de Bryvex Bot

Estás trabajando en **Bryvex Bot**, un bot multifunción de Discord con una dashboard web propia.

- Repositorio: `dxxrkgxntel/bryants-oficial`
- Rama principal: `main`
- Nombre oficial: **Bryvex Bot**

Tu responsabilidad es continuar el desarrollo respetando lo que ya está implementado. El código y la configuración actuales del repositorio son la fuente de verdad: el contexto histórico de este archivo y cualquier documentación antigua deben comprobarse contra el estado real antes de usarlos para tomar decisiones.

## Antes de cada intervención

Antes de empezar cada tarea o modificar archivos:

1. Comprueba la rama activa, `git status --short --branch` y el último commit de `main`.
2. Revisa los cambios locales existentes y sus diffs para distinguir el trabajo del usuario del trabajo de la tarea. Consérvalos; no los sobrescribas, reviertas, guardes en stash ni incluyas en cambios ajenos.
3. Comprueba si `main` local está al día respecto a `origin/main`. Si hace falta y hay conexión disponible, actualiza solo la referencia remota con `git fetch`; no hagas pull, rebase, reset ni cambies de rama automáticamente.
4. Inspecciona el código actual que corresponda a la tarea. Contrasta la documentación con la implementación y da prioridad a la implementación vigente cuando difieran.
5. No asumas que el estado del repositorio coincide con la última actualización descrita aquí ni con conversaciones anteriores.

## Espacio de trabajo y entrega

- Trabaja directamente en `C:\Users\Bryant\Desktop\bryants-oficial`, la carpeta de escritorio de Bryvex Bot. No crees otro clon o worktree salvo que el usuario lo pida.
- Al terminar una tarea concreta, revisa el diff y haz el commit y el push de los cambios de esa tarea a la rama en la que trabajaste, normalmente `main`.
- Añade al commit únicamente archivos de la tarea. Conserva fuera los cambios locales que ya existían; no los incluyas en el commit ni en el push.
- Antes de subir, confirma que la rama remota no avanzó. No fuerces el push ni reescribas historia. Si la rama remota diverge y no puedes integrarla sin arriesgar cambios, detente y explica el bloqueo.

## Contexto del proyecto

Bryvex Bot está desarrollado con Node.js, Discord.js v14 y MongoDB. Tiene dos partes que deben seguir funcionando y sincronizadas:

**Bot de Discord**

- Moderación y protección automática.
- Bienvenidas, despedidas y autoroles.
- Confesiones, sugerencias y encuestas.
- Cumpleaños y Boosts.
- Sistemas de voz y TempVoice.
- Niveles, XP y prestigios.
- Economía, banco y recompensas.
- Misiones y tienda de roles.
- Minijuegos y casino.
- Trofeos y logros.
- Anuncios y herramientas administrativas.

**Dashboard web**

- Autenticación mediante Discord y selección de servidores.
- Configuración de módulos y gestión de moderación y comunidad.
- Administración de economía, XP, misiones, prestigios y recompensas.
- Anuncios y otras herramientas integradas con el bot.

## Contexto histórico

La nota de continuidad recibida describe una línea de trabajo sobre trofeos y anuncios: selector de miembros con autocompletado, formatos Embed/Canvas/Components V2, corrección del formato publicado y mejoras visuales de las tarjetas Canvas. Trátalo como contexto histórico, no como prueba de que esas funciones estén presentes ahora: inspecciona el código antes de intervenir.

Las vistas previas adicionales de módulos no son una prioridad. No las añadas salvo que una tarea concreta lo solicite.

## Reglas para modificar el proyecto

1. No reescribas un sistema completo si basta con modificar una parte.
2. No elimines funcionalidades existentes para simplificar el código.
3. No sustituyas implementaciones funcionales sin una justificación técnica real.
4. Modifica únicamente archivos relacionados con la tarea solicitada.
5. No cambies nombres de archivos, carpetas, funciones, eventos, modelos o identificadores sin necesidad justificada.
6. Conserva la compatibilidad de los esquemas MongoDB con los datos existentes.
7. No rompas la comunicación entre Discord y la dashboard.
8. No cambies permisos, roles, autenticación o controles de acceso salvo que la tarea lo requiera.
9. No dupliques comandos, eventos, listeners, rutas ni sistemas.
10. No elimines configuraciones ni datos de servidores.
11. No añadas dependencias si las existentes permiten resolver el problema.
12. No modifiques configuraciones privadas, credenciales, tokens ni variables de entorno salvo que la tarea lo requiera.

## Método de trabajo

**Inspección:** examina la estructura actual y los archivos relacionados; identifica el funcionamiento, dependencias, modelos, eventos, comandos, rutas e integraciones afectados. Revisa el historial reciente cuando ayude a entender el cambio.

**Planificación:** determina qué archivos deben cambiar, qué funcionalidades podrían verse afectadas, qué dependencias existen, cómo conservar compatibilidad y qué verificaciones disponibles son pertinentes.

**Implementación:** haz cambios específicos y controlados, conserva la arquitectura, reutiliza componentes funcionales y evita efectos colaterales.

**Validación:** comprueba sintaxis, importaciones y dependencias, ejecuta las verificaciones pertinentes y revisa el diff de Git. Si el cambio afecta la integración, comprueba las interacciones entre el bot y la dashboard.

## Identidad y diseño

Usa exclusivamente **Bryvex Bot** como nombre comercial; no uses “Bryant's Oficial” para nombrar el bot. Los componentes visuales nuevos deben seguir la estética profesional, moderna y coherente del proyecto. No rediseñes componentes existentes salvo que la tarea lo solicite.

## Protección del proyecto

- No elimines archivos para reemplazarlos por versiones simplificadas.
- No hagas refactorizaciones masivas ni alteres módulos ajenos a la tarea.
- No elimines datos o colecciones de MongoDB.
- No cambies la configuración de producción sin necesidad.
- Comprueba la implementación existente antes de reemplazar cualquier funcionalidad.
- Si detectas un problema ajeno a la tarea, documéntalo sin modificarlo por iniciativa propia.
- Si la tarea requiere cambiar otro módulo, identifica la dependencia y explica por qué es necesario.

## Objetivo

Desarrolla Bryvex Bot a partir de su estado actual sin perder funcionalidades existentes. Cuando recibas una tarea concreta, trabaja sobre ella respetando estas reglas.

**Principio fundamental: mejorar Bryvex Bot sin destruir, duplicar ni alterar innecesariamente lo que ya funciona.**
