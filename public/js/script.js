"use strict"

let canvas = document.getElementById("nofriction")
let ws = new WebSocket(wsUri)

window.onresize = function() {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
}
window.onload = function() {
    window.onresize()
    timer = new Date().getTime()
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
    }
    update() {
        this.position = this.position.add(this.velocity)
        this.velocity = this.velocity.add(this.accelaration)
        this.accelaration = new Vector(0, -3).scale(timeDelta)
        if(this.position.x < -1000) {
            this.position.x = -1000
            this.velocity.x = Math.max(this.velocity.x, 0)
        }
        if(this.position.x > 1000) {
            this.position.x = 1000
            this.velocity.x = Math.min(this.velocity.x, 0)
        }
        jumpable = false
        let A = {min: this.position.add(new Vector(-25, 0)), max: this.position.add(new Vector(25, 50))}
        let p = this
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
                        p.velocity.y = Math.min(p.velocity.y, 0)
                    }
                    else {
                        normal = new Vector(0, 1)
                        p.velocity.y = Math.max(p.velocity.y, 0)
                        jumpable = true
                    }
                    p.position = p.position.add(normal.scale(overlap.y))
                }
                else {
                    if(n.x > 0) {
                        normal = new Vector(-1, 0)
                        p.velocity.x = Math.min(p.velocity.x, 0)
                    }
                    else {
                        normal = new Vector(1, 0)
                        p.velocity.x = Math.max(p.velocity.x, 0)
                    }
                    p.position = p.position.add(normal.scale(overlap.x))
                }
            }
        })
        if(keys["ArrowRight"]) {
            this.accelaration = this.accelaration.add(new Vector(5, 0).scale(timeDelta))
        }
        if(keys["ArrowLeft"]) {
            this.accelaration = this.accelaration.add(new Vector(-5, 0).scale(timeDelta))
        }
        if(keys["ArrowUp"] && jumpable) {
            this.accelaration = this.accelaration.add(new Vector(0, -this.velocity.y)).add(new Vector(0, 5))
        }
    }
}

ws.addEventListener("message", e => {
    //
})

let player = new Player(new Vector(0, 50))

let multis = {}

let jumpable = false

let keys = {}
window.onkeydown = function(e) {
    keys[e.code] = true
}
window.onkeyup = function(e) {
    keys[e.code] = false
}

let timer = 0
let timeDelta = 0

let blocks = [
    {min: new Vector(-1025, -50), max: new Vector(1025, 0)},
    {min: new Vector(300, 500), max: new Vector(600, 550)},
]

function loop() {
    requestAnimationFrame(loop)
    timeDelta = (new Date().getTime() - timer) / 1000
    timer = new Date().getTime()
    player.update()
    multis.forEach(multi => multi.update())
    let context = canvas.getContext("2d")
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.scale(1, -1)
    context.translate(canvas.width/2 + player.position.x/1000*(canvas.width/2-1025), -canvas.height)
    if(player.position.y > canvas.height/2) {
        context.translate(0, -player.position.y + canvas.height/2)
    }
    context.fillRect(player.position.x - 25, player.position.y, 50, 50)
    blocks.filter(block => Math.max(Math.abs(block.min.y - player.position.y), Math.abs(block.max.y - player.position.y)) < canvas.height).forEach(block => {
        context.fillRect(block.min.x, block.min.y, block.max.x - block.min.x, block.max.y - block.min.y)
    })
    context.restore()
}