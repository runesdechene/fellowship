const AVATAR_GRADIENTS: [string, string][] = [
  ['#f0a060', '#e74c3c'], ['#6c5ce7', '#a29bfe'], ['#00b894', '#00cec9'],
  ['#fd79a8', '#e84393'], ['#f39c12', '#d68910'],
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Dégradé d'avatar déterministe à partir d'un nom (135deg, deux couleurs). */
export function avatarGradient(name: string): string {
  const [from, to] = AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}
