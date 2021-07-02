const { app, BrowserWindow, BrowserView, nativeImage, Tray, Menu, Notification, ipcMain, shell } = require("electron")
const Path = require("path")
const WebSocket = require("ws");

let tray = null;

let win = null
let wsc;
let openOnStartup = true;

//TEST-CONFIG

const fs = require("fs");

let mainConfig = {};

async function getConfig() {

    return new Promise((resolve, reject) => {
        fs.readFile("config.json", (err, data) => {
            if (err) reject(err);

            try {
                let config = JSON.parse(data);
                resolve(config)
            } catch(err) {
                reject(err)
            }
        })
    })
}

async function saveConfig() {
    return new Promise((resolve, reject) => {
        let jsonConfig = JSON.stringify(mainConfig);
        fs.writeFile("config.json", jsonConfig, "utf-8", (err) => {
            if (err) reject(err);
            resolve();
        });
    });
}

getConfig().then((conf) => {
    mainConfig = conf;
}).catch((err) => {
    mainConfig = {isNotificationActive: true, isOpenLnk: true}
})


//END-TEST

function createNotification(content) {
    const not = new Notification({title: "Mssn!", body:content.message});

    if (content.type === "url") {
        not.on("click", () => {
            shell.openExternal(content.message);
        });
    } else {
        not.on("click", () => {
            if (win !== null) win.show();
        })
    }

    not.show();
}

function createWsConnection(id) {
    wsc = new WebSocket("wss://mssnapplications.com/ws");

    wsc.on("error", () => {
        console.error("error");
    })

    wsc.on("unexpected-response", () => {
        console.error("Unexpected response");
    })

    wsc.on("message", (data) => {
    
        let msg = JSON.parse(data);
        const focusedWindow = BrowserWindow.getFocusedWindow();

        let endMessage = JSON.parse(msg.endMessage);

        if (focusedWindow !== null) return;

        if ("isNotificationActive" in mainConfig) {
            if (mainConfig.isNotificationActive) createNotification(endMessage);
        } else {

            getConfig().then((conf) => {
                if ("isNotificationActive" in conf && conf.isNotificationActive) createNotification(endMessage);
            }).catch();

        }

    });
    wsc.on("open", () => {
        console.log("wsOpen");
        if (wsc.readyState === WebSocket.OPEN) {
            msg = JSON.stringify({code: "init", message: "welcome", id});
            wsc.send(msg);
        }
        
        
    })
    wsc.on("close", () => {  
        console.log("wsClose");
        createWsConnection(id);
    })
}

ipcMain.on("myid", (event, id) => {
    createWsConnection(id);
});
ipcMain.on("minimize", (event) => {
    if (win !== null) win.minimize();
});
ipcMain.on("close", (event) => {
    if (win !== null) win.close();
});
ipcMain.on("openURL", (event, url) => {
    shell.openExternal(url);
})

ipcMain.handle("setIsNotification", async (event, arg) => {
    mainConfig.isNotificationActive = arg;
    saveConfig().catch(() => console.error("Error saving config file"));
    return mainConfig.isNotificationActive;
})

ipcMain.handle("getIsNotification", async () => {
    if (mainConfig === undefined) {
        mainConfig = await getConfig();
    } 
    return ("isNotificationActive" in mainConfig) ? mainConfig.isNotificationActive : true;
})

ipcMain.handle("setIsOpenLnk", async (event, arg) => {
    mainConfig.isOpenLnk = arg;
    app.setLoginItemSettings({
        openAtLogin: arg
    });
    saveConfig().catch();
    return mainConfig.isOpenLnk;
})

ipcMain.handle("getIsOpenLnk", async (event, arg) => {
    if (mainConfig === undefined) {
        mainConfig = await getConfig();
    }
    return ("isOpenLnk" in mainConfig) ? mainConfig.isOpenLnk : false;
})



function createWindow() {
    win = new BrowserWindow({
        width: 450,
        height: 600,
        webPreferences: {
            preload: Path.join(__dirname, "test.js")
        },
        show: false,
        frame: false,
        resizable: false,
        maximizable: false,
        backgroundColor: "#ffffff",
        icon: "lkn-simple.ico"
    })

    win.on("close", (e) => {
        e.preventDefault()
        win.hide()
    })

    win.loadFile("index.html");

    const view = new BrowserView({
        webPreferences: {
            preload: Path.join(__dirname, "test.js")
        }
    });
    win.setBrowserView(view);
    view.setBounds({x: 0, y: 20, width: 450, height: 580});
    view.webContents.loadURL("https://mssnapplications.com/lnk");
    view.webContents.once("did-finish-load", () => {
        win.show();
    })

    
}

app.whenReady().then(() => {
    console.log("init")
    createWindow()

    const iconLocation = Path.join(__dirname, "lkn-simple.ico");

    tray = new Tray(iconLocation);
    const contextMenu = Menu.buildFromTemplate([
        {label: "Quit", click: () => {win.destroy()}}
    ])
    tray.setToolTip('Lnk - URL Manager')
    tray.setContextMenu(contextMenu)
    tray.on("click", () => {
        win.show()
    })
})

app.on("window-all-closed", (e) => {
    if (process.platform !== "darwin") app.quit();
})

async function getOpenLnk() {
    if (mainConfig === null) {
        mainConfig = await getConfig();
    }
    return ("isOpenLnk" in mainConfig) ? mainConfig.isOpenLnk : false;
}

getOpenLnk().then((b) => {
    app.setLoginItemSettings({
        openAtLogin: b
    })
}).catch();

