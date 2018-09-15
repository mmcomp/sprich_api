// در فایل یک custom validation برای چک کردن موبایل به validation سیستم افزوده شده است .

const {
  hooks
} = require('@adonisjs/ignitor')
let phone = require('phone')

hooks.after.providersBooted(() => {
  const Validator = use('Validator')

  const mobileValidation = async(data, field, message, args, get) => {
    const value = get(data, field)
    if (!value) {
      /**
       * skip validation if value is not defined. `required` rule
       * should take care of it.
       */
      return
    }

    const fieldValue = get(data, field)
    let country = 'IR'
    if (args.length) {
      country = args[0]
    }

    const normalMobile = phone(fieldValue, country)
    if (normalMobile.length) {
      return true
    }
    throw message
  }

  Validator.extend('mobile', mobileValidation)
})
