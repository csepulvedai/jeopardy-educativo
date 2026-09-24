# Jeopardy Educativo

Skill para crear juegos interactivos de Jeopardy orientados a contextos educativos, con sistema de pulsador en tiempo real, tablero por categorías, preguntas graduadas y cierre con podio de ganadores.

## ¿Qué permite crear?

- Tableros con 5 categorías y 5 niveles de dificultad.
- Preguntas basadas en la taxonomía de Bloom.
- Buzzer sincronizado para equipos o estudiantes.
- Temporizador, rebotes, puntajes y efectos audiovisuales.
- Pregunta Final Jeopardy con criterios de evaluación.
- Dos modalidades de uso:
  - **Local / Zoom:** Node.js, Socket.io y túnel de Cloudflare.
  - **Hosting compartido:** versión HTML, CSS y JavaScript para publicar en Hostinger o cPanel.

## Estructura

```text
SKILL.md                         Instrucciones principales para usar la skill
references/                      Guía comercial y modelos de uso
templates/local/                 Plantilla con servidor Node.js y Socket.io
templates/serverless/            Plantilla para hosting web compartido
