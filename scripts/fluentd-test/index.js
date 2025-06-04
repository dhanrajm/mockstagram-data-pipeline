const fluent = require('fluent-logger');

// Configure with the base tag that matches our Fluentd match pattern
fluent.configure('mockstagram', {
  host: 'localhost',
  port: 24224,
  timeout: 3.0,
  reconnectInterval: 600000 // 10 minutes
});

console.log('Sending test log...');

// The full tag will be mockstagram.test
fluent.emit('test', {
  message: "Hello Fluentd!",
  timestamp: new Date().toISOString()
}, (err) => {
  if (err) {
    console.error('Failed to send log:', err);
  } else {
    console.log('Log sent successfully!');
  }
  fluent.end();
}); 