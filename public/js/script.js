"use strict"

let canvas = document.getElementById("nofriction")
let ws = new WebSocket(wsUri)

window.onresize = function() {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
}
window.onload = function() {
    window.onresize()
    requestAnimationFrame(loop)
}

class Vector {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
    get inverted() {
        return new Vector(-this.x, -this.y)
    }
    add(vector) {
        return new Vector(this.x + vector.x, this.y + vector.y)
    }
    minus(vector) {
        return this.add(vector.inverted)
    }
    get magnitude() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2))
    }
    scale(scalar) {
        return new Vector(this.x * scalar, this.y * scalar)
    }
    get normalized() {
        return this.scale(1/this.magnitude)
    }
}

class Player {
    constructor(position) {
        this.position = position || new Vector(0, 0)
        this.velocity = new Vector(0, 0)
        this.accelaration = new Vector(0, 0)
        this.keys = {}
    }
    static update(inst) {
        inst.position = inst.position.add(inst.velocity)
        inst.velocity = inst.velocity.add(inst.accelaration)
        inst.accelaration = new Vector(0, -3).scale(0.01)
        if(inst.position.x < -1000) {
            inst.position.x = -1000
            inst.velocity.x = -inst.velocity.x
        }
        if(inst.position.x > 1000) {
            inst.position.x = 1000
            inst.velocity.x = -inst.velocity.x
        }
        let controlable = false
        let A = {min: inst.position.add(new Vector(-25, 0)), max: inst.position.add(new Vector(25, 50))}
        blocks.forEach(B => {
            let n = B.min.add(B.max).scale(0.5).minus(A.min.add(A.max).scale(0.5))
            let aex = A.max.minus(A.min).scale(0.5)
            let bex = B.max.minus(B.min).scale(0.5)
            let overlap = aex.add(bex).minus(new Vector(Math.abs(n.x), Math.abs(n.y)))
            let normal = new Vector(0, 0)
            if(overlap.x > 0 && overlap.y > 0) {
                if(overlap.x > overlap.y) {
                    if(n.y > 0) {
                        normal = new Vector(0, -1)
                        inst.velocity.y = Math.min(inst.velocity.y, 0)
                    }
                    else {
                        normal = new Vector(0, 1)
                        inst.velocity.y = Math.max(inst.velocity.y, 0)
                        controlable = true
                    }
                    inst.position = inst.position.add(normal.scale(overlap.y))
                }
                else {
                    if(n.x > 0) {
                        normal = new Vector(-1, 0)
                        inst.velocity.x = Math.min(inst.velocity.x, 0)
                    }
                    else {
                        normal = new Vector(1, 0)
                        inst.velocity.x = Math.max(inst.velocity.x, 0)
                    }
                    inst.position = inst.position.add(normal.scale(overlap.x))
                }
            }
        })
        if(controlable) {
            if(inst.keys["ArrowRight"]) {
                inst.accelaration = inst.accelaration.add(new Vector(5, 0).scale(0.01))
            }
            if(inst.keys["ArrowLeft"]) {
                inst.accelaration = inst.accelaration.add(new Vector(-5, 0).scale(0.01))
            }
            if(inst.keys["ArrowUp"]) {
                inst.accelaration = inst.accelaration.add(new Vector(0, -inst.velocity.y)).add(new Vector(0, 6.1))
            }
        }
    }
}

ws.addEventListener("open", () => {
    setInterval(() => {
        Player.update(player)
        for(let key in sessions) {
            Player.update(sessions[key])
        }
        if(uuid) {
            ws.send(JSON.stringify({
                type: "update",
                value: player,
            }))
        }
    }, 10)
})

let uuid = ""
ws.addEventListener("message", e => {
    let data = JSON.parse(e.data)
    switch(data.type) {
        case "reg":
            uuid = data.uuid
            sessions = data.value
            for(let key in sessions) {
                sessions[key].position = new Vector(sessions[key].position.x, sessions[key].position.y)
                sessions[key].velocity = new Vector(sessions[key].velocity.x, sessions[key].velocity.y)
                sessions[key].accelaration = new Vector(sessions[key].accelaration.x, sessions[key].accelaration.y)
            }
            delete sessions[uuid]
            break
        case "key":
            if(data.uuid != uuid) {
                sessions[data.uuid].keys[data.key] = data.value
            }
            break
        case "update":
            if(data.uuid != uuid) {
                sessions[data.uuid] = data.value
                sessions[data.uuid].position = new Vector(sessions[data.uuid].position.x, sessions[data.uuid].position.y)
                sessions[data.uuid].velocity = new Vector(sessions[data.uuid].velocity.x, sessions[data.uuid].velocity.y)
                sessions[data.uuid].accelaration = new Vector(sessions[data.uuid].accelaration.x, sessions[data.uuid].accelaration.y)
            }
            break
        case "close":
            delete sessions[data.uuid]
            break
    }
})

let player = new Player(new Vector(0, 50))

let sessions = {}

window.onkeydown = function(e) {
    player.keys[e.code] = true
    if(uuid) {
        ws.send(JSON.stringify({
            type: "key",
            key: e.code,
            value: true,
        }))
    }
}
window.onkeyup = function(e) {
    player.keys[e.code] = false
    if(uuid) {
        ws.send(JSON.stringify({
            type: "key",
            key: e.code,
            value: false,
        }))
    }
}

let blocks = [
    {min: new Vector(-1025, -50), max: new Vector(1025, 0)},
    {min: new Vector(300, 500), max: new Vector(600, 550)},
    {min: new Vector(-700, 600), max: new Vector(-400, 650)},
]

function loop() {
    requestAnimationFrame(loop)
    let context = canvas.getContext("2d")
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.scale(1, -1)
    context.translate(canvas.width/2 + player.position.x/1000*(canvas.width/2-1025), -canvas.height)
    if(player.position.y > canvas.height/2) {
        context.translate(0, -player.position.y + canvas.height/2)
    }
    context.fillStyle = "red"
    for(let key in sessions) {
        context.fillRect(sessions[key].position.x - 25, sessions[key].position.y, 50, 50)
    }
    context.fillStyle = "blue"
    blocks.filter(block => Math.max(Math.abs(block.min.y - player.position.y), Math.abs(block.max.y - player.position.y)) < canvas.height).forEach(block => {
        context.fillRect(block.min.x, block.min.y, block.max.x - block.min.x, block.max.y - block.min.y)
    })
    context.fillStyle = "black"
    context.fillRect(player.position.x - 25, player.position.y, 50, 50)
    context.restore()
}