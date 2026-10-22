/**
 * QUOI     — la chorégraphie d'une carte faite : elle se soulève, le sceau se pose et la coche
 *            se dessine, des éclats jaillissent, puis elle s'envole en arc vers « Terminé ».
 * POURQUOI — prototype validé par Uriel le 22/10/2026 : finir une tâche doit se sentir. Les
 *            animations du navigateur (Web Animations) suffisent : aucune bibliothèque.
 * ATTENTION — les couleurs et formes des éclats viennent du CSS (.board-bit--*), jamais d'ici.
 *             Avec « réduire les animations », le sceau apparaît et la carte s'efface, sans plus.
 */

const BIT_TONES = 5

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Des éclats qui jaillissent d'un point, montent, puis retombent en tournant. */
export function burst(x: number, y: number, count: number, spread: number) {
  if (reducedMotion()) return
  const layer = document.createElement('div')
  layer.className = 'board-bits'
  document.body.appendChild(layer)
  const flights = Array.from({ length: count }, (_, i) => {
    const bit = document.createElement('span')
    bit.className = `board-bit board-bit--${String((i % BIT_TONES) + 1)}${i % 3 === 0 ? ' board-bit--dot' : ''}`
    layer.appendChild(bit)
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread
    const speed = 110 + Math.random() * 150
    const dx = Math.cos(angle) * speed
    const dy = Math.sin(angle) * speed
    const spin = (Math.random() - 0.5) * 720
    return bit.animate(
      [
        { transform: `translate(${x}px, ${y}px) rotate(0deg) scale(0.4)`, opacity: 1 },
        {
          transform: `translate(${x + dx * 0.7}px, ${y + dy * 0.7}px) rotate(${spin / 2}deg) scale(1)`,
          opacity: 1,
          offset: 0.4,
        },
        {
          transform: `translate(${x + dx}px, ${y + dy + 120}px) rotate(${spin}deg) scale(0.8)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(0.2, 0.6, 0.35, 1)' },
    ).finished
  })
  void Promise.allSettled(flights).then(() => layer.remove())
}

/** Le paquet vidé : trois salves sur toute la largeur. */
export function cheerScreen() {
  ;[0, 260, 520].forEach((delay, i) =>
    setTimeout(() => {
      burst(window.innerWidth * (0.25 + i * 0.25), window.innerHeight * 0.35, 40, Math.PI * 1.6)
    }, delay),
  )
}

/**
 * Joue la victoire sur la carte, jusqu'à ce qu'elle disparaisse dans `target` (la colonne du
 * jour dans « Terminé ») ; `emptied` lance plus d'éclats.
 */
export async function celebrate(card: HTMLElement, target: Element | null, emptied: boolean) {
  const wash = card.querySelector('.deck-card__wash')
  const seal = card.querySelector('.deck-seal')
  const check = card.querySelector('.deck-seal path')
  if (reducedMotion()) {
    seal?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' })
    await card.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 300,
      delay: 350,
      fill: 'forwards',
    }).finished
    return
  }

  // 1. Elle se soulève.
  card.animate([{ transform: 'none' }, { transform: 'translateY(-6px) scale(1.015)' }], {
    duration: 140,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    fill: 'forwards',
  })
  card.classList.add('deck-card--lifted')
  // 2. Le sceau se pose, la coche se dessine, la carte verdit.
  wash?.animate([{ opacity: 0 }, { opacity: 0.55 }], {
    duration: 260,
    delay: 110,
    fill: 'forwards',
  })
  seal?.animate(
    [
      { scale: '0', rotate: '-25deg' },
      { scale: '1.14', rotate: '4deg', offset: 0.7 },
      { scale: '1', rotate: '0deg' },
    ],
    { duration: 340, delay: 110, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
  )
  check?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
    duration: 240,
    delay: 260,
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    fill: 'forwards',
  })
  setTimeout(() => {
    const r = (seal ?? card).getBoundingClientRect()
    burst(
      r.left + r.width / 2,
      r.top + r.height / 2,
      emptied ? 46 : 18,
      emptied ? Math.PI * 1.5 : Math.PI * 0.9,
    )
  }, 230)

  // 3. Elle s'envole en arc vers « Terminé ».
  await wait(620)
  const from = card.getBoundingClientRect()
  const to = target?.getBoundingClientRect()
  const dx = to ? to.left + Math.min(to.width, 200) / 2 - (from.left + from.width / 2) : 0
  const dy = to ? to.top + 40 - (from.top + from.height / 2) : from.height
  await card.animate(
    [
      { transform: 'translateY(-6px) scale(1.015) rotate(0deg)', opacity: 1 },
      {
        transform: `translate(${dx * 0.35}px, ${dy * 0.25 - 50}px) scale(0.75) rotate(-7deg)`,
        opacity: 1,
        offset: 0.4,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(0.3) rotate(-3deg)`, opacity: 0 },
    ],
    { duration: 560, easing: 'cubic-bezier(0.55, 0, 0.45, 1)', fill: 'forwards' },
  ).finished
}

/** « Plus tard » : la carte glisse sous le paquet. */
export async function slideUnder(card: HTMLElement) {
  if (reducedMotion()) return
  await card.animate(
    [{ transform: 'none' }, { transform: 'translateY(30px) scale(0.96)', opacity: 0 }],
    { duration: 200, easing: 'cubic-bezier(0.3, 0, 1, 1)', fill: 'forwards' },
  ).finished
}

/** « Mélanger » : le paquet se secoue. */
export function shake(pile: HTMLElement) {
  if (reducedMotion()) return
  pile.animate(
    [
      { transform: 'none' },
      { transform: 'rotate(-2deg) translateX(-8px)' },
      { transform: 'rotate(2deg) translateX(8px)' },
      { transform: 'none' },
    ],
    { duration: 380, easing: 'ease-in-out' },
  )
}
