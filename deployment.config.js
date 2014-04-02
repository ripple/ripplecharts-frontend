var grunt = require('grunt');

var awsCredentials = grunt.file.readJSON('aws.credentials.json');
var cloudflareCredentials = grunt.file.readJSON('cloudflare.credentials.json');
var environments = grunt.file.readJSON('deployment.environments.json');

var envCfg = function(environment) {
  console.log("Using environment " + environment + " for AWS deployment, if invoked.");
  return environments[environment];
}

module.exports = function(env) {
  var config = envCfg(env);
  return {
    aws: {
      accessKeyId: awsCredentials.accessKeyId,
      secretAccessKey: awsCredentials.secretAccessKey,
    },
    s3: {
      bucket: config.bucket,
      enableWeb: true
    },
    cloudflare: {
      email: cloudflareCredentials.email,
      api_key: cloudflareCredentials.api_key,
      domain: config.cloudflare_domain
    },
    
    api         : config.api         ? config.api : "",
    mixpanel    : config.mixpanel    ? config.mixpanel : "",
    ga_account  : config.ga_account  ? config.ga_account : "",
    ga_id       : config.ga_id       ? config.ga_id  : "",
    domain      : config.domain      ? config.domain : "",
    maintenance : config.maintenance ? true : false
  };
}
