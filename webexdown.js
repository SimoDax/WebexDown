"use strict";

const execSync = require('child_process').execSync;
const puppeteer = require("puppeteer-core");
const term = require("terminal-kit").terminal;
const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const find = require("find");


const argv = yargs.options({
    v: { alias: 'videoUrls', type: 'array', demandOption: false },
    u: { alias: 'username', type: 'string', demandOption: true, describe: 'Codice Persona PoliMi' },
    e: { alias: 'email', type: 'string', demandOption: true, describe: 'Email PoliMi' },
    p: { alias: 'password', type: 'string', demandOption: false },
    o: { alias: 'outputDirectory', type: 'string', default: 'videos' },
    q: { alias: 'quality', type: 'number', demandOption: false, describe: 'Video Quality [0-5]' },
    k: { alias: 'noKeyring', type: 'boolean', default: false, demandOption: false, describe: 'Do not use system keyring' }
})
.help('h')
.alias('h', 'help')
.example('node $0 -u CODICEPERSONA -e EMAIL -v "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/play/..."\n', "Standard usage")
.example('node $0 -u CODICEPERSONA -e EMAIL -v "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/play/..." "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/play/..."\n', "Multiple videos download")
.example('node $0 -u CODICEPERSONA -e EMAIL -v "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/play/..." -q 4\n', "Define default quality download to avoid manual prompt")
.example('node $0 -u CODICEPERSONA -e EMAIL -v "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/play/..." -o "C:\\Lessons\\Videos"\n', "Define output directory (absoulte o relative path)")
.example('node $0 -u CODICEPERSONA -e EMAIL -v "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/play/..." -k\n', "Do not save the password into system keyring")
.argv;

console.info('\nVideo URLs: %s', argv.videoUrls);
console.info('Username: %s', argv.username);
console.info('Email: %s', argv.email);
//console.info('Password: %s', argv.password);
console.info('Output Directory: %s\n', argv.outputDirectory);


function sanityChecks() {
    try {
        const aria2Ver = execSync('aria2c --version').toString().split('\n')[0];
        term.green(`Using ${aria2Ver}\n`);
    }
    catch (e) {
        term.red('You need aria2c in $PATH for this to work. Make sure it is a relatively recent one.');
        process.exit(22);
    }
    try {
        const ffmpegVer = execSync('ffmpeg -version').toString().split('\n')[0];
        term.green(`Using ${ffmpegVer}\n\n`);
    }
    catch (e) {
        term.red('FFmpeg is missing. You need a fairly recent release of FFmpeg in $PATH.');
        process.exit(23);
    }
    if (!fs.existsSync(argv.outputDirectory)) {
        if (path.isAbsolute(argv.outputDirectory) || argv.outputDirectory[0] == '~') console.log('Creating output directory: ' + argv.outputDirectory);
        else console.log('Creating output directory: ' + process.cwd() + path.sep + argv.outputDirectory);
        try {
            fs.mkdirSync(argv.outputDirectory, { recursive: true }); // use native API for nested directory. No recursive function needed, but compatible only with node v10 or later
        } catch (e) {
            term.red("Can not create nested directories. Node v10 or later is required\n");
            process.exit();
        }
    }

}
async function downloadVideo(videoUrls, usernameEmail, username, password, outputDirectory) {

    // handle password
    const keytar = require('keytar');
    //keytar.deletePassword('WebexDown', username);
    if (password === null) { // password not passed as argument
        var password = {};
        if (argv.noKeyring === false) {
            try {
                await keytar.getPassword("WebexDown", username).then(function (result) { password = result; });
                if (password === null) { // no previous password saved
                    password = await promptQuestion("Password not saved. Please enter your password, PoliDown will not ask for it next time: ");
                    await keytar.setPassword("WebexDown", username, password);
                } else {
                    console.log("Reusing password saved in system's keychain!")
                }
            }
            catch (e) {
                console.log("X11 is not installed on this system. WebexDown can't use keytar to save the password.")
                password = await promptQuestion("No problem, please manually enter your password: ");
            }
        } else {
            password = await promptQuestion("Please enter your password: ");
        }
    } else {
        if (argv.noKeyring === false) {
            try {
                await keytar.setPassword("WebexDown", username, password);
                console.log("Your password has been saved. Next time, you can avoid entering it!");
            } catch (e) {
                // X11 is missing. Can't use keytar
            }
        }
    }
    console.log('\nLaunching Chromium to perform the OpenID Connect dance...');
    console.log('This program will control the window, You don\'t need to do anything');

    const browser = await puppeteer.launch({
        // If headless Cisco js refuses to load the player.. I hate client-side rendering
        headless: false,
        executablePath: find.fileSync('chrome.exe', 'node_modules\\chromium-all-codecs-bin\\.local-chromium-all-codecs')[0],    // Again, without codecs the page js won't load the player
        defaultViewport: {
            width: 1280,
            height: 720
        },
        args: ['--disable-dev-shm-usage', '--lang=it-IT']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36');
    var firstTime = true;

    for (let videoUrl of videoUrls) {
        if (firstTime) {
            firstTime = false;
            console.log('Navigating to login page...');
            await page.goto(videoUrl, { waitUntil: 'networkidle2' });
            await page.waitForSelector('input[type="email"]');
            //    const usernameEmail = username + "@mail.polimi.it";
            await page.keyboard.type(usernameEmail);
            await page.click('button[type="button"]');

            console.log('Filling in Servizi Online login form...');
            await page.waitForSelector('input[id="login"]');
            await page.type('input#login', username) // mette il codice persona
            await page.type('input#password', password) // mette la password

            await page.click('button[name="evn_conferma"]') // clicca sul tasto "Accedi"

            try {
                var response = await page.waitForResponse(response => response.url().includes('m3u8'))
            } catch (error) {
                try {
                    await page.waitForSelector('button[name="evn_continua"]', { timeout: 1000 }); // password is expiring
                    await page.click('button[name="evn_continua"]');
                } catch (error) {
                    // password is not expiring
                    await page.waitForSelector('div[class="Message ErrorMessage"]', { timeout: 1000 });
                    term.red('Bad credentials');
                    process.exit(401);
                }
            }
            console.log('We are logged in. ');
        }
        else {
            if(videoUrl.includes('recording/') && !videoUrl.includes('recording/play')){
                console.log('Fixing video link...');        // url can be /recording/..., /recording/play/..., /recording/playback/... but the first version doesn't seem to work
                videoUrl = videoUrl.replace('recording/', 'recording/playback/')
            }
            var error = false;
            do{
                try{
                    await page.goto(videoUrl);
                    console.log('Waiting for playlist..');
                    var response = await page.waitForResponse(response => response.url().includes('m3u8'), { timeout: 10000 })
                    error = false;
                } catch(error){
                    if(page.url().includes('error')){
                        console.log('Uh oh!')
                        error = true;
                        await sleep(3000);
                    }
                    else process.exit(404);
                }
            }while(error == true);
        }


        var playlistUrl = response.url();
        // console.debug(playlistUrl);
        var playlist = await response.text();

        await sleep(3000)

        const cookie = await extractCookies(page);

        console.log('Got required authentication cookies.');

        term.green(`\nStart downloading video: ${videoUrl}\n`);

        var videoID = videoUrl.substring(videoUrl.lastIndexOf("/") + 1, videoUrl.length) // use the video id as temp dir name
        var full_tmp_dir = path.join(argv.outputDirectory, videoID);

        // creates tmp dir
        if (!fs.existsSync(full_tmp_dir)) {
            fs.mkdirSync(full_tmp_dir);
        } else {
            rmDir(full_tmp_dir);
            fs.mkdirSync(full_tmp_dir);
        }

        var titleSpan = await page.waitForSelector('span[class="recordingTitle"]');
        var titleSpan = await titleSpan.getProperty('innerText');
        var title = await titleSpan.jsonValue();
        console.log(`\nVideo title is: ${title}`);
        title = title.replace(/[/\\?%*:;|"<>]/g, '-'); // remove illegal characters

        // creates two m3u8 files:
        // - video_full.m3u8: to download all segements (replacing realtive segements path with absolute remote url)
        // - video_tmp.m3u8: used by ffmpeg to merge all downloaded segements (in this one we replace the remote key URI with the absoulte local path of the key downloaded above)
        var baseUri = playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1);
        var video_full = playlist.replace(new RegExp('merge', 'g'), baseUri + 'merge'); // local path to full remote url path
        var video_tmp = playlist.replace(new RegExp('merge', 'g'), 'video_segments/merge');
        const video_full_path = path.join(full_tmp_dir, 'video_full.m3u8');
        const video_tmp_path = path.join(full_tmp_dir, 'video_tmp.m3u8');
        fs.writeFileSync(video_full_path, video_full);
        fs.writeFileSync(video_tmp_path, video_tmp);

        // download async. I'm Speed, however less Speed than Polidown since Microsoft can afford better servers. Ouch!
        var aria2cCmd = 'aria2c -i "' + video_full_path + '" -j 5 -x 5 -d "' + path.join(full_tmp_dir, 'video_segments') + '" --header="Cookie:' + cookie + '"';
        var result = execSync(aria2cCmd, { stdio: 'inherit' });

        // *** MERGE ts segements in an mp4 file ***
        if (fs.existsSync(path.join(outputDirectory, title + '.mp4'))) {
            title = title + '-' + Date.now('nano');
        }

        // stupid Windows. Need to find a better way
        var ffmpegCmd = '';
        var ffmpegOpts = { stdio: 'inherit' };
        if (process.platform === 'win32') {
            ffmpegOpts['cwd'] = full_tmp_dir; // change working directory on windows, otherwise ffmpeg doesn't find the segements (relative paths problem, again, stupid windows. Or stupid me?)
            var outputFullPath = '';
            if (path.isAbsolute(outputDirectory) || outputDirectory[0] == '~')
                outputFullPath = path.join(outputDirectory, title);
            else
                outputFullPath = path.join('..', '..', outputDirectory, title);
            var ffmpegCmd = 'ffmpeg -i video_tmp.m3u8 -async 1 -c copy -bsf:a aac_adtstoasc -n -async 1 -c copy -bsf:a aac_adtstoasc -n "' + outputFullPath + '.mp4"';
        } else {
            var ffmpegCmd = 'ffmpeg -i video_tmp.m3u8 -async 1 -c copy -bsf:a aac_adtstoasc -n -async 1 -c copy -bsf:a aac_adtstoasc -n "' + path.join(outputDirectory, title) + '.mp4"';
        }

        var result = execSync(ffmpegCmd, ffmpegOpts);

        // remove tmp dir
        rmDir(full_tmp_dir);

    }

    console.log("\nAt this point Chrome's job is done, shutting it down...");
    await browser.close();
    term.green(`Done!\n`);

}


function promptQuestion(question) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(function (resolve, reject) {
        var ask = function () {
            rl.question(question, function (answer) {
                resolve(answer, reject);
                rl.close();
            });
        };
        ask();
    });
}


function rmDir(dir, rmSelf) {
    var files;
    rmSelf = (rmSelf === undefined) ? true : rmSelf;
    dir = dir + "/";
    try { files = fs.readdirSync(dir); } catch (e) { console.log("!Oops, directory not exist."); return; }
    if (files.length > 0) {
        files.forEach(function (x, i) {
            if (fs.statSync(dir + x).isDirectory()) {
                rmDir(dir + x);
            } else {
                fs.unlinkSync(dir + x);
            }
        });
    }
    if (rmSelf) {
        // check if user want to delete the directory or just the files in this directory
        fs.rmdirSync(dir);
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractCookies(page) {
    var jar = await page.cookies("https://.webex.com");
    if (jar == null || jar.length == 0) {
        await sleep(5000);
        var jar = await page.cookies("https://.webex.com");
    }
    if (jar == null || jar.length == 0) {
        console.error('Unable to read cookies. Try launching one more time, this is not an exact science.');
        process.exit(88);
    }

    return (jar.map(c => `${c.name}=${c.value}`)).join('; ');
}

async function run() {
    if (typeof argv.password === 'undefined') downloadVideo(argv.videoUrls, argv.email, argv.username, null, argv.outputDirectory);
    else downloadVideo(argv.videoUrls, argv.email, argv.username, argv.password, argv.outputDirectory);
}


term.brightBlue(`Project derived from https://github.com/sup3rgiu/PoliDown\nPorted to Cisco Webex by @SimoDax\n\n`);
sanityChecks();

run();
