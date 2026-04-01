const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const res = await yahooFinance.chart('AAPL', { period1: '2024-01-01' });
    console.log('SUCCESS:', res.timestamp ? res.timestamp.length : (res.quotes ? res.quotes.length : 0));
  } catch (e) {
    console.log('FAIL:', e.message);
  }
}
test();
