function normalizeTravelApproverNIP(value) {
  const nip = String(value ?? '').trim()
  return nip === '0363' ? '0359' : nip
}

module.exports = { normalizeTravelApproverNIP }
