// Decorative card-table preview. Time is supplied by the shared hover clock.
export function drawOhHell(ctx, width, height, time) {
  ctx.fillStyle = '#103c32'
  ctx.fillRect(0, 0, width, height)
  const scale = Math.min(width / 600, height / 400)
  ctx.save()
  ctx.translate(width / 2, height * 0.43)
  ctx.scale(scale, scale)
  ctx.strokeStyle = '#b99a61'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(0, 10, 240, 130, 0, 0, Math.PI * 2)
  ctx.stroke()
  const cards = [['J', '♠'], ['J', '♣'], ['A', '♥'], ['K', '♦'], ['A', '♠']]
  cards.forEach(([rank, suit], i) => {
    ctx.save()
    ctx.translate((i - 2) * 67, Math.abs(i - 2) * 12 + Math.sin(time * 1.3 + i) * 4)
    ctx.rotate((i - 2) * 0.13)
    ctx.fillStyle = '#fff4de'
    ctx.beginPath()
    ctx.roundRect(-43, -65, 86, 130, 7)
    ctx.fill()
    ctx.fillStyle = suit === '♥' || suit === '♦' ? '#ad3c35' : '#173c35'
    ctx.textAlign = 'left'
    ctx.font = 'bold 22px Georgia, serif'
    ctx.fillText(rank, -33, -36)
    ctx.textAlign = 'center'
    ctx.font = '44px Georgia, serif'
    ctx.fillText(suit, 0, 24)
    ctx.restore()
  })
  ctx.fillStyle = '#f6e8c9'
  ctx.textAlign = 'center'
  ctx.font = 'bold 25px Georgia, serif'
  ctx.fillText('OH HELL · 10 TO 1', 0, 135)
  ctx.restore()
}
