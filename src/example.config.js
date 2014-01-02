//API url to backend
var API = ""; 

var Options = {
  theme: "light",
  
  ripple : {
    trace         :  true,
    trusted       :  true,

    servers: [
      { host: 's_west.ripple.com', port: 443, secure: true }
      //{ host: 's_east.ripple.com', port: 443, secure: true }
    ],

    connection_offset: 0
  }
}