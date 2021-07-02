const { ipcRenderer, contextBridge } = require("electron")

contextBridge.exposeInMainWorld("electron", {
    sendId: (id) => ipcRenderer.send("myid", id),
    getIsNotificationActive: () => ipcRenderer.invoke("getIsNotification"),
    setIsNotificationActive: (not) => ipcRenderer.invoke("setIsNotification", not),
    getIsOpenLnk: () => ipcRenderer.invoke("getIsOpenLnk"),
    setIsOpenLnk: (arg) => ipcRenderer.invoke("setIsOpenLnk", arg),
    openURL: (arg) => ipcRenderer.send("openURL", arg) 
})

window.addEventListener("DOMContentLoaded", () => {
    console.log("domContentLoaded");
    const closeB = document.getElementById("cloButton");
    const minB = document.getElementById("minButton");

    console.log("closeB", closeB);
    console.log("minB", minB);

    closeB.addEventListener("click" , () => {
        console.log("close");
        ipcRenderer.send("close");
    })

    minB.addEventListener("click", () => {
        console.log("Minimize");
        ipcRenderer.send("minimize");
    })
})