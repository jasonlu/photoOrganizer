"use strict";
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var fl = require('node-filelist');
var path = require('path');
var source = argv.source;
var output = normalizePath(argv.output);
var files = [source];
var option = { "ext": "jpeg|jpg|png|mp4" };
var exiftool = require('node-exiftool');
var exiftoolBin = require('dist-exiftool');
var ep = new exiftool.ExiftoolProcess(exiftoolBin);
function normalizePath(path) {
    if (path.charAt(path.length - 1) === '/') {
        path = path.substr(0, path.length - 1);
        if (path.charAt(path.length - 1) === '/') {
            path = normalizePath(path);
        }
    }
    return path;
}
function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}
var exiftoolsPid = null;
ep.open() // read and write metadata operations
    .then(function (pid) {
    exiftoolsPid = pid;
    console.log('Started exiftool process %s', pid);
    fl.read(files, option, function (results) {
        if (results.length === 0) {
            console.log("No file existed, cleaning up exiftools process: " + exiftoolsPid);
            ep.close();
        }
        var _loop_1 = function (i) {
            var absPath = results[i].path;
            var fileName = absPath.substr(absPath.lastIndexOf('/'));
            ep.readMetadata(absPath).then(function (metaData) {
                console.log("Processing " + (parseInt(i, 10) + 1) + " of " + results.length + " files... ");
                var outputPath = output; // + fileName;
                //console.log(metaData);
                if (!metaData) {
                    outputPath += fileName;
                }
                else {
                    var dateTimeTaken = metaData.data[0].DateTimeOriginal;
                    if (!dateTimeTaken) {
                        dateTimeTaken = metaData.data[0].CreateDate;
                    }
                    var year = void 0, month = void 0, day = void 0;
                    year = dateTimeTaken.substr(0, 4);
                    month = dateTimeTaken.substr(5, 2);
                    day = dateTimeTaken.substr(8, 2);
                    outputPath += "/" + year + "/" + month + "/" + day + fileName;
                }
                console.log("  Moving " + absPath + " to " + outputPath + "... ");
                ensureDirectoryExistence(outputPath);
                fs.rename(absPath, outputPath, function () {
                    console.log("  Completed");
                });
            }).then(function () {
                if (parseInt(i, 10) === results.length - 1) {
                    console.log("All files have been moved, closing exiftools process is: " + exiftoolsPid);
                    ep.close();
                }
            });
        };
        for (var i in results) {
            _loop_1(i);
        }
    });
})
    .catch(console.error);
