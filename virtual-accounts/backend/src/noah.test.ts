import assert from 'node:assert/strict'
import test from 'node:test'
import { mapVirtualAccount } from './noah.js'

/**
 * Both fixtures are real `POST /v1/workflows/bank-deposit-to-onchain-address`
 * responses from api.sandbox.noah.com. The point of the test is the one thing
 * that is easy to get wrong and expensive when wrong: `BankCode` is a routing
 * number on ACH and Fedwire, and a BIC on SWIFT and SEPA.
 */

const usdResponse = {
  AccountHolderName: 'John Mock-Doe',
  AccountNumber: '239531098956',
  BankCode: 'SSBAUS32',
  BankName: 'SSB Bank',
  Fee: { FiatCurrencyCode: 'USD', TotalFeeBase: '25', TotalFeePct: '0.15' },
  PaymentMethodID: 'Bank/Swift/USD/SSBAUS32/239531098956/usr_test',
  PaymentMethodType: 'BankSwift',
  RelatedPaymentMethods: [
    {
      Details: { AccountNumber: '239531098956', BankCode: '043087080' },
      Fee: { FiatCurrencyCode: 'USD', TotalFeeBase: '2.19', TotalFeePct: '0.15' },
      PaymentMethodID: 'Bank/Ach/USD/043087080/239531098956/usr_test',
      PaymentMethodType: 'BankAch',
    },
    {
      Details: { AccountNumber: '239531098956', BankCode: '043087080' },
      Fee: { FiatCurrencyCode: 'USD', TotalFeeBase: '20', TotalFeePct: '0.15' },
      PaymentMethodID: 'Bank/Fedwire/USD/043087080/239531098956/usr_test',
      PaymentMethodType: 'BankFedwire',
    },
  ],
}

const eurResponse = {
  AccountHolderName: 'John Mock-Doe',
  AccountNumber: 'MT62CFTE19870000000090010305349',
  BankCode: 'CFTEMTM1XXX',
  BankName: 'OPENPAYD FINANCIAL SERVICES MALTA LTD',
  Fee: { FiatCurrencyCode: 'EUR', TotalFeeBase: '0', TotalFeePct: '1' },
  PaymentMethodID: 'Bank/Sepa/EUR/CFTEMTM1XXX/MT62CFTE19870000000090010305349/usr_test',
  PaymentMethodType: 'BankSepa',
}

test('a USD account exposes SWIFT, ACH and Fedwire with the right bank codes', () => {
  const account = mapVirtualAccount(usdResponse, 'USD')

  assert.deepEqual(
    account.methods.map((m) => m.rail),
    ['swift', 'ach', 'fedwire']
  )
  // The SWIFT BIC must never be offered as a routing number, and the routing
  // number must not be dropped just because it arrived in a related method.
  assert.equal(account.methods[0]?.bankCode, 'SSBAUS32')
  assert.equal(account.methods[1]?.bankCode, '043087080')
  assert.equal(account.methods[1]?.feeBase, '2.19')
  assert.equal(account.currency, 'USD')
})

test('a EUR account is a single SEPA method with the IBAN as the account number', () => {
  const account = mapVirtualAccount(eurResponse, 'EUR')

  assert.deepEqual(
    account.methods.map((m) => m.rail),
    ['sepa']
  )
  assert.equal(account.methods[0]?.accountNumber, 'MT62CFTE19870000000090010305349')
  assert.equal(account.methods[0]?.bankCode, 'CFTEMTM1XXX')
  assert.equal(account.currency, 'EUR')
})
