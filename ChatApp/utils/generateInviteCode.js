// Excludes visually ambiguous chars: 0/O, 1/I/L
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateInviteCode() {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}

module.exports = { generateInviteCode }
