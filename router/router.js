module.exports = (app, host) => {
    app.get('/', (req, res) => {
        res.render("index.html", {
            ip: host
        })
    })
}