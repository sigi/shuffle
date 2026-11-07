import { defineStore } from "pinia"

const shuffle = (values) => {
  for (let i = values.length - 1; i >= 1; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = values[i]
    values[i] = values[j]
    values[j] = current
  }
  return values
}

const createRandomDeal = () =>
  shuffle([
    ...Array(13).fill("up"),
    ...Array(13).fill("down"),
    ...Array(13).fill("left"),
    ...Array(13).fill("right"),
  ])

export const useArrowsStore = defineStore("arrows", {
  state: () => ({ arrows: createRandomDeal() }),
  actions: {
    regenerate() {
      this.arrows = createRandomDeal()
    },
  },
})
