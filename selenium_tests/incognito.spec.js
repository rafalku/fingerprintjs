const { expect } = require('chai')
const { afterEach } = require('mocha')
const { Builder, By, until } = require('selenium-webdriver')
const browserstack = require('browserstack-local')

describe('Incognito vs non-incognito mode', function () {
  this.timeout(60000)

  const URL = 'http://localhost:8080'
  const ID_ELEM_XPATH = '//div[text()="Visitor identifier:"]/following-sibling::pre[1]'

  var driverBuilder
  var driver1
  var driver2
  var bs_local

  before(function (done) {
    driverBuilder = new Builder().usingServer('http://hub-cloud.browserstack.com/wd/hub')
    bs_local = new browserstack.Local()
    const bs_local_args = { key: process.env.BROWSERSTACK_ACCESS_KEY }
    bs_local.start(bs_local_args, async function () {
      done()
    })
  })

  after(function (done) {
    bs_local.stop(function () {
      done()
    })
  })

  afterEach(function () {
    if (driver1) {
      driver1.quit()
    }
    if (driver2) {
      driver2.quit()
    }
  })

  let browsersCapabilities = [
    {
      browserName: 'chrome',
      chromeOptions: {
        args: ['incognito'],
      },
    },
    {
      browserName: 'firefox',
      'moz:firefoxOptions': {
        args: ['-private'],
      },
    },
  ]

  browsersCapabilities.forEach((capabilities) => {
    it(capabilities.browserName, async function () {
      capabilities['bstack:options'] = {
        os: 'Windows',
        osVersion: '10',
        buildName: '(Non)Incognito',
        sessionName: 'Incognito',
        local: true,
        userName: process.env['BROWSERSTACK_USERNAME'],
        accessKey: process.env['BROWSERSTACK_ACCESS_KEY'],
      }

      async function getIdInPrivate() {
        driver1 = driverBuilder.withCapabilities(capabilities).build()
        await driver1.get(URL)
        let idElem = await driver1.wait(until.elementLocated(By.xpath(ID_ELEM_XPATH)), 10000)
        return idElem.getText()
      }

      async function getIdInNonIncognito() {
        capabilities['bstack:options'].sessionName = 'Non-incognito'
        for (const key in capabilities) {
          if (key.endsWith('Options')) delete capabilities[key]
        }
        driver2 = driverBuilder.withCapabilities(capabilities).build()
        await driver2.get(URL)
        let idElem = await driver2.wait(until.elementLocated(By.xpath(ID_ELEM_XPATH)), 10000)
        return idElem.getText()
      }

      return Promise.all([getIdInPrivate(), getIdInNonIncognito()]).then((ids) => {
        console.log(ids)
        expect(ids[0]).to.eq(ids[1])
        expect(ids[0]).to.have.length(32)
      })
    })
  })
})
