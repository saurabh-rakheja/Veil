function calculateCompatibilityScore(userAInterests, userBInterests) {
  const a = userAInterests ?? []
  const b = userBInterests ?? []
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  const intersection = [...setA].filter(t => setB.has(t)).length
  const union = new Set([...setA, ...setB]).size
  if (union === 0) return 0
  return Math.round((intersection / union) * 100)
}

function detectLimitConflicts(viewerLimits, targetInterests) {
  const limits    = viewerLimits    ?? []
  const interests = targetInterests ?? []
  if (limits.length === 0 || interests.length === 0) return []
  const limitSet = new Set(limits)
  return interests.filter(t => limitSet.has(t))
}

module.exports = { calculateCompatibilityScore, detectLimitConflicts }
