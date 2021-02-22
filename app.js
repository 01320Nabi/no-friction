const uuid = require("uuid")
let express = require("express")
let app = express()
const host = require("ip").address("public", "ipv4")
const port = process.env.PORT || 8080
require("./router/router")(app)

app.set("views", __dirname + "/views")
app.set("view engine", "ejs")
app.engine("html", require("ejs").renderFile)

app.use(express.static("public"))

let server = app.listen(port, () => console.log(`Server listening at ${host}:${port}`))

let WebSocket = require("ws")

let wss = new WebSocket.Server({server}, () => console.log(`WebSocket listening at ${host}:${wsPort}`))

let sessions = {}

wss.on("connection", ws => {
    ws.id = uuid.v4()
    ws.send(JSON.stringify({
        type: "reg",
        uuid: ws.id,
        value: sessions
    }))
    console.log(`${ws.id} joined.`)
    ws.on("message", data => {
        let message = JSON.parse(data)
        switch(message.type) {
            case "key":
                sessions[ws.id].keys[message.key] = message.value
                wss.clients.forEach(client => {
                    client.send(JSON.stringify({
                        type: "key",
                        uuid: ws.id,
                        key: message.key,
                        value: message.value,
                    }))
                })
                break
            case "update":
                sessions[ws.id] = message.value
                wss.clients.forEach(client => {
                    client.send(JSON.stringify({
                        type: "update",
                        uuid: ws.id,
                        value: message.value,
                    }))
                })
                break
        }
    })
    ws.on("close", () => {
        delete sessions[ws.id]
        wss.clients.forEach(client => {
            client.send(JSON.stringify({
                type: "close",
                uuid: ws.id,
            }))
        })
        console.log(`${ws.id} exited.`)
    })
})