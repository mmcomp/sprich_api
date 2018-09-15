'use strict'

const Moment = use('App/Libs/Moment')

const UserAntiqueHook = exports = module.exports = {}

UserAntiqueHook.checkStatus = async(antiques) => {
  for (const ant of antiques) {
    let remainingTime = ant.calculateRemaining()
    if (remainingTime <= 0) {
      ant.remaining = 0
    } else {
      ant.remaining = remainingTime
    }
  }
}