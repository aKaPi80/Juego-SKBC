# SKBC Kids AI Sensei

Portal web para GitHub Pages + backend Google Apps Script.

## Paso 1. Apps Script

1. Abre el Google Sheet `SKBC KIDS AI SENSEI`.
2. Ve a `Extensiones > Apps Script`.
3. Crea o reemplaza el archivo principal con el contenido de:
   - `skbc-gipuzkoa/apps_script_kids_ai_sensei.gs`
4. Crea otro archivo `.gs` y pega:
   - `skbc-gipuzkoa/apps_script_kids_ai_sensei_webapp.gs`
5. Guarda.
6. Ejecuta `crearEstructuraHojasKidsAISensei`.
7. Acepta permisos.

## Paso 2. Publicar Web App

1. En Apps Script pulsa `Implementar > Nueva implementacion`.
2. Tipo: `Aplicacion web`.
3. Ejecutar como: `Yo`.
4. Quien tiene acceso: `Cualquier usuario`.
5. Pulsa `Implementar`.
6. Copia la URL que termina en `/exec`.

## Paso 3. Conectar el portal

Edita `github-pages-fixed/kids/config.js`:

```js
window.SKBC_KIDS_CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/XXXXX/exec'
};
```

## Paso 4. Probar

Abre localmente:

```text
github-pages-fixed/kids/index.html
```

O en GitHub Pages:

```text
https://akapi80.github.io/Juego-SKBC/kids/
```

## OpenAI

Por defecto el sistema funciona sin API y genera solo prompt.

Para activar IA automatica:

1. Apps Script > Project Settings > Script properties.
2. Crea `OPENAI_API_KEY`.
3. En la hoja `CONFIG_KIDS_AI`, pon `API_ACTIVA` = `SI`.

No pongas la API key en `config.js` ni en GitHub.
