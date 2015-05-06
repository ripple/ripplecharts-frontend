var scale_template =
'<% if (value>=1000000) {%>'
  +'<%=" "+value/1000000%>m'
+'<% } else if (value>=1000){%>'
  +'<%=" "+value/1000%>k'
+'<% } else if(value == 0){%>'
  +''
+'<% } else {%>'
  + '<%=" "+value%>'
+'<%}%>'

var legend_template =
'<div class="legend">'
  +'<% for (var i=0; i<datasets.length; i++) { %>'
    +'<div class="label" title="<%= datasets[i].label %>" style="color:<%=datasets[i].fillColor%>">'
      +'<div class="gateway">'
        + '<% if (datasets[i].label.split("-").length == 1) { %>'
          + '<%= datasets[i].label.split("-")[0] %>'
        + '<% } else if (datasets[i].label.split("-")[3]){ %>'
          +'<div class="gw">'
            +'<%= datasets[i].label.split("-")[3]%>'
          +'</div>'
          +'<div class="pair">'
            + '<%= datasets[i].label.split("-")[0] %> - <%= datasets[i].label.split("-")[2] %>'
          +'</div>'
        + '<% } else { %>'
        + '<%= datasets[i].label.split("-")[2]%> <%= datasets[i].label.split("-")[0] %>'
        + '<% } %>'
      +'</div>'
      +'<div class="issuer">'
        + '<% if (datasets[i].label.split("-")[1]) { %><%= datasets[i].label.split("-")[1] %><% } %>'
      +'</div>'
    +'</div>'
  +'<% } %>'
+'</div>'

var colors = [
  "rgba(31, 119, 180,0.7)",
  "rgba(255, 127, 14,0.7)",
  "rgba(174, 199, 232,0.7)",
  "rgba(255, 187, 120,0.7)",
  "rgba(214, 39, 40,0.7)",
  //"rgba(152, 223, 138,0.7)",
  //"rgba(255, 152, 150,0.7)",
  "rgba(44, 160, 44,0.7)",

  "rgba(241,150,112,0.7)",
  "rgba(225,101,82,0.7)",
  "rgba(201,74,83,0.7)",
  "rgba(190,81,104,0.7)",
  "rgba(163,73,116,0.7)",
  "rgba(153,55,103,0.7)",
  "rgba(101,56,125,0.7)",
  "rgba(78,36,114,0.7)",
  "rgba(145,99,182,0.7)",
  "rgba(224,89,139,0.7)",
  "rgba(124,159,176,0.7)",
  "rgba(154,191,136,0.7)",
  "rgba(81,87,74,0.7)"
];

var currencies = {
  "USD":"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
  "BTC":"rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q",
  "CNY":"razqQKzJRdB4UxFPWf5NEpEG3WMkmwgcXA",
  "EUR":"rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q",
  "JPY":"rMAz5ZnK73nyNUL4foAvaxdreczCkG3vA6",
  "XRP":""
};
