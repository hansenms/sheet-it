var csv = require('csv-parser');
var fse = require('fs-extra');
var path = require('path');
var https = require('https');

var sheets = JSON.parse(fse.readFileSync('sheets.json'));

function editLinkToCsvLink(url) {
    return url.replace('edit#gid=0', 'gviz/tq?tqx=out:csv');
}

function rowFileName(rowData, headers) {
    const exclusions = ['Link', 'Comment', 'Status', 'Owner'];
    var fileNameComponents = [];
    for (var i = 0; i < headers.length; i++) {
        if (!exclusions.includes(headers[i])) {
            if (rowData[headers[i]] && rowData[headers[i]].length > 0) {
                fileNameComponents.push(rowData[headers[i]]);
            }
        }
    }
    return fileNameComponents.join('-').split('/').join('_').split(' ').join('');
}

sheets["sheets"].forEach(s => {
    var folder = path.join('out', s.name.replace(' ', ''));
    fse.ensureDirSync(folder);
    https.get(s.url, function (response) {
        var headers;
        response
            .pipe(csv())
            .on('headers', (h) => {
                headers = h;
            })
            .on('data', (data) => {
                var file = fse.createWriteStream(path.join(folder, rowFileName(data, headers) + ".csv"));
                https.get(editLinkToCsvLink(data.Link), function(sheetResponse) {
                    sheetResponse.pipe(file);
                });
            });
    });
});
