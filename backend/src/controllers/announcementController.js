const { getAnnouncements } = require('../models/announcementModel');

async function getAnnouncementsHandler(req, res) {
  try {
    const rows = await getAnnouncements();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAnnouncementsHandler };
