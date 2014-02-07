function jsonToCSV(objArray) {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;

    var str = '';
    var line = '';
    var index, value;

    var head = array[0];
    if ($("#quote").is(':checked')) {
        for (index in array[0]) {
            value = index + "";
            line += '"' + value.replace(/"/g, '""') + '",';
        }
    } else {
        for (index in array[0]) {
            line += index + ',';
        }
    }

    line = line.slice(0, -1);
    str += line + '\r\n';
    

    for (var i = 0; i < array.length; i++) {
        line = '';

        if ($("#quote").is(':checked')) {
            for (index in array[i]) {
                value = array[i][index] + "";
                line += '"' + value.replace(/"/g, '""') + '",';
            }
        } else {
            for (index in array[i]) {
                line += array[i][index] + ',';
            }
        }

        line = line.slice(0, -1);
        str += line + '\r\n';
    }
    return str;
    
}