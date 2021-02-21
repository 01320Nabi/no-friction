let express = require("express")
let app = express()
const host = require("ip").address("public", "ipv4")
const port = 8080
require("./router/router")(app, host)

app.set("views", __dirname + "/views")
app.set("view engine", "ejs")
app.engine("html", require("ejs").renderFile)

app.use(express.static("public"))


let server = app.listen(port, () => console.log(`Server listening at ${host}:${port}`))