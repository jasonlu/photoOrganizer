const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');
const fl = require('node-filelist');
const path = require('path');
const source = argv.source;
const output: string = normalizePath(argv.output);
const files = [source];
const option = {"ext": "jpeg|jpg|png|mp4"};
const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const ep = new exiftool.ExiftoolProcess(exiftoolBin);


function normalizePath(path: string) {
    if (path.charAt(path.length - 1) === '/') {
        path = path.substr(0, path.length - 1);
        if (path.charAt(path.length - 1) === '/') {
            path = normalizePath(path)
        }
    }
    return path;
}

function ensureDirectoryExistence(filePath: string) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

let exiftoolsPid: any = null;

ep.open() // read and write metadata operations
    .then((pid: string) => {
        exiftoolsPid = pid;
        console.log('Started exiftool process %s', pid);

        fl.read(files, option , (results: Array<any>) => {
            if (results.length === 0) {
                console.log(`No file existed, cleaning up exiftools process: ${exiftoolsPid}`);
                ep.close();
            }
            for(let i in results){
                let absPath = results[i].path;
                let fileName = absPath.substr(absPath.lastIndexOf('/'));

                ep.readMetadata(absPath).then((metaData: any) => {
                    console.log(`Processing ${parseInt(i, 10) + 1} of ${results.length} files... `);

                    let outputPath = output;// + fileName;
                    //console.log(metaData);
                    if (!metaData) {
                        outputPath += fileName;
                    } else {
                        let dateTimeTaken: string = metaData.data[0].DateTimeOriginal;
                        if (!dateTimeTaken) {
                            dateTimeTaken = metaData.data[0].CreateDate;
                        }

                        let year, month, day;
                        year = dateTimeTaken.substr(0, 4);
                        month = dateTimeTaken.substr(5, 2);
                        day = dateTimeTaken.substr(8, 2);
                        outputPath += `/${year}/${month}/${day}${fileName}`;
                    }
                    console.log(`  Moving ${absPath} to ${outputPath}... `);
                    ensureDirectoryExistence(outputPath);
                    fs.rename(absPath, outputPath, () => {
                        console.log(`  Completed`);
                    });
                }).then(() => {
                    if (parseInt(i, 10) === results.length - 1) {
                        console.log(`All files have been moved, closing exiftools process is: ${exiftoolsPid}`);
                        ep.close();
                    }
                });
            }
        });

    })
    .catch(console.error);