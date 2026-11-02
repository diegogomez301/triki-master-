# 🎮 Triki Master (PWA - Aplicación Web Instalable)

Un aplicativo web interactivo y moderno para jugar **Triki** (Tres en raya), optimizado como **Progressive Web App (PWA)** para instalarse como una aplicación nativa en cualquier celular (Android o iPhone/iPad) y jugarse incluso sin conexión a internet.

---

## 📱 ¿Qué hace que sea instalable (PWA)?

1. **`manifest.json`**: Define el nombre ("Triki Master"), icono en la pantalla de inicio, color del tema (`#1a1635`) y modo `standalone` (pantalla completa sin barras de navegador ni distracciones).
2. **`sw.js` (Service Worker)**: Guarda automáticamente el juego en la memoria caché del teléfono. ¡Puedes jugar en modo avión o sin datos móviles!
3. **Iconos Adaptativos (`icons/`)**:
   - Iconos de alta resolución (192x192 y 512x512).
   - Icono `maskable` para adaptarse a cualquier forma de icono en Android (cuadrado, círculo, squircle).
   - `apple-touch-icon.png` para pantallas retina de iPhone y iPad.
   - Vectorial `icon.svg`.
4. **Botón inteligente de instalación**: Detecta automáticamente si tu dispositivo soporta instalación directa o guía al usuario en iOS.

---

## 🚀 Cómo publicarlo e instalarlo en tu celular (Paso a Paso)

Para que un celular permita instalar una aplicación web, los navegadores (Google Chrome o Safari) exigen una conexión segura **HTTPS**. La forma más rápida y 100% gratuita para principiantes (sin usar comandos) es:

### Método Recomendado: Netlify Drop (En 1 minuto)
1. Entra en tu computadora a: **[app.netlify.com/drop](https://app.netlify.com/drop)** (crea una cuenta gratis si te lo solicita).
2. Arrastra la carpeta completa del proyecto (`PROYECTO 1`) hacia el círculo en la página web.
3. En pocos segundos, Netlify te dará un enlace seguro (por ejemplo: `https://triki-master-tu-nombre.netlify.app`).
4. Abre ese enlace desde tu celular:
   - **En Android (Google Chrome):** Pulsa el botón verde **"📲 Instalar"** que verás arriba o en el menú de tres puntos toca *"Instalar aplicación"*.
   - **En iPhone / iPad (Safari):** Toca el botón de Compartir (el cuadro con la flecha arriba) y selecciona *"Agregar a la pantalla de inicio"*.
5. ¡Listo! Verás el icono de **Triki Master** en la pantalla de inicio de tu celular y funcionará como cualquier app descargada de la tienda.

---

## ⌨️ Atajos en Computadora
- `1` a `9`: Seleccionar casilla en el teclado.
- `R`: Reiniciar partida.
- `Z`: Deshacer jugada.
