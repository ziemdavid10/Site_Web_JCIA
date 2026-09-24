/**
 * Génère un fichier iCalendar (.ics) pour ajouter l'événement à un agenda
 * (Google Agenda, Outlook, Apple Calendrier…).
 */

/** Convertit une date ISO en format iCal UTC : 20270427T070000Z */
const toICalDate = (iso) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/**
 * Construit le contenu .ics et renvoie une URL de téléchargement (data URI).
 * @param {{title:string, start:string, end:string, location:string, description:string, url?:string}} evt
 */
export function buildIcsHref({ title, start, end, location, description, url = '' }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IAC-CAIPI//JCIA 2027//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:jcia-2027-${toICalDate(start)}@jcia.cm`,
    `DTSTAMP:${toICalDate(new Date().toISOString())}`,
    `DTSTART:${toICalDate(start)}`,
    `DTEND:${toICalDate(end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    url && `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`
}

/**
 * Fichier .ics des JCIA 2027, dans la langue courante.
 * @param {object} t  Textes traduits (useI18n().t)
 */
export function buildEventIcsHref(t, { startDate, endDate, siteUrl }) {
  const e = t.event
  return buildIcsHref({
    title: `${e.shortName} — ${e.name}`,
    start: startDate,
    end: endDate,
    location: `${e.venue.name}, ${e.venue.city}, ${e.venue.country}`,
    description: `${e.tagline} : « ${e.theme} »`,
    url: siteUrl,
  })
}
