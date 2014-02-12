# Ripple Charts

This is the frontend for ripplecharts.com data visualization using angular.js and D3

##Installation Instructions:

clone the repository: git clone https://github.com/ripple/ripplecharts-frontend


1. Install [node.js and npm](http://nodejs.org/).
2. Install [bower](http://bower.io/)

        $ sudo npm install -g bower
        
2. Install [Grunt](http://gruntjs.com/).

        $ sudo npm install -g grunt-cli
    
3. Install Ripple Client.
    
        $ git clone https://github.com/ripple/ripplecharts-frontend
        $ cd ripplecharts-frontend
        $ npm install
        $ bower install
        
4. Copy 'aws.credentials.json.example' into 'aws.credentials.json'
5. Copy 'deployment.environments.json.example' into 'deployment.environments.json'
5. Copy 'src/example.config.js' into 'src/config.js' and fill in the options as desired. A URL for the api is required.
6. Change back to the ripplecharts-frontend directory

## Build

1. Run the following command to build the client.    

    $ grunt

2. Navigate your browser to the /build directory for the development version, or to the /bin directory for the compiled version