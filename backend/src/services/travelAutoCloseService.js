const { autoCloseTravels } = require('../models/travelModel')
const { autoCloseTravelGroups } = require('../models/travelGroupModel')

function jakartaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
}

function isJakartaMidnight(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
  return parts.find((part) => part.type === 'hour')?.value === '00' && parts.find((part) => part.type === 'minute')?.value === '00'
}

function shouldAutoClose({ status, departureAt, returnedAt, autoClosedAt }) {
  return String(status || '').toUpperCase() === 'APPROVED' && Boolean(departureAt) && !returnedAt && !autoClosedAt
}

async function runTravelAutoClose(now = new Date()) {
  if (!isJakartaMidnight(now)) return { individual: 0, group: 0, skipped: true, date: jakartaDate(now) }
  const [individual, group] = await Promise.all([autoCloseTravels(), autoCloseTravelGroups()])
  return { individual, group, skipped: false, date: jakartaDate(now) }
}

function startTravelAutoCloseScheduler({ intervalMs = 60000 } = {}) {
  let running = false
  let lastRunDate = ''
  const run = () => {
    if (running || lastRunDate === jakartaDate()) return
    running = true
    runTravelAutoClose().then((result) => { if (!result.skipped) lastRunDate = result.date }).catch((error) => console.error('[travel-auto-close]', error.message)).finally(() => { running = false })
  }
  run()
  const timer = setInterval(run, intervalMs)
  return { stop: () => clearInterval(timer) }
}

module.exports = { jakartaDate, isJakartaMidnight, shouldAutoClose, runTravelAutoClose, startTravelAutoCloseScheduler }
