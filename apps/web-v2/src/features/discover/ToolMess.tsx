/**
 * QUOI     — « Tout ce que tu éparpillais tient ici. » : les outils en vrac, une flèche, le logo.
 * POURQUOI — maquette du 26/11/2026 : l'image raconte la phrase. Les outils se posent un à un à
 *            l'arrivée, puis plus rien ne bouge.
 */
const TOOLS = [
  ['excel', 'Excel'],
  ['sheets', 'Google Sheets'],
  ['agenda', 'Agenda'],
  ['postit', 'Post-it'],
  ['whatsapp', 'WhatsApp'],
  ['messenger', 'Messenger'],
  ['gmail', 'Gmail'],
] as const

export function ToolMess() {
  return (
    <div className="discover-mess">
      <p className="discover-mess__title">Tout ce que tu éparpillais tient ici.</p>
      <div className="discover-mess__scene">
        <ul className="discover-mess__pile">
          {TOOLS.map(([file, name]) => (
            <li key={file} className="discover-mess__tool">
              <img src={`${import.meta.env.BASE_URL}landing/${file}.svg`} alt={name} />
            </li>
          ))}
        </ul>
        <svg className="discover-mess__arrow" viewBox="0 0 56 30" aria-hidden>
          <path d="M3 20C16 6 34 6 50 16" />
          <path d="M42 17l9 0-3-9" />
        </svg>
        <span className="discover-mess__home">
          <img src={`${import.meta.env.BASE_URL}icon.png`} alt="Fellowship" />
        </span>
      </div>
    </div>
  )
}
