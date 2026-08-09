# WonderCami 🏍️🍷

Un arcade de plataformas para el celular, en horizontal.

**Cami** cruza la costa brasilera en moto tirando botellas de vino para rescatar
a **Rosita**, su galga inglesa, de las garras del **Capitán Coco**.

👉 **Jugar: [felipevenancio93.github.io/wondercami](https://felipevenancio93.github.io/wondercami/)**

Desde el celular: entrá al link, tocá el botón ⛶ para pantalla completa, y si
querés que quede como una app usá *Agregar a pantalla de inicio*. Anda offline.

## Cómo se juega

| Control | Qué hace |
|---|---|
| ◀ ▶ | Moverse |
| **SALTAR** | Saltar (cuanto más lo mantenés, más alto) |
| **BOTELLA** | Tirar una botella de vino (hay que conseguirla primero) |

En la compu: flechas para moverse, **Z** o espacio para saltar, **X** para tirar.
**M** silencia.

## Las reglas del arcade del 86

- La **barra de vitalidad baja sola**. Si llega a cero, se acabó. Se recarga
  comiendo la picada que aparece en el camino: queso, salamín, aceituna, maní.
- Un solo golpe y perdés una vida. Hay **checkpoint** a mitad de cada round.
  Al morir perdés la moto y la botella doble, pero volvés con una botella
  simple si tenías arma.
- Los **huevos** del camino esconden ítems:
  - 🏍️ **Moto** — vas más rápido pero no podés frenar. Aguanta un golpe por vos.
  - 🍷 **Botella** — tu arma. La **doble** tira dos de una.
  - ⭐ **Estrella** — invencible ocho segundos.
  - **1UP** — una vida más.
- Cuidado con los cangrejos, las ranas, las gaviotas, los cocos que caen de las
  palmeras, las fogatas, las piedras y los pulpos que salen del agua.
- **Área 1: Costa brasilera.** Cuatro rounds. Al final del cuarto está el
  Capitán Coco, y atrás de él, Rosita.

## Para desarrolladores

```bash
node tools/serve.js 8123   # servidor local, también accesible desde el celu
```

Todo es HTML + JavaScript sin dependencias: los sprites, la música chiptune y
los niveles se generan por código. Ver [`CLAUDE.md`](CLAUDE.md) para la
arquitectura y las reglas del motor.

---

Homenaje a *Wonder Boy* (Sega / Westone, 1986). Arte, música y niveles propios.
