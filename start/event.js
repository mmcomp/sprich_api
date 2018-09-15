'use strict'

// همانطور که قیلا گفته شد بازی ها در سیستم بروی redis اجرا می شوند و به ازای هر بازی یک داده روی redis ذخیره می شه به همراه مقدار expire که این مقدار به ازای هر بازی متفاوت است .
// از expire به زمانی استفاده می شود که کاربر وسط اجرای مین روبی یا اسمشر بازی از بازی خارج می شود و عملا بازی به پایان نمی رسد
// در این زمان پس از expire شدن آن کلید در redis خود redis یک event فایر می کند که این یعنی زمان expire این داده فرا رسیده است و ما در این فایل چک می کنیم که این داده که expire شده مربوط به کدام بازی است و اعمالی که برای باخت و یا کنسلی بازیکن در نظر گرفته ایم را روی کاربر اجرا می کنیم .
// به این شکل بازی هایی که به پایان نرسیده اند و وسط بازی کاربر خارج شده اند نیز هندل می شوند .

const GameSession = use('App/Models/GameSession')
const Property = use('App/Models/Property')
const Message = use('App/Models/Message')
const User = use('App/Models/User')

const Redis = use('Redis')

Redis.select('1')
Redis.psubscribe('__keyevent@?__:expired', async (message, channel, pattern) => {
  try {
    const channelParse = channel.split('_')
    let gameSession

    switch (channelParse[0]) {
      // برای هندل بازی های سیستمی
      case 'game':
        gameSession = await GameSession.query().where('type', 'system').where('session_id', channel).with('game').with('user').with('user.property').first()
        if (gameSession) {
          let gameSessionData = gameSession.toJSON()
          let changes = {}

          // if (gameSessionData.depo_type != 'none') {
          //   changes[gameSessionData.depo_type] = gameSessionData.user.property[gameSessionData.depo_type] + gameSessionData.depo_amount
          // }

          if (gameSessionData.game.cancel_type != 'none') {
            changes[gameSessionData.game.cancel_type] = gameSessionData.user.property[gameSessionData.game.cancel_type] + gameSessionData.game.cancel_amount
          }

          await Property.query().where('user_id', gameSessionData.user.id).update(changes)
          await gameSession.user().update({
            game_lose: gameSessionData.user.game_lose++,
            courage_stat: gameSessionData.user.courage_stat--
          })

          await gameSession.delete()
        }
        break

      // برای هندل حمله ها و انتقام ها
      case 'attack':
        gameSession = await GameSession.query().where('type', '!=', 'system').where('session_id', channel).first()
        if (gameSession) {
          let user = await User.query().where('id', gameSession.user_id).first()
          user.game_lose++
          user.courage('sub', 1)

          await user.save()

          let award = {
            elixir: 0,
            yellow: 0,
            blue: 0,
            antique: [],
            win: false,
            revenge: true
          }

          await Message.create({
            user_id: gameSession.userDefence,
            sender_id: user.id,
            type: 'attack',
            status: 'unread',
            sticker_id: -1,
            message: JSON.stringify(award)
          })

          await gameSession.delete()
        }
        break
    }
  } catch (error) {
    // SentryException.captureException(error)
  }
})
