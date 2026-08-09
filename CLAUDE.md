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
8. **Las gaviotas vuelan raspando el piso y nunca cruzan un pozo.** Si planearan
   alto se cruzarían con la cabeza de Cami en el pico del salto, y si entraran
   al pozo te las comerías en el aire durante un salto obligado. Su altura va
   suavizada (`e.y += (objetivo - e.y) * 0.12`) para que no pegue un salto de
   16 px al cruzar un escalón.
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

## Números del balance

| Qué | Valor | Por qué |
|---|---|---|
| Velocidad a pie | 2.1 px/frame | ~126 px/s |
| Velocidad en moto | 3.1 px/frame | no se puede frenar |
| Salto | v=7.8, g=0.38 | 80 px de alto, ~86 px de alcance (120 en moto) |
| Vitalidad | 100 en 52 s | obliga a comer, como el original |
| Vidas | 3 + 1 cada 20.000 puntos | |

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
