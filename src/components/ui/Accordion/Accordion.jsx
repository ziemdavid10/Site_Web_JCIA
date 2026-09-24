import { useId, useState } from 'react'
import Icon from '../Icon/Icon'
import { rich } from '@/i18n/rich'
import './Accordion.scss'

/**
 * <AccordionItem /> — une question / réponse repliable, accessible :
 * bouton (aria-expanded) qui contrôle une région (aria-labelledby).
 * L'ouverture est animée en CSS (grid-template-rows 0fr → 1fr), sans hauteur fixe.
 */
export function AccordionItem({ q, a, open, onToggle, headingLevel = 3 }) {
  const uid = useId()
  const Heading = `h${headingLevel}`
  return (
    <li className={`accordion-item ${open ? 'is-open' : ''}`}>
      <Heading>
        <button type="button" aria-expanded={open} aria-controls={`${uid}-panel`} id={`${uid}-btn`} onClick={onToggle}>
          <span>{q}</span>
          <span className="accordion-item__toggle" aria-hidden="true">
            <Icon name="plus" size={20} />
          </span>
        </button>
      </Heading>
      <div className="accordion-item__panel" id={`${uid}-panel`} role="region" aria-labelledby={`${uid}-btn`}>
        <div>
          <p>{rich(a)}</p>
        </div>
      </div>
    </li>
  )
}

/**
 * <Accordion /> — liste de questions / réponses ; un seul élément ouvert à la fois.
 *
 * @param {{q: string, a: string}[]} items
 * @param {number} defaultOpen  Index ouvert au départ (-1 : tout replié)
 */
export default function Accordion({ items, defaultOpen = 0, className = '', headingLevel }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <ul className={`accordion ${className}`.trim()}>
      {items.map((item, i) => (
        <AccordionItem
          key={item.q}
          q={item.q}
          a={item.a}
          headingLevel={headingLevel}
          open={open === i}
          onToggle={() => setOpen(open === i ? -1 : i)}
        />
      ))}
    </ul>
  )
}
