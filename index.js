var csv = require('csv-parser');
var fse = require('fs-extra');
var path = require('path');
var https = require('https');

var sheets = JSON.parse(fse.readFileSync('sheets.json'));

function editLinkToCsvLink(url) {
    var newUrl = url.replace('edit#gid=0', 'export?format=csv');
    newUrl = newUrl.replace('edit?usp=sharing','export?format=csv');
    return newUrl;
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
    return fileNameComponents.join('-').split(/[/:]/).join('_').split(' ').join('');
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
                try {
                    https.get(editLinkToCsvLink(data.Link), function(sheetResponse) {
                        if (sheetResponse.statusCode == 200) {
                            var file = fse.createWriteStream(path.join(folder, rowFileName(data, headers) + ".csv"));
                            sheetResponse.pipe(file);
                        } else if (sheetResponse.statusCode == 307) {
                            var redirectedContent = '';
                            sheetResponse.on('readable', () => redirectedContent += sheetResponse.read());
                            sheetResponse.on('end', () => {
                                let redirectedResults = redirectedContent.match(/The document has moved <A HREF="(.*)">here<\/A>/);
                                let redirectedLink = redirectedResults[1];

                                https.get(redirectedLink, function(redirectedResponse) {
                                    if (redirectedResponse.statusCode == 200) {
                                        var file = fse.createWriteStream(path.join(folder, rowFileName(data, headers) + ".csv"));
                                        redirectedResponse.pipe(file);
                                    } else {
                                        console.log('Error accessing redirected file for ' + rowFileName(data, headers) + ', ' + editLinkToCsvLink(data.Link));
                                    }
                                });
                            });
                        } else {
                            console.log('Error accessing file for ' + rowFileName(data, headers) + ', ' + editLinkToCsvLink(data.Link));
                        }
                    });
                }
                catch(err) {
                    console.log(`Error : [${err}] for ${rowFileName(data, headers)},  ${editLinkToCsvLink(data.Link)}`);
                }
            });
    });
});
