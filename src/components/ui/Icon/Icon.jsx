/**
 * <Icon /> — jeu d'icônes SVG inline (trait 1.8px, grille 24×24).
 * Aucune dépendance externe : le trait hérite de `currentColor`.
 *
 * @example <Icon name="calendar" size={20} />
 */

// Chaque entrée contient le contenu SVG (paths) de l'icône.
const PATHS = {
  // --- Interface -----------------------------------------------------------
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-up': <path d="M12 19V5M6 11l6-6 6 6" />,
  'arrow-up-right': <path d="M7 17L17 7M8 7h9v9" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />,
  minus: <path d="M5 12h14" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  upload: <path d="M12 16V5M7 10l5-5 5 5M5 20h14" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M20.5 16l-5-5-8.5 8.5" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.2" />
      <path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V3.5h10V8M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 5 8h14a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 19 17h-2" />
      <rect x="7" y="13.5" width="10" height="7" rx="1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.8 4.2-5.5 7.5-5.5s6.3 1.7 7.5 5.5" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.2L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4.5M12 17.2v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8v.1" />
    </>
  ),
  smartphone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </>
  ),
  phone: (
    <path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />
  ),
  link: <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />,

  // --- Thématiques -----------------------------------------------------------
  shield: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5s-1.2 5.9-3.7 8.5c-2.5-2.6-3.7-5.4-3.7-8.5S9.5 6.1 12 3.5z" />
    </>
  ),
  building: (
    <>
      <path d="M3 20.5h18M5 20.5V9l7-5 7 5v11.5" />
      <path d="M9 20.5v-6h6v6M9 10.5h.01M15 10.5h.01" />
    </>
  ),
  health: (
    <>
      <path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z" />
      <path d="M8 12h2.2l1.2-2 1.8 4 1.2-2H16" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" />
      <path d="M5 19c3-4 6-7 10-9" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="5.5" ry="2.5" />
      <path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5M3.5 11v4c0 1.4 2.5 2.5 5.5 2.5" />
      <ellipse cx="15" cy="13" rx="5.5" ry="2.5" />
      <path d="M9.5 13v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" />
    </>
  ),
  language: (
    <>
      <path d="M4 5h9M8.5 3v2M6 5c.6 3 2.6 5.6 5.5 7M11 5c-.8 3.6-3.3 6.4-7 8" />
      <path d="M12 21l4.5-10L21 21M13.6 17.5h5.8" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  woman: (
    <>
      <circle cx="12" cy="8" r="4.5" />
      <path d="M12 12.5V21M8.5 17.5h7" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 15l-3-3c1.5-5 4.5-8 10-9-1 5.5-4 8.5-9 10z" />
      <path d="M9 12l-4-.5L7.5 8H11M12 15l.5 4 3.5-2.5V13M5.5 18.5c.5-1.5 1.5-2.5 3-2.5" />
    </>
  ),
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4h3l8 4.5V5.5L7 10z" />
      <path d="M7 14l1.5 5.5h2.5M18.5 9.5a3.5 3.5 0 0 1 0 5" />
    </>
  ),
  play: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10 9v6l5-3z" />
    </>
  ),
  handshake: (
    <path d="M3 12l3.5-4.5 4 1.5 3-2 4 1.5L21 12M3 12l6 6 1.5-1.5M21 12l-6 6-1.5-1.5M10.5 16.5l-2-2M13.5 16.5l-3-3M16 14l-3.5-3.5-2.5 1.5" />
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3M8 21h8M9 17h6v4H9z" />
    </>
  ),
  vote: (
    <>
      <path d="M4 20.5h16M6 16.5h12v4H6z" />
      <path d="M9 11.5l2 2 4.5-4.5M8 16.5V5h8v11.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 8.5V6a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 6v2.5a3 3 0 0 0 0 7V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-2.5a3 3 0 0 0 0-7z" />
      <path d="M14 5v2M14 11v2M14 17v2" />
    </>
  ),

  // --- Réseaux sociaux (tracés simplifiés) -------------------------------------
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7.5 10.5v6M7.5 7.5v.01M11.5 16.5v-6M11.5 13a2.5 2.5 0 0 1 5 0v3.5" />
    </>
  ),
  facebook: <path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.5L17 11h-3V9a.5.5 0 0 1 .5-.5z" />,
  x: <path d="M4 4l16 16M20 4L4 20" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17 7v.01" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" />
    </>
  ),
  tiktok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.5 2.5 4.5 5 4.5" />,
}

export default function Icon({ name, size = 22, strokeWidth = 1.8, className = '', title }) {
  const content = PATHS[name]
  if (!content) {
    if (import.meta.env.DEV) console.warn(`[Icon] icône inconnue : « ${name} »`)
    return null
  }

  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {content}
    </svg>
  )
}
