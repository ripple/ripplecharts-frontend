var grunt = require('grunt');

var awsCredentials = grunt.file.readJSON('aws.credentials.json');
var cloudflareCredentials = grunt.find.readJSON('cloudflare.credentials.json');
var environments = grunt.file.readJSON('deployment.environments.json');

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
    cloudflare: {
      email: cloudflareCredentials.email,
      api_key: cloudflareCredentials.api_key,
      domain: envCfg(env).cloudflare_domain
    }
  };
}
