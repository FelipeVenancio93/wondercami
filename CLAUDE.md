# WonderCami — juego arcade para celular

Homenaje jugable a **Wonder Boy** (Sega/Westone, 1986) con personajes propios.
Cami cruza la costa brasilera en moto tirando botellas de vino para rescatar a
**Rosita**, su galga inglesa, del **Capitán Coco**.

> Todo el arte, la música y los niveles son originales. Se replica la **mecánica**
> del arcade (vitalidad que baja sola, ítems en huevos, vehículo, arma arrojadiza,
> 4 rounds por área con jefe al final), no los assets de Sega.

## Cómo correrlo

```bash
node tools/serve.js 8123      # http://localhost:8123 (y la IP de la red para el celu)
node tools/make_icons.js      # regenera icons/icon-192.png y icon-512.png
```

En `localhost` el service worker **no** se registra (molesta para desarrollar).
Si alguna vez quedó registrado, limpiarlo desde la consola:

```js
(await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister());
(await caches.keys()).forEach(k => caches.delete(k));
```

## Estructura

| Archivo | Qué hace |
|---|---|
| `js/pixel.js` | Paleta y constructor de sprites. Los sprites son arrays de strings, un caracter por color. El ancho lo define la fila más larga; las cortas se rellenan con transparente. |
| `js/font.js` | Fuente bitmap 5×7 (mayúsculas, números, símbolos). Se cachea un atlas teñido por color. |
| `js/sprites.js` | Todo el arte: Cami, Rosita, enemigos, ítems, jefe. |
| `js/audio.js` | Chiptune por WebAudio: secuenciador propio, dos temas, jingles y SFX. Cero archivos. |
| `js/levels.js` | Los 4 rounds del Área 1. El terreno se escribe `"altura*repeticiones"`; `0` es agua. |
| `js/game.js` | Motor: física, entidades, jefe, HUD, estados. |
| `js/main.js` | Escalado del canvas, controles, loop a 60 Hz fijo, PWA. |
| `tools/bot.js` | Autopiloto de prueba (ver abajo). |

## Controles

Un solo build sirve para celular y computadora; el modo se detecta solo.

- **Táctil**: botones en pantalla. Se ocultan (`body.teclado`) apenas se usa una
  tecla, y vuelven apenas se toca la pantalla.
- **Teclado**: flechas mover, **ALT** saltar, **CTRL** correr y tirar.
  Z/espacio y X quedan como alternativas.

> `onKey` hace `preventDefault()` **tanto en keydown como en keyup** para las
> teclas mapeadas. Sin el keyup, ALT abre el menú del navegador (Chrome lo
> activa al soltar); sin el keydown, ALT+← te manda a la página anterior en
> plena partida. No lo saques.

## Reglas del motor que NO hay que romper

Estas invariantes son las que hacen que el juego sea terminable. Se resolvieron
después de encontrar bucles de muerte reales; si tocás niveles, respetalas.

1. **El terreno se suaviza al cargar** (`smoothGround`): entre dos columnas de
   tierra nunca hay un escalón mayor a 1 tile (las lomas se caminan como
   rampas), y **todo pozo tiene 3 columnas llanas antes y 3 después**. Sin eso,
   un salto que arranca bajando una loma te deja en el aire justo cuando llega
   el borde y no podés saltar: muerte que el jugador no controla.
2. **Los pozos de 5 tiles o más reciben muelles automáticos** (`buildEnts`). El
   muelle va de la columna `L+2` a la `L+8` contando desde el último apoyo:
   cubre tanto el saltito corto (~30 px) como el salto largo en moto (~120 px).
   **No pongas plataformas a mano**: las coloca el motor.
3. **Los bichos y obstáculos se reubican** (`placeHazardCol`): necesitan 5
   columnas de tierra libre a cada lado y 4 columnas de separación entre sí. Si
   no hay lugar, el bicho **no se coloca**. Un round con menos enemigos es mejor
   que un amontonamiento imposible.
4. **Los pulpos van en agua sin muelle encima** (`nearestWaterCol`), si no
   emergen dentro de la plataforma donde está parada Cami.
5. **El checkpoint se ajusta a tierra firme.** Si cae sobre agua, Cami reaparece
   y se ahoga en loop.
6. **La cámara se dibuja en píxeles enteros** (`G.cam = Math.round(G.camF)`).
   Con cámara fraccionaria los tiles quedan con costuras por el antialias.
7. **Los enemigos no persiguen.** Los cangrejos patrullan y rebotan, las ranas
   solo se acercan si Cami está a menos de 110 px. Un enemigo que se queda
   siempre debajo del punto de aterrizaje es una muerte injusta.
8. **Las gaviotas vuelan en línea recta y nunca cruzan un pozo.** Al activarse
   fijan su altura (`e.fly`) tomando el suelo que tiene Cami debajo, y de ahí
   en más no la cambian. Antes seguían el terreno de abajo suyo: al bajar de
   una loma se te venían encima en pleno salto, sin nada que pudieras hacer.
   Fueron la causa de 19 de cada 26 muertes hasta que se arregló esto.
9. **Al morir se conserva la botella simple** (se pierden la moto y la doble).
   Sin esto aparece un espiral: morís, quedás sin arma, no podés matar al
   enemigo volador que te mató, y morís de nuevo en el mismo lugar para
   siempre. Fue el bug más caro de encontrar del proyecto.
10. **Los ítems salen despedidos hacia donde va Cami** (`vx = p.vx * 0.85`).
    En moto no se puede frenar, así que un ítem que cae en el lugar queda atrás
    y se pierde sin remedio.
11. **La botella de emergencia del jefe cae encima de Cami**, no en una posición
    al azar de la pantalla. Si aparece lejos y estás esquivando cocos, no la
    agarrás nunca y la pelea se vuelve inganable.
12. **Con la moto puesta, ningún enemigo ni obstáculo mata**: `hurtPlayer` te
    saca la moto y te da 100 frames de invencibilidad. Lo único que mata en
    moto es caer al agua, porque no se puede frenar. Verificado con los seis
    peligros, en el aire y al borde de un pozo.
13. **El buffer de salto solo guarda el toque si venís cayendo** (`p.vy > 0`) o
    ya estás en el piso, y dura 6 frames. Si guardara un toque hecho mientras
    subís, al aterrizar sale un salto fantasma que te manda de cabeza contra
    lo que venga: medido, subía las muertes del Round 3 de 1 a 107.
14. **La botella principal sale casi recta.** Si vuelve a salir en arco alto,
    el arma deja de servir a menos de 150 px, que es justo cuando la necesitás
    contra algo que se te viene encima.
15. **La entrada de cada round tiene zona segura y rampa de ritmo**
    (`zonaSegura` y `rampa` en `js/levels.js`, aplicadas por `sepEn()` y
    `placeHazardCol()`). En el Round 1 los primeros 30 tiles no llevan ningún
    peligro y la separación mínima arranca en 18 columnas y baja a 4 recién en
    la mitad del round. Sin esto el primer cangrejo ya estaba en pantalla en el
    frame 0 y una persona con reflejos normales hacía GAME OVER a los 2 s.
16. **La botella va en el primer huevo del Round 1.** Hay que tener arma antes
    de cruzarse el primer bicho, nunca después.
17. **El hit-stop no puede comerse los toques.** Durante `G.freeze` la
    simulación está detenida, así que el salto y el tiro se guardan en
    `jumpBuf`/`fireBuf`. Sin eso apretás justo al matar algo y la acción no sale
    nunca: medido, le costaba al autopiloto 6 muertes por corrida.

## Números del balance

| Qué | Valor | Por qué |
|---|---|---|
| Velocidad a pie | 2.1 px/frame | ~126 px/s |
| Corriendo (CTRL) | 2.85 px/frame | solo teclado. **Nunca más lento que 2.1**: si el sprint bajara la velocidad base habría que rehacer todos los muelles |
| Cadencia de tiro | 7 frames, hasta 4 botellas (6 con la doble) | se mantiene apretado y sale en ráfaga |
| Botella principal | vx 3.4, vy −1.1 | **casi recta**. Con el arco de antes pasaba por encima de todo lo que estuviera a menos de 150 px |
| Botella de la doble | vx 2.3, vy −4.0 | lobeada, para lo lejano y lo alto |
| Buffer de salto | 6 frames, solo cayendo | ver invariante 13 |
| Moto | 3.1 adelante / 2.6 crucero / **2.1 frenando** | como la patineta del original: no para ni retrocede, pero se puede bajar la velocidad. **El mínimo no puede bajar de 2.1**: por debajo no alcanza para cruzar un pozo de 4 tiles y frenar se volvería una trampa |
| Salto | v=7.8, g=0.38 | 80 px de alto, ~86 px de alcance (120 en moto) |
| Vitalidad | 100 en 52 s | obliga a comer, como el original |
| Vidas | 3 + 1 cada 20.000 puntos | |
| Anclaje de cámara | `ANCLA = 0.32` | Cami al 32% del ancho. Cuanto más chico, más terreno ves por delante. A 0.42 tenías 226 px de aviso (1,8 s); a 0.32 son 265 px |
| Ciclo de muerte | 55 frames + sin READY | 0,9 s desde que morís hasta que jugás. El READY quedó solo para rounds nuevos |
| Hit-stop | 2 frames (4 en el jefe) | ver invariante 17 |

Si cambiás el salto, **recalculá el ancho de los muelles** (punto 2).

## Probar que los rounds se puedan terminar

```js
// en la consola del navegador, con el juego cargado
await new Promise(r=>{const s=document.createElement('script');s.src='tools/bot.js';s.onload=r;document.body.appendChild(s)});
WCBot.run(250000)        // corre el área entera con el autopiloto
Game._round(2)           // saltar directo al Round 3
Game._G                  // estado interno para inspeccionar
window.WC_DEBUG = true   // loguea cada muerte con su causa
```

El autopiloto corre a la derecha, salta pozos y bichos, tira botellas y mantiene
distancia con el jefe. **Debe terminar el área en la mayoría de las corridas.**
Si se traba siempre en la misma columna, es un problema de diseño, no del bot.

### Test del novato — la prueba que importa

```js
WCBot.novato(0)          // Round 1 con un jugador de reflejos normales
```

Modela a una persona: reacciona **200 ms tarde**, salta cuando ve el peligro a
una distancia que varía entre 45 y 105 px, y salta los pozos cerca del borde.

> **Criterio: tiene que terminar el Round 1, muriendo poco o nada.**
> Antes del pase de UX hacía GAME OVER a los 2 segundos, siempre.

El autopiloto normal es un experto y no sirve para medir si el juego es
accesible: pasaba rounds que a una persona la mataban en dos segundos.

También hay una validación geométrica: ningún hueco entre apoyos puede superar
4 tiles y no puede haber paredes de más de 1 tile entre tierra y tierra.

## Deploy

GitHub Pages, repo `wondercami` → `felipevenancio93.github.io/wondercami/`.
Al cambiar archivos, **subir la versión del cache en `sw.js`** (`wondercami-vN`),
si no el celular sigue sirviendo la versión vieja.

## Contenido

- **Área 1 — Costa brasilera**: 4 rounds. R1 playa de día, R2 tarde, R3 marea
  alta (pulpos y muelles), R4 atardecer y arena del Capitán Coco.
- **Vitalidad**: se recarga con picada (queso, salamín, aceituna, maní).
- **Ítems**: moto (escudo de un golpe), botella (arma), botella doble, estrella
  (invencible 8 s), 1UP.
- Para agregar el Área 2: nuevo objeto en `Levels.area1` con su `sky`/`sea`,
  o un array `area2` y un selector de área en `loadRound`.
