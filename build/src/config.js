Options = {
  theme: 'light',
  base: {
    currency: 'BTC',
    issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
  },
  trade: {
    currency: 'XRP',
    issuer: ''
  },
  chartType: 'line',
  interval: '1h',
  ripple: {
    trace: false,
    trusted: false,
    servers: [
      {
        host: 's-west.ripple.com',
        port: 443,
        secure: true
      },
      {
        host: 's-east.ripple.com',
        port: 443,
        secure: true
      }
    ],
    connection_offset: 0
  }
};