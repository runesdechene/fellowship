/**
 * QUOI     — les paquets des autres admins, en petit : leur photo, leur nombre de cartes, leur
 *            carte du dessus. On y lâche une carte pour la leur donner.
 * POURQUOI — maquette 2432:306 : chacun ne voit que son paquet, mais voit ce que tient l'équipe.
 */
import { Avatar } from '@/components/ui/Avatar'
import type { Admin, Task } from './useAdminBoard'
import { useDropZone } from './useDropZone'

interface TeamDeckProps {
  admin: Admin
  deck: Task[]
  onDropTask: (taskId: string) => void
}

function TeamDeck({ admin, deck, onDropTask }: TeamDeckProps) {
  const drop = useDropZone(onDropTask)
  const top = deck[0]
  return (
    <li
      className={`team-deck${drop.over ? ' team-deck--over' : ''}`}
      aria-label={`Paquet de ${admin.name}`}
      {...drop.handlers}
    >
      <p className="team-deck__who">
        <Avatar className="team-deck__face" src={admin.avatarUrl} name={admin.name} />
        {admin.name}, {deck.length} {deck.length > 1 ? 'cartes' : 'carte'}
      </p>
      <p className="team-deck__top">{top ? top.body : 'Paquet vide'}</p>
    </li>
  )
}

interface TeamDecksProps {
  team: Admin[]
  deckOf: (ownerId: string) => Task[]
  onGive: (taskId: string, ownerId: string) => void
}

export function TeamDecks({ team, deckOf, onGive }: TeamDecksProps) {
  return (
    <section className="board-team" aria-label="Équipe">
      <header className="board-zone__head">
        <h2 className="board-zone__title">Équipe</h2>
      </header>
      <ul className="board-team__decks">
        {team.map((admin) => (
          <TeamDeck
            key={admin.id}
            admin={admin}
            deck={deckOf(admin.id)}
            onDropTask={(taskId) => onGive(taskId, admin.id)}
          />
        ))}
      </ul>
      <p className="board-team__hint">Glisse une carte sur un paquet pour la donner.</p>
    </section>
  )
}
