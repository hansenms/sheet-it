var fse = require('fs-extra');
var path = require('path');
var https = require('https');

var sheets = JSON.parse(fse.readFileSync('sheets.json'));

function sheetNameToFileName(sheetName)
{
    return sheetName.split('/').join('_');
}

for (var p in sheets)
{
    var folder = path.join("out", p);
    fse.ensureDirSync(folder);
    sheets[p].forEach(sheetReference => {
        var file = fse.createWriteStream(path.join(folder, sheetNameToFileName(sheetReference.name) + ".csv"));
        https.get(sheetReference.url, function(response) {
            response.pipe(file);
          });
    });
}

/*

var file = fse.createWriteStream(path.join("out", "ADT01.csv"));
https.get("https://docs.google.com/spreadsheets/d/1kPOewgrlY4Mpi8W3HyLzb5J-tuZnUBAzgsXuhX5lcGo/gviz/tq?tqx=out:csv", function(response) {
  response.pipe(file);
});
*/