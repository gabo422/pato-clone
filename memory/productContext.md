# Product Context — Pato-Clone

## El problema
Gabriel quiere revivir la experiencia de Ace Online en el navegador. Sin memoria persistente, cada sesión con el asistente perdía el contexto y el asistente repetía errores (ej: agrandó la bala cuando Gabriel pidió agrandar el avión).

## Experiencia de usuario
- Gabriel usa `https://gabo422.github.io/pato-clone/`.
- Después de cada push: esperar 1-2 min (GH Pages), luego **Ctrl+F5** (hard refresh) para forzar recarga sin caché.
- Gabriel prueba los **4 gears de a uno** y reporta bugs en lenguaje natural ("cuando disparo los misiles me bajan los fps").

## Qué valora Gabriel
- Que el juego se sienta fiel al AO original (mobs, boss, arte de armas).
- Que el rendimiento sea estable (sin bajones de FPS).
- Cambios concretos y probados; feedback en su idioma y con instrucciones simples (Ctrl+F5).

## Trampa conocida
Cuando Gabriel pide agrandar/algo de un gear (ej. "el CrimsonAttack"), preguntar a QUÉ se refiere exactamente: el **avión (gear)**, la **bala estándar**, o el **misil**. En su última aclaración: "el gear, el misil ya está grande" → agrandar el **avión**.
