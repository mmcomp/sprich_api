'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/guides/routing
|
*/
const Raven = require('raven')
const Env = use('Env')

// Sentry
// Raven.config(Env.get('SENTRY_TOKEN')).install()
// global.SentryException = Raven

const Route = use('Route')
const MqttClient = require('mqtt')

require('./kue')

Route.match(['options'],'*',function * () {
  return 'allowed'
})

Route.get('/', ({
  request
}) => {
  return 'Api is working ...'
})

// All Http Routes
Route.post('/signin', 'AuthController.signin')
Route.post('/verify', 'AuthController.verify')
Route.post('/ping', 'AuthController.ping')
Route.post('/ticket', 'TicketController.add')
Route.post('/ticket/update', 'TicketController.update')
Route.get('/ticket/:mobile', 'TicketController.get')
Route.get('/ticket', 'TicketController.get_all')

// Site Http Routes
Route.get('/exchange', 'HttpExchangeController.list')
Route.post('/exchange_detail', 'HttpExchangeController.detail')
Route.post('/http_signin', 'AuthController.httpSignin')
Route.post('/http_verify', 'AuthController.httpVerify')
Route.post('/exchange_buy', 'HttpExchangeController.buy')
Route.post('/exchange_codes', 'HttpExchangeController.codes')



// Mqtt Http Routes
Route.post('/mqtt_signin', 'AuthController.mqttSignin')
Route.post('/mqtt_acl', 'AuthController.mqttAcl')

Route.post('/mqtt/auth', 'AuthController.mqttSignin')
Route.post('/mqtt/superuser', 'AuthController.mqttSignin')
Route.get('/mqtt/acl', 'AuthController.mqttAcl')


// Bank response Route
Route.any('/bank_revert', 'TransactionController.revert')
Route.any('/bank_mellat_revert', 'TransactionController.mellatRevert')
Route.any('/bank_mellat_send', 'TransactionController.mellatSend')
Route.any('/bank_saderat_revert', 'TransactionController.saderatRevert')
Route.any('/bank_saderat_send', 'TransactionController.saderatSend')
Route.any('/bank_saman_send', 'TransactionController.samanSend')
Route.any('/bank_saman_revert', 'TransactionController.samanRevert')

const { exec } = require('child_process')
exec('service emqttd start', (err, stdout, stderr) => {
  if (err){
    console.log(err)
  }
  
  // Mqtt Connection
  let client = MqttClient.connect(Env.get('SERVER_MQTT'), {
    username: Env.get('SERVER_USERNAME'),
    password: Env.get('SERVER_PASSWORD'),
    clientId: Env.get('SERVER_CLIENT')
  })
  global.Mqtt = client

  client.on('connect', function () {
    client.subscribe(Env.get('SERVER_SENDER_TOPIC'))
    console.log('MQTT connected ...')
  })
  client.on('message', require('./mqttRoutes'))

  console.log(stdout)
  console.log(stderr)
});
