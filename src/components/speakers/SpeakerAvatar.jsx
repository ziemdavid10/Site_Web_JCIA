import PersonAvatar from '@/components/ui/PersonAvatar/PersonAvatar'

/**
 * <SpeakerAvatar /> — portrait d'un intervenant : sa photo, ou l'avatar dessiné
 * par <PersonAvatar /> (dégradé, motif Ndop et initiales) quand il n'y en a pas.
 *
 * @param {object} speaker   { name, photo }
 * @param {'orange'|'teal'|'rust'|'purple'} color  Couleur de la catégorie
 */
export default function SpeakerAvatar({ speaker, color = 'orange', className = '' }) {
  return (
    <PersonAvatar name={speaker.name} photo={speaker.photo} color={color} className={`speaker-avatar ${className}`.trim()} />
  )
}
