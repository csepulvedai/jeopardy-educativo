---
name: jeopardy-educativo
description: >-
  Crea, personaliza y despliega juegos interactivos de Jeopardy educativo con sistema de pulsador
  (buzzer) en tiempo real para clases presenciales o videoconferencias (Zoom/Meet). Debe preguntar
  siempre al usuario en qué entorno desea ejecutarlo: 1) Local en su computadora (Node.js + Cloudflare Tunnel),
  2) En Hosting Web Compartido (Hostinger/cPanel en public_html sin servidor vía WebRTC) o 3) En la Nube
  permanente (Render/Railway). Genera bancos de preguntas basados en taxonomía de Bloom y empaqueta
  la solución lista para usar o comercializar con instituciones educativas.
---

# Jeopardy Educativo: Generador y Desplegador con Buzzer en Tiempo Real

Esta skill permite crear tableros completos de Jeopardy con sistema de pulsadores sincronizados en milisegundos, efectos de sonido de televisión, rebotes, temporizador y podio olímpico de campeones con lluvia de confeti.

---

## 🧭 Flujo de Trabajo Obligatorio

Cuando el usuario invoque esta skill o solicite crear un juego de Jeopardy, sigue estrictamente estos 4 pasos:

---

### PASO 1: Preguntar el Entorno de Ejecución (Obligatorio)

Antes de escribir código o generar preguntas, debes consultar al usuario en qué entorno planea utilizar el juego:

> **Pregunta al usuario:**
> "¿En qué entorno deseas que preparemos y despleguemos el juego?
> 1. **Modo Local para Laptop / Zoom:** Corre en tu propia computadora con Node.js y genera un túnel de Cloudflare instantáneo y seguro para que tus alumnos jueguen desde sus celulares por Zoom.
> 2. **Modo Hosting Web Compartido (Hostinger / cPanel):** 100% Serverless (HTML/JS puro con WebRTC). Se sube como carpeta a `public_html` en 2 clics, sin necesidad de Node.js ni subdominios.
> 3. **Modo Nube Permanente (Cloud 24/7):** Alojado en Render/Railway con tu propio subdominio (ej: `jeopardy.tudominio.com`)."

---

### PASO 2: Diseño del Banco de Preguntas Curriculares

Solicita al usuario el tema, temario, transcripciones o apuntes de su clase.
Estructura el archivo `preguntas.json` con **5 categorías temáticas x 5 niveles de dificultad (100 a 500 pts)** más la **Pregunta Final (Final Jeopardy)**, siguiendo la **Taxonomía de Bloom**:

* **$100 - $200 (Recuerdo y Comprensión):** Conceptos fundamentales, definiciones, distinciones básicas.
* **$300 - $400 (Aplicación y Análisis):** Casos prácticos, resolución de problemas, comparación crítica.
* **$500 (Evaluación y Síntesis):** Juicio crítico, justificación de decisiones complejas, debate conceptual.
* **Final Jeopardy:** Pregunta integradora de cierre con criterios de evaluación explícitos.

Cada pregunta **debe incluir**:
* `pregunta`: Texto claro y atractivo para proyectar.
* `respuesta`: Respuesta correcta detallada.
* `guia_docente`: Notas y orientaciones pedagógicas para que el profesor conduzca el debate en el aula.

---

### PASO 3: Ensamblado de la Solución

Dependiendo de la elección del Paso 1, utiliza las plantillas incluidas en esta skill:

#### Si eligió Opción 1 (Local / Zoom):
1. Copia los archivos desde `templates/local/`:
   * `server.js` (Express + Socket.io + Cloudflare Tunnel spawn)
   * `package.json`
   * `public/` (`index.html`, `host.js`, `host.css`, `buzzer.html`, `buzzer.js`, `buzzer.css`)
   * `iniciar_juego.bat`
2. Inyecta el `preguntas.json` generado en la raíz del proyecto.
3. Ejecuta `npm install` y prueba el inicio con `node server.js`.

#### Si eligió Opción 2 (Hosting Web / Hostinger `public_html`):
1. Copia los archivos desde `templates/serverless/`:
   * `index.html`, `host.js`, `host.css` (Tablero con PeerJS)
   * `buzzer.html`, `buzzer.js`, `buzzer.css` (Pulsador móvil con PeerJS)
   * `peerjs.min.js`, `qrcode.min.js` (Librerías locales sin dependencias externas)
2. Inyecta el `preguntas.json` en la carpeta.
3. Comprime la carpeta en un archivo `jeopardy_para_hosting.zip`.
4. Entrega al usuario la guía de 3 pasos para subirlo a `public_html/jeopardy` en Hostinger o cPanel.

#### Si eligió Opción 3 (Cloud / Render):
1. Configura el repositorio con `package.json` y `server.js`.
2. Proporciona las instrucciones para crear el Web Service en Render y configurar el registro DNS CNAME en su proveedor de dominio.

---

### PASO 4: Entrega y Protocolo de Juego

Entrega al docente la guía rápida de juego:
* **Cómo conectar a los alumnos:** Código de sala o Código QR generado automáticamente.
* **Atajos de teclado:**
  * `[Espacio]`: Activar Buzzer / Activar Rebote.
  * `[C]`: Marcar como Correcto (+Puntos automáticos y fanfarria).
  * `[X]`: Marcar como Incorrecto (bloquea equipo para el rebote).
  * `[R]`: Ver / Ocultar respuesta correcta y guía docente.
  * `[Esc]`: Cerrar pregunta y volver al tablero.
* **Cierre de la partida:** Botón `👑 Podio y Ganador` para desplegar el podio olímpico (1º, 2º y 3º lugar), lluvia de confeti y trofeos en los móviles de los estudiantes.

---

## 💼 Empaquetamiento y Venta a Instituciones o Docentes

Para asesorar al usuario en la venta o licenciamiento de esta solución, consulta la guía de referencia:
👉 [Guía Comercial y Modelos de Negocio](./references/guia_comercial.md)

* **Venta por Asignatura ("Llave en mano"):** Juego empaquetado con preguntas personalizadas por unidad.
* **Talleres de Capacitación:** Venta de talleres de gamificación donde la herramienta se entrega a los participantes.
* **Licencia Institucional:** Despliegue en servidores del colegio o universidad con identidad visual propia.
