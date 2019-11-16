const { el, list, mount, setAttr } = redom

const shuffle = (a) => {
    let i, j, len
    len = a.length
    if (len > 1) {
        for (i = len - 1; i >= 1; --i) {
            j = Math.floor(Math.random() * (i + 1))
            ;[ a[i], a[j] ] = [ a[j], a[i] ]
        }
    }
    return a
}

const randomDeal = () => shuffle(new Array(52)
                           .fill('ion-ios-arrow-round-up', 0, 13)
                           .fill('ion-ios-arrow-round-down', 13, 26)
                           .fill('ion-ios-arrow-round-forward', 26, 39)
                           .fill('ion-ios-arrow-round-back', 39))

class Arrow {
    constructor() { this.el = el('i') }
    update(data) { setAttr(this.el, { className: data }) }
}

const grid = list('.grid', Arrow)
grid.update(randomDeal())

document.body.onclick = e => {
    if (screenfull.isEnabled) { screenfull.request() }
    grid.update(randomDeal())
}

mount(document.body, grid)
