import { useRef, useState } from "react";
import {
  Button,
  Icon,
  MoreLink,
  PatternBg,
  Reveal,
  SectionHeader,
} from "@/components/ui";
import { useI18n } from "@/i18n/context";
import { CONFIG } from "@/data/config";
import { buildEventIcsHref } from "@/utils/calendar";
import "./Programme.scss";

/**
 * <Programme /> — programme détaillé sur deux journées (onglets accessibles)
 * et présentation des quatre masterclasses.
 *
 * @param {boolean} showMasterclasses  Faux sur la page Programme, qui détaille les masterclasses à part
 */
export default function Programme({ showMasterclasses = true }) {
  const { t } = useI18n();
  const p = t.programme;
  const days = p.days;
  const [active, setActive] = useState(0);
  const tabsRef = useRef([]);
  const day = days[active];

  // Fichier .ics « Ajouter à mon agenda », dans la langue courante
  const icsHref = buildEventIcsHref(t, CONFIG);

  // Navigation clavier entre onglets (flèches gauche / droite) — motif WAI-ARIA
  const onKeyDown = (ev) => {
    if (!["ArrowLeft", "ArrowRight"].includes(ev.key)) return;
    const next =
      (active + (ev.key === "ArrowRight" ? 1 : -1) + days.length) % days.length;
    setActive(next);
    tabsRef.current[next]?.focus();
  };

  return (
    <section
      className="section section--sand programme"
      id="programme"
      aria-labelledby="programme-title"
    >
      <PatternBg
        variant="circuit"
        color="currentColor"
        opacity={0.05}
        fade="top"
      />

      <div className="container">
        <div className="programme__head">
          <SectionHeader
            id="programme-title"
            eyebrow={p.eyebrow}
            title={p.title}
            lead={p.lead}
          />
          <Button
            href={icsHref}
            download="JCIA-2027.ics"
            variant="outline"
            iconLeft="calendar"
          >
            {p.addToCalendar}
          </Button>
        </div>

        {/* Onglets des journées */}
        <div
          className="programme__tabs"
          role="tablist"
          aria-label={p.tabsLabel}
        >
          {days.map((d, i) => (
            <button
              key={d.id}
              ref={(el) => {
                tabsRef.current[i] = el;
              }}
              role="tab"
              id={`tab-${d.id}`}
              aria-selected={active === i}
              aria-controls={`panel-${d.id}`}
              tabIndex={active === i ? 0 : -1}
              className={`programme__tab ${active === i ? "is-active" : ""}`}
              onClick={() => setActive(i)}
              onKeyDown={onKeyDown}
            >
              <span className="programme__tab-day">{d.day}</span>
              <span className="programme__tab-date">{d.date}</span>
            </button>
          ))}
        </div>

        {/* Panneau de la journée active */}
        <div
          className="programme__panel"
          role="tabpanel"
          id={`panel-${day.id}`}
          aria-labelledby={`tab-${day.id}`}
          key={day.id /* relance l'animation d'entrée à chaque changement */}
        >
          <p className="programme__day-title">{day.title}</p>
          <ol className="timeline">
            {day.sessions.map((s, i) => (
              <li
                key={`${s.time}-${s.title}`}
                className={`session session--${s.type} ${s.highlight ? "session--highlight" : ""}`}
                style={{ "--i": i }}
              >
                <time className="session__time">
                  <Icon name="clock" size={16} />
                  {s.time}
                </time>
                <span className="session__node" aria-hidden="true" />
                <div className="session__card">
                  <span className="session__type">{p.types[s.type]}</span>
                  <h3 className="session__title">{s.title}</h3>
                  {s.text && <p className="session__text">{s.text}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Masterclasses */}
        {showMasterclasses && (
          <div className="masterclasses" id="masterclasses">
            <Reveal as="h3" className="masterclasses__title">
              {p.masterclassesTitle} <span>· {p.masterclassesWhen}</span>
            </Reveal>
            <ul className="masterclasses__grid">
              {p.masterclasses.map((m, i) => (
                <Reveal
                  as="li"
                  key={m.num}
                  delay={i * 90}
                  className={`masterclass masterclass--${m.color}`}
                >
                  <div className="masterclass__top">
                    <span className="masterclass__num">{m.num}</span>
                    <Icon name={m.icon} size={28} />
                  </div>
                  <h4>{m.title}</h4>
                  <p>{m.text}</p>
                  <p className="masterclass__audience">
                    <Icon name="users" size={16} />
                    {m.audience}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>
        )}
        <MoreLink route="programme" />
      </div>
    </section>
  );
}
