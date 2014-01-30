var grunt = require('grunt');

var awsCredentials = grunt.file.readJSON('aws.credentials.json');

var environments = {
  staging: {
    bucket: 'www.ripplecharts-staging.com'
  },
  production: {
    bucket: 'www.ripplecharts.com'
  }
}

var envCfg = function(environment) {
  console.log("Using environment " + environment + " for AWS deployment, if invoked.");
  return environments[environment];
}

module.exports = function(env) {
  return {
    aws: {
      accessKeyId: awsCredentials.accessKeyId,
      secretAccessKey: awsCredentials.secretAccessKey,
    },
    s3: {
      bucket: envCfg(env).bucket,
      enableWeb: true
    },
  };
}
