'use strict'

// این فایل از kue که یک تسک منیجر است به منظور عملیات های مرتبط به آمار ها که هر شب سر یک ساعت مشخص باید داده ذخیره شود استفاده می کند
// مشابه cronjob

// Jobs
const DashboardStat = use('App/Jobs/DashboardStat')

try {
  const kue = require('kue-scheduler')
  const Queue = kue.createQueue()

  Queue.remove({
    unique: 'minesweeper_weeklygift'
  }, function (error, response) {
    if (error) {
      console.log(error, response)
    }
  })

  Queue.remove({
    unique: 'minesweeper_absents'
  }, function (error, response) {
    if (error) {
      console.log(error, response)
    }
  })

  Queue.remove({
    unique: 'minesweeper_dashboard'
  }, function (error, response) {
    if (error) {
      console.log(error, response)
    }
  })

  Queue.remove({
    unique: 'minesweeper_stat'
  }, function (error, response) {
    if (error) {
      console.log(error, response)
    }
  })

  // DashboardStat Cron Workder
  const statJob = Queue.createJob('minesweeper_stat')
    .attempts(3)
    .priority('normal')

  Queue.every('10 0 * * *', statJob)
  Queue.process('minesweeper_stat', DashboardStat.stat)

  // Dashboard Cron Workder
  const dashboardJob = Queue.createJob('minesweeper_dashboard')
    .attempts(3)
    .priority('normal')

  Queue.every('20 minutes', dashboardJob)
  Queue.process('minesweeper_dashboard', DashboardStat.dashboard)

  // User Absent Cron Worker
  const absentJob = Queue.createJob('minesweeper_absents')
    .attempts(3)
    .priority('normal')

  Queue.every('0 18 * * *', absentJob)
  Queue.process('minesweeper_absents', DashboardStat.absents)

    // User Weekly Gift Cron Worker
  const weeklyGiftJob = Queue.createJob('minesweeper_weeklygift')
    .attempts(3)
    .priority('normal')

  Queue.every('every friday', weeklyGiftJob)
  // Queue.every('2 seconds', weeklyGiftJob)
  Queue.process('minesweeper_weeklygift', DashboardStat.weeklyGift)

} catch (error) {
  // SentryException.captureException(error)
}

console.log('Start worker ...')
