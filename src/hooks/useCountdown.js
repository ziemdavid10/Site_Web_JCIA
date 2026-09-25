import { useEffect, useState } from 'react'

/**
 * Calcule le temps restant jusqu'à une date cible.
 * @param {string} targetISO  Date cible au format ISO (ex: '2027-04-27T08:00:00+01:00')
 * @returns {{days:number, hours:number, minutes:number, seconds:number, isOver:boolean}}
 */
function getRemaining(targetISO) {
  const diff = Math.max(0, new Date(targetISO).getTime() - Date.now())
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isOver: diff === 0,
  }
}

/**
 * Hook de compte à rebours, mis à jour chaque seconde.
 * Le timer s'arrête automatiquement une fois la date atteinte.
 */
export default function useCountdown(targetISO) {
  const [remaining, setRemaining] = useState(() => getRemaining(targetISO))

  useEffect(() => {
    const id = setInterval(() => {
      const next = getRemaining(targetISO)
      setRemaining(next)
      if (next.isOver) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [targetISO])

  return remaining
}
