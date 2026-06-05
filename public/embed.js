/* Fellowship — embed loader. Auto-resize des iframes + détection du thème du site.
   Chargé sur le site du client : <script src="https://flw.sh/embed.js" async></script> */
(function () {
  var ORIGIN = 'https://flw.sh'

  function iframes() {
    return Array.prototype.slice.call(document.querySelectorAll('iframe[data-flwsh-embed]'))
  }

  /* Remonte les ancêtres jusqu'à un fond opaque → 'light' | 'dark' | null */
  function hostThemeFor(iframe) {
    try {
      var el = iframe.parentElement
      while (el) {
        var bg = getComputedStyle(el).backgroundColor
        var m = bg && bg.match(/\d+(\.\d+)?/g)
        if (m && (m.length < 4 || parseFloat(m[3]) > 0)) {
          var r = +m[0], g = +m[1], b = +m[2]
          var lum = 0.299 * r + 0.587 * g + 0.114 * b
          return lum < 128 ? 'dark' : 'light'
        }
        el = el.parentElement
      }
    } catch (e) { /* ignore */ }
    return null
  }

  function sendTheme(iframe) {
    if (!/theme=auto/.test(iframe.src)) return
    var theme = hostThemeFor(iframe)
    if (!theme || !iframe.contentWindow) return
    iframe.contentWindow.postMessage({ source: 'flwsh-embed', type: 'theme', theme: theme }, ORIGIN)
  }

  /* iframe → parent : on ne fait confiance qu'aux messages venant de flw.sh */
  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN) return
    var d = e.data
    if (!d || d.source !== 'flwsh-embed') return

    if (d.type === 'resize' && typeof d.height === 'number') {
      iframes().forEach(function (f) {
        if (f.contentWindow === e.source) f.style.height = Math.ceil(d.height) + 'px'
      })
    } else if (d.type === 'ready') {
      iframes().forEach(function (f) {
        if (f.contentWindow === e.source) sendTheme(f)
      })
    }
  })

  /* Proactif : couvre le cas où embed.js charge APRÈS le 'ready' de l'iframe */
  function init() { iframes().forEach(sendTheme) }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
