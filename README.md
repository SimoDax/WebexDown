# WebexDown

## Saves Webex recordings uploaded by Politecnico di Milano.

This project is a port of https://github.com/sup3rgiu/PoliDown from MS Stream to Webex



## PREREQS

* [**Node.js**](https://nodejs.org/it/download/): anything above v8.0 seems to work.
* [**aria2**](https://github.com/aria2/aria2/releases): this needs to be in your `$PATH` (for example, copy aria2c.exe to c:\windows). WebexDown calls `aria2c` with a bunch of arguments in order to improve the download speed.
* [**ffmpeg**](https://www.ffmpeg.org/download.html): a recent version (year 2019 or above), in [`$PATH`](https://www.thewindowsclub.com/how-to-install-ffmpeg-on-windows-10). On Windows, the [nightly build](https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-20200309-608b8a8-win64-static.zip) is recommended.


## USAGE

* Clone this repo
* `cd` into the cloned folder
* `npm install` to install dependencies

Default usage:
```
$ node webexdown.js --username CODICEPERSONA --email POLIMI_EMAIL --videoUrls "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/playback/VIDEO-1"

$ node webexdown.js -u CODICEPERSONA --e POLIMI_EMAIL -v "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/playback/VIDEO-1"
```

Show options:
```
$ node webexdown.js -h

Options:
  --version              Show version number                           [boolean]
  -v, --videoUrls                                             [array] [required]
  -u, --username         Codice Persona PoliMi               [string] [required]
  -e, --email            Indirizzo email PoliMi              [string] [required]
  -p, --password                                                        [string]
  -o, --outputDirectory                             [string] [default: "videos"]
  -k, --noKeyring        Do not use system keyring    [boolean] [default: false]
  -h, --help             Show help                                     [boolean]
```

Multiple videos download:
```
$ node webexdown.js -u CODICEPERSONA -e EMAIL
    -v "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/playback/VIDEO-1"
                "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/playback/VIDEO-2"
                "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/playback/VIDEO-3"
```

Output directory (relative or absoulte path):
```
$ node webexdown.js -u CODICEPERSONA -e EMAIL -v "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/playback/VIDEO-1" -o "/my/path/here"
```

Do not use system keyring to save the password:
```
$ node webexdown.js -u CODICEPERSONA -e EMAIL -v "https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/playback/VIDEO-1" -k
```


You can omit the password argument. WebexDown will ask for it interactively and then save it securely in system's keychain for the next use.

## EXPECTED OUTPUT

```
Project derived from https://github.com/sup3rgiu/PoliDown
Ported to Cisco Webex by @simo_dax

Using aria2 version 1.35.0
Using ffmpeg version git-2020-03-09-608b8a8 Copyright (c) 2000-2020 the FFmpeg developers


Launching headless Chrome to perform the OpenID Connect dance...
Navigating to login page...
Filling in Servizi Online login form...
We are logged in.
Got required authentication cookies.

Start downloading video: https://politecnicomilano.webex.com/recordingservice/sites/politecnicomilano/recording/playback/VIDEO-X


[...]

At this point Chrome's job is done, shutting it down...
Done!
```

The video is now saved under `videos/`, or whatever the `outputDirectory` argument points to.
