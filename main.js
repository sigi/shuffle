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
                           .fill('up', 0, 13)
                           .fill('down', 13, 26)
                           .fill('left', 26, 39)
                           .fill('right', 39))

class Arrow {
    constructor() { this.el = el('i') }
    update(data, index) {
        this.el.textContent = data
        // Zebra striping (item count per line is implicit from styling)
        if ((index / 6 | 0) % 2 == 1) {
            setAttr(this.el, { className: 'stripe' })
        }
    }
}

const grid = list('.grid', Arrow)
grid.update(randomDeal())

document.body.onclick = e => {
    if (screenfull.isEnabled) { screenfull.request() }
    grid.update(randomDeal())
}

mount(document.body, grid)
